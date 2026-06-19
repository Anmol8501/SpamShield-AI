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
    
    # 2. Test predict endpoint (manual text input)
    print("Testing POST /predict (manual)...")
    payload = {"message": "Urgent! Claim your free gift voucher now at http://gift.cc!"}
    resp = client.post("/predict", json=payload)
    print("Status:", resp.status_code, "JSON:", resp.get_json())
    print("-" * 50)

    # 3. Test predict endpoint (clean text input)
    print("Testing POST /predict (clean)...")
    payload = {"message": "Hey, let's meet at 5 PM for dinner."}
    resp = client.post("/predict", json=payload)
    print("Status:", resp.status_code, "JSON:", resp.get_json())
    print("-" * 50)

if __name__ == "__main__":
    run_tests()
