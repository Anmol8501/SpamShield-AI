import os
import sys
import time
import re
import logging
import sqlite3
import datetime
import io
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np
import joblib
import easyocr

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Enable CORS
CORS(app)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "model", "model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "..", "model", "vectorizer.pkl")
DATABASE_PATH = os.path.join(BASE_DIR, "predictions.db")

model = None
vectorizer = None
class_mapping = {}
ocr_reader = None

def init_db():
    """Create the predictions database and predictions table if not exists."""
    logger.info(f"Initializing database at {DATABASE_PATH}...")
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            prediction TEXT NOT NULL,
            confidence REAL NOT NULL,
            timestamp TEXT NOT NULL,
            source TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()
    logger.info("Database initialized successfully.")

def get_db_connection():
    """Retrieve thread-safe connection to predictions database."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def load_resources():
    global model, vectorizer, class_mapping, ocr_reader
    try:
        logger.info(f"Loading classifier model from {MODEL_PATH}...")
        model = joblib.load(MODEL_PATH)
        
        logger.info(f"Loading vectorizer from {VECTORIZER_PATH}...")
        vectorizer = joblib.load(VECTORIZER_PATH)
        
        # Check model classes
        if hasattr(model, "classes_"):
            classes = list(model.classes_)
            for c in classes:
                str_val = str(c).lower().strip()
                if str_val in ("1", "spam"):
                    class_mapping[c] = "Spam"
                elif str_val in ("0", "ham"):
                    class_mapping[c] = "Ham"
                else:
                    class_mapping[c] = str(c).title()
            logger.info(f"Class mapping: {class_mapping}")
        else:
            class_mapping = {0: "Ham", 1: "Spam"}
            
        logger.info("Loading EasyOCR Reader model...")
        # Load English reader
        ocr_reader = easyocr.Reader(['en'])
        logger.info("EasyOCR Reader loaded successfully.")
        
    except Exception as e:
        logger.error(f"Error loading backend resources: {str(e)}")
        sys.exit(1)

# Initialize
init_db()
load_resources()

def sanitize_text(text):
    if not text:
        return ""
    # Strip HTML tags
    cleaned = re.sub(r"<[^>]*>", "", text)
    return cleaned.strip()

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200

@app.route("/ocr", methods=["POST"])
def run_ocr():
    """Process uploaded screenshot/image to extract text."""
    if not ocr_reader:
        return jsonify({"error": "OCR engine not initialized."}), 500
        
    if "image" not in request.files:
        return jsonify({"error": "No image file provided in multipart 'image' parameter."}), 400
        
    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Selected file is empty."}), 400
        
    # Check format extension
    allowed = {"png", "jpg", "jpeg", "webp"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in allowed:
        return jsonify({"error": f"Unsupported file type. Allowed: {', '.join(allowed)}"}), 400

    try:
        start_time = time.time()
        
        # Read image bytes and open using PIL
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image_np = np.array(image)
        
        # Run EasyOCR
        # readtext returns: [([x, y, w, h], text, confidence), ...]
        results = ocr_reader.readtext(image_np)
        
        extracted_text = " ".join([r[1] for r in results]).strip()
        
        # Compute avg confidence
        confidences = [r[2] for r in results]
        avg_conf = (float(np.mean(confidences)) * 100.0) if confidences else 100.0
        
        processing_time = time.time() - start_time
        
        logger.info(f"OCR scan processed in {processing_time:.2f}s with confidence: {avg_conf:.1f}%")
        
        return jsonify({
            "success": True,
            "extracted_text": extracted_text,
            "confidence": round(avg_conf, 1),
            "processing_time": f"{processing_time:.2f}s",
            "char_count": len(extracted_text)
        }), 200
        
    except Exception as e:
        logger.error(f"Error executing OCR: {str(e)}")
        return jsonify({"error": f"OCR processing failed: {str(e)}"}), 500

@app.route("/predict", methods=["POST"])
def predict():
    """Analyze SMS string for spam status and commit logs directly to predictions.db."""
    start_time = time.time()
    if not model or not vectorizer:
        return jsonify({"error": "Model or vectorizer resources not active."}), 500
        
    try:
        data = request.get_json(silent=True) or {}
        message = data.get("message", "")
        source = data.get("source", "manual")  # 'manual' or 'ocr'
        
        if not isinstance(message, str):
            return jsonify({"error": "Message parameter must be a string."}), 400
            
        sanitized_message = sanitize_text(message)
        sanitized_message = sanitized_message[:500]  # limit payload
        
        if not sanitized_message.strip():
            return jsonify({"error": "Sanitized SMS text is empty."}), 400
            
        # Transform and Predict
        transformed = vectorizer.transform([sanitized_message])
        pred = model.predict(transformed)[0]
        proba = model.predict_proba(transformed)[0]
        
        # Extract confidence
        classes = list(model.classes_)
        pred_idx = classes.index(pred)
        confidence = float(proba[pred_idx]) * 100.0
        
        prediction_label = class_mapping.get(pred, "Ham" if pred == 0 else "Spam")
        
        # Risk thresholds
        if prediction_label == "Spam":
            risk_level = "High" if confidence >= 80.0 else "Medium"
        else:
            risk_level = "Low" if confidence >= 80.0 else "Medium"
            
        processing_time = time.time() - start_time
        time_str = f"{processing_time:.4f}s"
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Write to SQLite predictions database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO predictions (message, prediction, confidence, timestamp, source) VALUES (?, ?, ?, ?, ?)",
            (sanitized_message, prediction_label, round(confidence, 2), timestamp, source)
        )
        conn.commit()
        conn.close()
        
        logger.info(f"Saved prediction: {prediction_label} | Source: {source} | Timestamp: {timestamp}")
        
        return jsonify({
            "prediction": prediction_label,
            "confidence": round(confidence, 2),
            "risk": risk_level,
            "processing_time": time_str,
            "timestamp": timestamp
        }), 200
        
    except Exception as e:
        logger.error(f"Error making prediction: {str(e)}")
        return jsonify({"error": f"Classification failed: {str(e)}"}), 500

@app.route("/history", methods=["GET"])
def get_history():
    """Fetch history list from sqlite database predictions table."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM predictions ORDER BY id DESC")
        rows = cursor.fetchall()
        conn.close()
        
        history_list = []
        for r in rows:
            history_list.append({
                "id": r["id"],
                "message": r["message"],
                "prediction": r["prediction"],
                "confidence": r["confidence"],
                "timestamp": r["timestamp"],
                "source": r["source"]
            })
        return jsonify(history_list), 200
    except Exception as e:
        logger.error(f"Failed to query database logs: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/history/<int:pred_id>", methods=["DELETE"])
def delete_record(pred_id):
    """Delete a specific log entry from the database."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM predictions WHERE id = ?", (pred_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/history", methods=["DELETE"])
def clear_history():
    """Delete all records from predictions table."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM predictions")
        conn.commit()
        conn.close()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/analytics", methods=["GET"])
def get_analytics():
    """Compute statistics from real SQLite database entries."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Total count
        cursor.execute("SELECT count(*) FROM predictions")
        total_predictions = cursor.fetchone()[0] or 0
        
        # 2. Spam count
        cursor.execute("SELECT count(*) FROM predictions WHERE prediction = 'Spam'")
        spam_predictions = cursor.fetchone()[0] or 0
        
        # 3. Safe count
        cursor.execute("SELECT count(*) FROM predictions WHERE prediction = 'Ham'")
        safe_predictions = cursor.fetchone()[0] or 0
        
        # 4. Average confidence
        cursor.execute("SELECT avg(confidence) FROM predictions")
        avg_confidence = cursor.fetchone()[0]
        avg_confidence = round(avg_confidence, 1) if avg_confidence is not None else 0
        
        # 5. Percentages
        spam_percentage = round((spam_predictions / total_predictions) * 100, 1) if total_predictions > 0 else 0
        safe_percentage = round((safe_predictions / total_predictions) * 100, 1) if total_predictions > 0 else 0
        
        # 6. Today's scans count
        today_str = datetime.date.today().strftime("%Y-%m-%d")
        cursor.execute("SELECT count(*) FROM predictions WHERE date(timestamp) = ?", (today_str,))
        todays_scans = cursor.fetchone()[0] or 0
        
        # 7. OCR scans count
        cursor.execute("SELECT count(*) FROM predictions WHERE source = 'ocr'")
        ocr_scans = cursor.fetchone()[0] or 0
        
        # 8. Daily Usage telemetry (past 7 days)
        daily_usage = []
        today = datetime.date.today()
        for i in range(6, -1, -1):
            d = today - datetime.timedelta(days=i)
            date_str = d.strftime("%Y-%m-%d")
            day_name = d.strftime("%a")
            
            cursor.execute("""
                SELECT count(*), 
                       SUM(CASE WHEN prediction='Spam' THEN 1 ELSE 0 END), 
                       SUM(CASE WHEN prediction='Ham' THEN 1 ELSE 0 END) 
                FROM predictions WHERE date(timestamp) = ?
            """, (date_str,))
            row = cursor.fetchone()
            
            t_count = row[0] or 0
            sp_count = row[1] or 0
            sa_count = row[2] or 0
            
            daily_usage.append({
                "day": day_name,
                "date": date_str,
                "total": t_count,
                "spam": sp_count,
                "safe": sa_count
            })
            
        conn.close()
        
        return jsonify({
            "total_predictions": total_predictions,
            "spam_predictions": spam_predictions,
            "safe_predictions": safe_predictions,
            "average_confidence": avg_confidence,
            "spam_percentage": spam_percentage,
            "safe_percentage": safe_percentage,
            "todays_scans": todays_scans,
            "ocr_scans": ocr_scans,
            "daily_usage": daily_usage
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to query database analytics: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
