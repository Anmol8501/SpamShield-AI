import os
import sys
import time
import re
import logging
import datetime
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS

# Configure minimal logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

startup_start_time = time.time()

# Paths configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "vectorizer.pkl")

# Step 1: Load model.pkl
logger.info(f"Step 1: Loading classifier model from {MODEL_PATH}...")
if not os.path.exists(MODEL_PATH):
    logger.error(f"Classifier model.pkl not found at {MODEL_PATH}")
    sys.exit(1)
model = joblib.load(MODEL_PATH)

# Step 2: Load vectorizer.pkl
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

# Step 3: Initialize Flask
logger.info("Step 3: Initializing Flask framework...")
app = Flask(__name__)
CORS(app)

# Helper function to sanitize text input
def sanitize_text(text):
    if not text:
        return ""
    # Strip HTML tags
    cleaned = re.sub(r"<[^>]*>", "", text)
    return cleaned.strip()

# Log startup completion timing
startup_duration = time.time() - startup_start_time
logger.info(f"Startup sequence complete in {startup_duration:.4f}s")

# Step 4: Register Routes

@app.route("/health", methods=["GET"])
def health():
    """Liveness probe returning instantly with HTTP 200."""
    return jsonify({"status": "healthy"}), 200

@app.route("/predict", methods=["POST"])
def predict():
    """Classifies an SMS text message using loaded model."""
    predict_start_time = time.time()
    
    try:
        data = request.get_json(silent=True) or {}
        message = data.get("message", "")

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

        logger.info(f"Prediction: {prediction_label} ({confidence:.1f}%) in {time_str}")

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

# Step 5: Start server using environment variables for ports
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    logger.info(f"Step 5: Launching Flask server on host 0.0.0.0, port {port}...")
    app.run(host="0.0.0.0", port=port)
