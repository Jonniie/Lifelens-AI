# LifeLens AI

> **Clinical-grade diabetes risk screening and lifestyle coaching platform**

LifeLens AI is an end-to-end web application that predicts diabetes risk from patient lifestyle and clinical data using a calibrated ensemble machine learning model (LightGBM + XGBoost + Logistic Regression). It delivers Nigerian-contextualized health recommendations, a warm earth-tone dashboard, and a printable PNG report.

---

## Features

- **4-Step Wizard** — Identity, Lifestyle, Review, Results
- **Real ML Inference** — Calibrated ensemble (LightGBM + XGBoost + Logistic Regression)
- **Risk Gauge** — Animated SVG gauge with live percentage
- **Lifestyle Grade** — A–F score based on habits, diet, and activity
- **Nigerian Context** — Local income tiers (₦), education levels, food references, and healthcare system terms
- **Accessibility-First** — Large readable fonts, high-contrast palette, tooltips on every control

---

## Tech Stack

### Backend
- **FastAPI** — async Python web framework
- **scikit-learn** — `CalibratedClassifierCV`, `StandardScaler`, `VotingClassifier`
- **LightGBM + XGBoost** — gradient boosting ensemble
- **pandas** — feature engineering pipeline
- **Uvicorn** — ASGI server

### Frontend
- **React 18** — functional components + hooks
- **Tailwind CSS 3** — utility-first styling
- **Vite** — build tool with HMR
- **html2canvas** — DOM-to-PNG report export

### Infrastructure
- **Render** — backend hosting (`lifelens-ai-2it2.onrender.com`)
- **Vercel** — static frontend (configured to proxy `/api` to Render in dev, direct URL in production)

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The server loads serialized artifacts on startup:
- `lifelens_model.pkl` — `CalibratedClassifierCV` voting ensemble
- `lifelens_scaler.pkl` — `StandardScaler` fit on 39 features
- `lifelens_config.json` — feature names, thresholds, labels

**Health check**: `GET /health` → `{"status": "healthy"}`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` to `localhost:8000`.

For production builds, the frontend calls `https://lifelens-ai-2it2.onrender.com/api/predict` directly.

---

## API Reference

### `POST /api/predict`

Accepts 21 CDC BRFSS-style input features and returns risk assessment.

#### Request Body

```json
{
  "HighBP": 1, "HighChol": 1, "CholCheck": 1,
  "BMI": 28.5, "Smoker": 0, "Stroke": 0,
  "HeartDiseaseorAttack": 0, "PhysActivity": 1,
  "Fruits": 1, "Veggies": 1, "HvyAlcoholConsump": 0,
  "AnyHealthcare": 1, "NoDocbcCost": 0,
  "GenHlth": 3, "MentHlth": 2, "PhysHlth": 2,
  "DiffWalk": 0, "Sex": 0, "Age": 5,
  "Education": 4, "Income": 4
}
```

#### Response

```json
{
  "tier": "Moderate",
  "risk_percentage": 42.7,
  "action": "Schedule a fasting glucose test within 2 weeks and consult a physician at a General Hospital.",
  "lifestyle": { "grade": "C", "score": 68 },
  "feature_vector": [0, 1, 1, 28.5, 0, ...],
  "recommendations": [
    {
      "priority": "high",
      "category": "Metabolic",
      "title": "Lose 5–10 kg",
      "text": "Aim for 150 min/week of brisk walking. Your BMI is 28.5 (Overweight).",
      "evidence": "Systematic review: 7% weight loss reduces diabetes incidence by 58% (Diabetes Prevention Program)."
    }
  ]
}
```

---

## Derived Features (Engineered at Runtime)

The backend computes 18 additional features from the 21 raw inputs:

| Feature | Derivation |
|---------|-----------|
| `BMI_normalized` | `(BMI - 27) / 10` |
| `Age_squared` | `Age²` |
| `BMI_x_Age` | `BMI × Age` |
| `is_Obese`, `is_Overweight`, `is_Severely_Obese` | Boolean BMI thresholds |
| `comorbidity_count` | Sum of HighBP + HighChol + Stroke + HeartDisease |
| `health_composite` | `GenHlth + (PhysHlth + MentHlth)/30` |
| `socioeconomic_score` | `Education + Income` |
| `lifestyle_score` | `PhysActivity + Fruits + Veggies - Smoker - HvyAlcoholConsump` |
| `metabolic_risk` | `HighBP + HighChol + (BMI >= 30)` |
| `access_score` | `AnyHealthcare - NoDocbcCost` |
| ... | And 7 more domain-engineered interactions |

---

## Project Structure

```
LifeLens AI/
├── backend/
│   ├── main.py                 # FastAPI app, feature engineering, inference
│   ├── lifelens_model.pkl      # Serialized calibrated ensemble
│   ├── lifelens_scaler.pkl     # StandardScaler (39 features)
│   ├── lifelens_config.json    # Feature labels + risk thresholds
│   ├── requirements.txt
│   └── start.sh
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # React app: 4-step wizard + results dashboard
│   │   ├── index.css           # Earth-tone design system + tooltip CSS
│   │   └── main.jsx            # ReactDOM root
│   ├── index.html              # Font loading (Newsreader, Atkinson, IBM Plex Mono)
│   ├── vite.config.js          # Dev proxy + build config
│   ├── tailwind.config.js
│   └── package.json
└── .gitignore                  # Excludes node_modules, venv, dist, __pycache__
```

---

## Design System

### Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| `midnight` | `#1a1209` | Page background |
| `ochre` | `#c4853e` | Primary accent, active states |
| `sand` | `#e8d5b7` | Primary text |
| `palm` | `#4a7c59` | Positive / healthy indicators |
| `terracotta` | `#b84a2f` | Warning / risk indicators |
| `gold` | `#d4a843` | Moderate / caution indicators |
| `crimson` | `#8b1e2b` | Critical / severe indicators |

### Typography
- **Display**: Newsreader (headings, gauge labels)
- **Body**: Atkinson Hyperlegible (form labels, descriptions) — designed for low-vision readability
- **Mono**: IBM Plex Mono (data values, scores, step indicators)

---

## Accessibility

- All toggle buttons have `title` tooltips explaining the exact CDC BRFSS question wording
- Minimum `text-sm` (14px) body text, `text-xs` (12px) only for secondary metadata
- Color-coded risk indicators use both **color + text label** (not color alone)
- No generic HTML form elements — all custom pills, toggles, and sliders for consistent sizing and touch targets

---

## License

MIT — built for public health impact. Not a substitute for professional medical advice.

---

> **Disclaimer**: This report is generated by LifeLens AI and is not a substitute for professional medical advice. Please consult a physician at a General Hospital or Teaching Hospital.
