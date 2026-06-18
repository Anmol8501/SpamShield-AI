# SpamShield AI - Machine Learning SMS Spam Classifier

A modern, full-stack web application that leverages a **Multinomial Naive Bayes** classifier and **TF-IDF vectorizer** to detect spam SMS messages instantly. Featuring a responsive, animated React + TypeScript + Tailwind CSS frontend and a high-performance Python Flask backend API.

---

## 📁 Project Structure

```
SMS Spam Classifier/
├── backend/
│   ├── app.py                 # Flask API entrypoint (loads model, handles CORS)
│   └── requirements.txt       # Python dependencies (Flask, scikit-learn, gunicorn)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx     # Theme toggler & navigation menu
│   │   │   ├── Home.tsx       # Interactive landing hero page
│   │   │   ├── Detector.tsx   # SMS sandbox (results card, radial dials, copy/download)
│   │   │   ├── Dashboard.tsx  # KPI metrics, SVG charts, and search history logs
│   │   │   └── ModelInfo.tsx  # Detailed pipeline documentation
│   │   ├── App.tsx            # Global state coordinator (localStorage synchronization)
│   │   ├── index.css          # Tailwind and font styles
│   │   └── main.tsx           # React entry point
│   ├── tailwind.config.js     # Tailwind v3 layout theme configs
│   ├── index.html             # SEO & Font imports html template
│   └── package.json           # Frontend dependencies (framer-motion, lucide-react)
├── model/
│   ├── model.pkl              # Saved Multinomial Naive Bayes model
│   └── vectorizer.pkl         # Saved TF-IDF vectorizer
└── README.md                  # Setup & Deployment documentation
```

---

## ⚡ Local Setup Instructions

### 1. Python Flask Backend

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```
2. **Create a virtual environment (optional but recommended)**:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Run the local development server**:
   ```bash
   python app.py
   ```
   *The server will run on `http://localhost:5000` with active CORS support.*

---

### 2. React + TypeScript Frontend

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```
2. **Install node modules**:
   ```bash
   npm install
   ```
3. **Run local developer server**:
   ```bash
   npm run dev
   ```
   *Vite will compile and boot on `http://localhost:5173`. Open this URL in your browser.*
4. **Build production bundle**:
   ```bash
   npm run build
   ```
   *Generates optimized HTML, CSS, and JS assets in the `frontend/dist/` directory.*

---

## 🚀 Render Deployment Guide

Follow these steps to host your application for free on [Render](https://render.com).

### Step 1: Deploy Flask API (Web Service)
1. Sign in to Render and create a new **Web Service**.
2. Connect your Git repository.
3. Configure the following parameters:
   - **Name**: `sms-spam-backend`
   - **Environment**: `Python`
   - **Region**: Select closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
4. Click **Deploy Web Service**. Render will spin up the container and load `model.pkl` & `vectorizer.pkl`.
5. **Copy the backend URL** once deployed (e.g., `https://sms-spam-backend.onrender.com`).

### Step 2: Configure Frontend API Endpoint
1. Before deploying the frontend, open [Detector.tsx](file:///d:/Projects/SMS%20Spam%2520Classifier/frontend/src/components/Detector.tsx#L41) and update the fetch endpoint to point to your new live Render URL:
   ```typescript
   // Change from localhost to live backend URL
   const response = await fetch("https://sms-spam-backend.onrender.com/predict", { ... })
   ```
2. Re-commit your changes to Git.

### Step 3: Deploy React Frontend (Static Site)
1. On Render, create a new **Static Site**.
2. Connect your Git repository.
3. Configure the following parameters:
   - **Name**: `sms-spam-classifier`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. Click **Deploy Static Site**. Once compiled, your static site will be active.

---

## 📊 API Contract Specifications

### 🩺 Health & Metadata Check
- **Endpoint**: `GET /health`
- **Response**:
  ```json
  {
    "status": "healthy",
    "model_algorithm": "Multinomial Naive Bayes",
    "feature_extraction": "TF-IDF Vectorizer",
    "vocabulary_size": 6708,
    "classes": ["Ham", "Spam"]
  }
  ```

### 🧠 Classification Predictor
- **Endpoint**: `POST /predict`
- **Headers**: `Content-Type: application/json`
- **Payload**:
  ```json
  {
    "message": "Congratulations! You have won ₹50,000. Click here to claim."
  }
  ```
- **Response**:
  ```json
  {
    "prediction": "Spam",
    "confidence": 50.76
  }
  ```

---

## 🛠️ Classifier & Pipeline Details
- **Classification Core**: Multinomial Naive Bayes accounts for term occurrences, making it extremely fast for parsing raw SMS frequencies.
- **Vocabulary**: 6,708 distinct terms fitted with a pre-trained TF-IDF vectorizer.
- **Bonus Capabilities**: Caches predictions in browser localStorage, outputs copyable markdown summaries, exports text reports, and features interactive dashboard visualizations.
