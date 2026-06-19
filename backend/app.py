import os
import sys
import time
import re
import logging
import sqlite3
import datetime
import io
import joblib
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Track startup sequence times
startup_start_time = time.time()

# Memory logging helper
def get_memory_usage():
    """Returns memory usage of the current process, optimized for Render/Linux and Windows."""
    try:
        # For Linux (Render Free Tier)
        if os.path.exists("/proc/self/status"):
            with open("/proc/self/status") as f:
                status = f.read()
            vm_rss = re.search(r"VmRSS:\s+(\d+)\s+kB", status)
            if vm_rss:
                return f"{int(vm_rss.group(1)) / 1024:.2f} MB"
    except Exception:
        pass

    try:
        # Fallback using resource module (Linux/macOS)
        import resource
        usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        # On Linux ru_maxrss is in KB, on macOS it is in bytes
        if sys.platform.startswith("darwin"):
            return f"{usage / (1024 * 1024):.2f} MB"
        else:
            return f"{usage / 1024:.2f} MB"
    except Exception:
        pass

    return "Unknown"

# Paths configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "vectorizer.pkl")
DATABASE_PATH = os.path.join(BASE_DIR, "instance", "predictions.db")

# Ensure required backend folders exist
os.makedirs(os.path.join(BASE_DIR, "instance"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "data"), exist_ok=True)

# Step 1 & 2: Load model.pkl and vectorizer.pkl at startup
logger.info(f"Step 1: Loading classifier model from {MODEL_PATH}...")
if not os.path.exists(MODEL_PATH):
    logger.error(f"Classifier model.pkl not found at {MODEL_PATH}")
    sys.exit(1)
model = joblib.load(MODEL_PATH)

logger.info(f"Step 2: Loading vectorizer from {VECTORIZER_PATH}...")
if not os.path.exists(VECTORIZER_PATH):
    logger.error(f"Vectorizer vectorizer.pkl not found at {VECTORIZER_PATH}")
    sys.exit(1)
vectorizer = joblib.load(VECTORIZER_PATH)

# Build class mapping
class_mapping = {}
if hasattr(model, "classes_"):
    for c in list(model.classes_):
        str_val = str(c).lower().strip()
        if str_val in ("1", "spam"):
            class_mapping[c] = "Spam"
        elif str_val in ("0", "ham"):
            class_mapping[c] = "Ham"
        else:
            class_mapping[c] = str(c).title()
else:
    class_mapping = {0: "Ham", 1: "Spam"}
logger.info(f"Model class mapping configured: {class_mapping}")

# Initialize SQLite database schema
def init_db():
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
    logger.info(f"SQLite database initialized at {DATABASE_PATH}")

init_db()

# Step 3: Initialize Flask App
logger.info("Step 3: Initializing Flask framework...")
app = Flask(__name__)
CORS(app)

# Helper function to query SQLite connections safely
def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Clean up message input strings
def sanitize_text(text):
    if not text:
        return ""
    # Strip HTML tags
    cleaned = re.sub(r"<[^>]*>", "", text)
    return cleaned.strip()

# Log startup completion stats
startup_duration = time.time() - startup_start_time
logger.info(f"Startup sequence complete in {startup_duration:.4f}s. Memory usage: {get_memory_usage()}")

# Step 4: Register Routes

@app.route("/health", methods=["GET"])
def health():
    """Liveness probe returning instantly with HTTP 200."""
    return jsonify({"status": "healthy"}), 200

@app.route("/ocr", methods=["POST"])
def run_ocr():
    """Extracts text on-demand from uploaded image with preprocessing."""
    ocr_start_time = time.time()
    logger.info(f"OCR request received. Current memory: {get_memory_usage()}")

    if "image" not in request.files:
        return jsonify({"error": "No image file provided in 'image' key."}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Selected file is empty."}), 400

    # Validate file size (Max 5 MB)
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)  # Reset stream position
    
    if file_size > 5 * 1024 * 1024:
        logger.warning(f"Rejected OCR upload. File size {file_size / (1024*1024):.2f}MB exceeds 5MB limit.")
        return jsonify({"error": "File size exceeds maximum 5 MB upload limit."}), 400

    # Validate file format extension
    allowed_extensions = {"png", "jpg", "jpeg", "webp"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in allowed_extensions:
        return jsonify({"error": f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"}), 400

    try:
        # Lazy load pytesseract dependencies to keep startup memory low
        import pytesseract

        # Read image
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes))

        # Perform image preprocessing (Resize, Convert to Grayscale, Compress)
        # 1. Convert to grayscale
        image = image.convert("L")

        # 2. Resize keeping aspect ratio (max dimension 1000px)
        max_dim = 1000
        if image.width > max_dim or image.height > max_dim:
            if hasattr(Image, "Resampling"):
                resample_filter = Image.Resampling.LANCZOS
            else:
                resample_filter = Image.ANTIALIAS
            image.thumbnail((max_dim, max_dim), resample_filter)

        # 3. Compress image in memory using JPEG quality 75
        compressed_io = io.BytesIO()
        image.save(compressed_io, format="JPEG", quality=75)
        compressed_io.seek(0)
        processed_image = Image.open(compressed_io)

        # Process image using pytesseract
        extracted_text = pytesseract.image_to_string(processed_image).strip()

        # Compute OCR confidence using word levels metadata
        avg_conf = 95.0
        try:
            ocr_data = pytesseract.image_to_data(processed_image, output_type=pytesseract.Output.DICT)
            confidences = [int(c) for c in ocr_data["conf"] if c != "-1" and c != -1]
            if confidences:
                avg_conf = sum(confidences) / len(confidences)
        except Exception as ocr_conf_err:
            logger.debug(f"Could not compute precise OCR confidence: {str(ocr_conf_err)}")

        duration = time.time() - ocr_start_time
        logger.info(f"OCR processing completed in {duration:.2f}s. Memory usage: {get_memory_usage()}")

        return jsonify({
            "success": True,
            "extracted_text": extracted_text,
            "confidence": round(avg_conf, 1),
            "processing_time": f"{duration:.2f}s",
            "char_count": len(extracted_text)
        }), 200

    except ImportError:
        logger.error("pytesseract is missing or not installed in python environment.")
        return jsonify({"error": "PyTesseract system dependencies missing on host server."}), 500
    except Exception as e:
        err_msg = str(e)
        logger.error(f"OCR execution failed: {err_msg}")
        if "tesseract is not installed" in err_msg.lower() or "no such file or directory" in err_msg.lower():
            return jsonify({"error": "Tesseract OCR binary is missing on Render. Ensure it is configured in render.yaml packages."}), 500
        return jsonify({"error": f"OCR analysis failed: {err_msg}"}), 500

@app.route("/predict", methods=["POST"])
def predict():
    """Classifies an SMS text message using loaded model and records predictions to SQLite."""
    predict_start_time = time.time()
    
    try:
        data = request.get_json(silent=True) or {}
        message = data.get("message", "")
        source = data.get("source", "manual")  # 'manual' or 'ocr'

        if not isinstance(message, str):
            return jsonify({"error": "Message payload must be a string."}), 400

        sanitized_message = sanitize_text(message)
        sanitized_message = sanitized_message[:500]  # Cap at 500 characters

        if not sanitized_message.strip():
            return jsonify({"error": "Sanitized SMS message content is empty."}), 400

        # Transform and classify
        transformed = vectorizer.transform([sanitized_message])
        pred = model.predict(transformed)[0]
        proba = model.predict_proba(transformed)[0]

        # Extract confidence mapping
        classes = list(model.classes_)
        pred_idx = classes.index(pred)
        confidence = float(proba[pred_idx]) * 100.0

        prediction_label = class_mapping.get(pred, "Ham" if pred == 0 else "Spam")

        # Determine risk levels
        if prediction_label == "Spam":
            risk_level = "High" if confidence >= 80.0 else "Medium"
        else:
            risk_level = "Low" if confidence >= 80.0 else "Medium"

        duration = time.time() - predict_start_time
        time_str = f"{duration:.4f}s"
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Record prediction details to database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO predictions (message, prediction, confidence, timestamp, source) VALUES (?, ?, ?, ?, ?)",
            (sanitized_message, prediction_label, round(confidence, 2), timestamp, source)
        )
        conn.commit()
        conn.close()

        logger.info(f"Prediction: {prediction_label} ({confidence:.1f}%) in {time_str}. Memory: {get_memory_usage()}")

        return jsonify({
            "prediction": prediction_label,
            "confidence": round(confidence, 2),
            "risk": risk_level,
            "processing_time": time_str,
            "timestamp": timestamp
        }), 200

    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}")
        return jsonify({"error": f"Inference classification failed: {str(e)}"}), 500

@app.route("/history", methods=["GET"])
def get_history():
    """Queries predictions log from database using SQLite limit/offset pagination."""
    try:
        # Fetch limit and offset pagination parameters
        limit = request.args.get("limit", 50, type=int)
        offset = request.args.get("offset", 0, type=int)

        # Enforce maximum safety caps to prevent large payloads
        limit = min(max(1, limit), 100)
        offset = max(0, offset)

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, message, prediction, confidence, timestamp, source FROM predictions ORDER BY id DESC LIMIT ? OFFSET ?",
            (limit, offset)
        )
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

        logger.info(f"Served history logs (limit={limit}, offset={offset}). Memory: {get_memory_usage()}")
        return jsonify(history_list), 200

    except Exception as e:
        logger.error(f"Failed to query database: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/history/<int:pred_id>", methods=["DELETE"])
def delete_record(pred_id):
    """Deletes a specific log record by its ID."""
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
    """Wipes all rows from the database prediction logs."""
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
    """Calculates predictions statistics dynamically on demand from SQLite database."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get total predictions count
        cursor.execute("SELECT count(*) FROM predictions")
        total = cursor.fetchone()[0] or 0

        # Return empty parameters if no data has been compiled yet
        if total == 0:
            conn.close()
            return jsonify({
                "total_predictions": 0,
                "spam_predictions": 0,
                "safe_predictions": 0,
                "average_confidence": 0,
                "spam_percentage": 0,
                "safe_percentage": 0,
                "todays_scans": 0,
                "ocr_scans": 0,
                "daily_usage": []
            }), 200

        # Group count variables
        cursor.execute("SELECT count(*) FROM predictions WHERE prediction = 'Spam'")
        spam_count = cursor.fetchone()[0] or 0

        cursor.execute("SELECT count(*) FROM predictions WHERE prediction = 'Ham'")
        safe_count = cursor.fetchone()[0] or 0

        cursor.execute("SELECT avg(confidence) FROM predictions")
        avg_confidence = cursor.fetchone()[0] or 0.0

        # Percentages
        spam_pct = round((spam_count / total) * 100, 1)
        safe_pct = round((safe_count / total) * 100, 1)

        # Scans compiled today
        today_str = datetime.date.today().strftime("%Y-%m-%d")
        cursor.execute("SELECT count(*) FROM predictions WHERE SUBSTR(timestamp, 1, 10) = ?", (today_str,))
        todays_scans = cursor.fetchone()[0] or 0

        # Scans initialized via OCR
        cursor.execute("SELECT count(*) FROM predictions WHERE source = 'ocr'")
        ocr_scans = cursor.fetchone()[0] or 0

        # Generate daily volume trends for the past 7 calendar days
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
                FROM predictions WHERE SUBSTR(timestamp, 1, 10) = ?
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

        logger.info(f"Served analytics dashboard data. Memory usage: {get_memory_usage()}")
        return jsonify({
            "total_predictions": total,
            "spam_predictions": spam_count,
            "safe_predictions": safe_count,
            "average_confidence": round(avg_confidence, 1),
            "spam_percentage": spam_pct,
            "safe_percentage": safe_pct,
            "todays_scans": todays_scans,
            "ocr_scans": ocr_scans,
            "daily_usage": daily_usage
        }), 200

    except Exception as e:
        logger.error(f"Failed to compile dashboard metrics: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Step 5: Start server using environment variables for ports (Fix 5)
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    logger.info(f"Step 5: Launching Flask server on host 0.0.0.0, port {port}...")
    app.run(host="0.0.0.0", port=port)
