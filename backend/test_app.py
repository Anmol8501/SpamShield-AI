import os
import sys
import json

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app import app
    print("SaaS Flask application imported successfully.")
except Exception as e:
    print("Failed to import Flask application:", e)
    sys.exit(1)

client = app.test_client()

def run_tests():
    # 1. Test health check
    print("Testing GET /health...")
    resp = client.get("/health")
    print("Status:", resp.status_code, "JSON:", resp.get_json())
    print("-" * 50)
    
    # 2. Clear history before testing to have clean start
    print("Cleaning database log table...")
    client.delete("/history")
    
    # 3. Test predict endpoint (manual text input)
    print("Testing POST /predict (manual)...")
    payload = {"message": "Urgent! Claim your free gift voucher now at http://gift.cc!", "source": "manual"}
    resp = client.post("/predict", json=payload)
    print("Status:", resp.status_code, "JSON:", resp.get_json())
    print("-" * 50)

    # 4. Test predict endpoint (OCR source text input)
    print("Testing POST /predict (ocr source)...")
    payload = {"message": "Hey, let's meet at 5 PM for dinner.", "source": "ocr"}
    resp = client.post("/predict", json=payload)
    print("Status:", resp.status_code, "JSON:", resp.get_json())
    print("-" * 50)

    # 5. Check history list from database
    print("Testing GET /history...")
    resp = client.get("/history")
    history = resp.get_json()
    print("Status:", resp.status_code, f"Length of history: {len(history)}")
    print("Sample logs:")
    for idx, r in enumerate(history):
         print(f"  {idx + 1}. Source: {r['source']} | Prediction: {r['prediction']} | Message: '{r['message'][:30]}...'")
    print("-" * 50)

    # 6. Check analytics calculated from DB
    print("Testing GET /analytics...")
    resp = client.get("/analytics")
    print("Status:", resp.status_code, "JSON:", json.dumps(resp.get_json(), indent=2))
    print("-" * 50)

if __name__ == "__main__":
    run_tests()
