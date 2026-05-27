from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import numpy as np
import pandas as pd
import json
import joblib
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="LifeLens AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Safe Artifact Loading Routine
# ─────────────────────────────────────────────
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(_BASE_DIR, "lifelens_config.json")
MODEL_PATH = os.path.join(_BASE_DIR, "lifelens_model.pkl")
SCALER_PATH = os.path.join(_BASE_DIR, "lifelens_scaler.pkl")

original_features: List[str] = []
all_features: List[str] = []
model = None
scaler = None
artifacts_loaded = False

try:
    with open(CONFIG_PATH, "r") as f:
        config = json.load(f)
    original_features = config.get("original_features", [])
    all_features = config.get("all_features", [])
    logger.info(f"Loaded config: {len(original_features)} original, {len(all_features)} total features.")
except FileNotFoundError as e:
    logger.error(f"CRITICAL: Config file not found ({e}). Server cannot start without lifelens_config.json.")
    raise
except Exception as e:
    logger.error(f"CRITICAL: Config loading failed ({e}).")
    raise

try:
    scaler = joblib.load(SCALER_PATH)
    logger.info(f"Loaded scaler from {SCALER_PATH}.")
except FileNotFoundError as e:
    logger.error(f"CRITICAL: Scaler file not found ({e}). Server cannot start without lifelens_scaler.pkl.")
    raise
except Exception as e:
    logger.error(f"CRITICAL: Scaler loading failed ({type(e).__name__}: {e}).")
    raise

try:
    model = joblib.load(MODEL_PATH)
    logger.info(f"Loaded model from {MODEL_PATH}.")
    artifacts_loaded = True
except FileNotFoundError as e:
    logger.error(f"CRITICAL: Model file not found ({e}). Server cannot start without lifelens_model.pkl.")
    raise
except Exception as e:
    logger.error(f"CRITICAL: Model loading failed ({type(e).__name__}: {e}). "
                 f"This usually means a required runtime dependency (e.g., scikit-learn, xgboost, lightgbm) is missing.")
    raise


# ─────────────────────────────────────────────
# Pydantic Validation Schema (21 CDC BRFSS Features)
# ─────────────────────────────────────────────
class PatientMetrics(BaseModel):
    HighBP: int = Field(..., ge=0, le=1, description="High Blood Pressure: 0=No, 1=Yes")
    HighChol: int = Field(..., ge=0, le=1, description="High Cholesterol: 0=No, 1=Yes")
    CholCheck: int = Field(..., ge=0, le=1, description="Cholesterol check in past 5 years: 0=No, 1=Yes")
    BMI: float = Field(..., ge=10.0, le=80.0, description="Body Mass Index")
    Smoker: int = Field(..., ge=0, le=1, description="Smoked at least 100 cigarettes in lifetime: 0=No, 1=Yes")
    Stroke: int = Field(..., ge=0, le=1, description="Ever had a stroke: 0=No, 1=Yes")
    HeartDiseaseorAttack: int = Field(..., ge=0, le=1, description="Coronary heart disease or myocardial infarction: 0=No, 1=Yes")
    PhysActivity: int = Field(..., ge=0, le=1, description="Physical activity in past 30 days: 0=No, 1=Yes")
    Fruits: int = Field(..., ge=0, le=1, description="Consume fruit at least once daily: 0=No, 1=Yes")
    Veggies: int = Field(..., ge=0, le=1, description="Consume vegetables at least once daily: 0=No, 1=Yes")
    HvyAlcoholConsump: int = Field(..., ge=0, le=1, description="Heavy alcohol consumption: 0=No, 1=Yes")
    AnyHealthcare: int = Field(..., ge=0, le=1, description="Any health care coverage: 0=No, 1=Yes")
    NoDocbcCost: int = Field(..., ge=0, le=1, description="Could not see doctor because of cost: 0=No, 1=Yes")
    GenHlth: int = Field(..., ge=1, le=5, description="General health: 1=Excellent, 5=Poor")
    MentHlth: int = Field(..., ge=0, le=30, description="Days mental health not good in past 30 days")
    PhysHlth: int = Field(..., ge=0, le=30, description="Days physical health not good in past 30 days")
    DiffWalk: int = Field(..., ge=0, le=1, description="Difficulty walking or climbing stairs: 0=No, 1=Yes")
    Sex: int = Field(..., ge=0, le=1, description="Biological sex: 0=Female, 1=Male")
    Age: int = Field(..., ge=1, le=13, description="Age category: 1=18-24, 13=80+")
    Education: int = Field(..., ge=1, le=6, description="Education level: 1=Never/Kindergarten, 6=College grad")
    Income: int = Field(..., ge=1, le=8, description="Income level: 1=<$10k, 8=$75k+")


# ─────────────────────────────────────────────
# Dynamic Feature Engineering Pipeline
# ─────────────────────────────────────────────
def engineer_features(raw: dict) -> pd.DataFrame:
    """
    Computes 21 raw + 18 engineered features and returns a pandas DataFrame
    with columns reindexed to exactly match `all_features` from config.
    """
    df_raw = pd.DataFrame([raw])

    for col in original_features:
        if col not in df_raw.columns:
            df_raw[col] = 0
        df_raw[col] = pd.to_numeric(df_raw[col], errors="coerce")

    HighBP = df_raw["HighBP"].iloc[0]
    HighChol = df_raw["HighChol"].iloc[0]
    BMI = df_raw["BMI"].iloc[0]
    Smoker = df_raw["Smoker"].iloc[0]
    Stroke = df_raw["Stroke"].iloc[0]
    HeartDiseaseorAttack = df_raw["HeartDiseaseorAttack"].iloc[0]
    PhysActivity = df_raw["PhysActivity"].iloc[0]
    Fruits = df_raw["Fruits"].iloc[0]
    Veggies = df_raw["Veggies"].iloc[0]
    HvyAlcoholConsump = df_raw["HvyAlcoholConsump"].iloc[0]
    AnyHealthcare = df_raw["AnyHealthcare"].iloc[0]
    NoDocbcCost = df_raw["NoDocbcCost"].iloc[0]
    GenHlth = df_raw["GenHlth"].iloc[0]
    MentHlth = df_raw["MentHlth"].iloc[0]
    PhysHlth = df_raw["PhysHlth"].iloc[0]
    DiffWalk = df_raw["DiffWalk"].iloc[0]
    Age = df_raw["Age"].iloc[0]
    Education = df_raw["Education"].iloc[0]
    Income = df_raw["Income"].iloc[0]

    # 1. BMI-derived
    df_raw["BMI_Obese"] = 1 if BMI >= 30 else 0
    df_raw["BMI_Overweight"] = 1 if 25 <= BMI < 30 else 0
    df_raw["BMI_Sq"] = BMI ** 2
    df_raw["BMI_SevObese"] = 1 if BMI >= 35 else 0

    # 2. Comorbidity
    df_raw["Comorbidity_Score"] = HighBP + HighChol + Stroke + HeartDiseaseorAttack + DiffWalk

    # 3. Lifestyle
    df_raw["Lifestyle_Score"] = PhysActivity + Fruits + Veggies - Smoker - HvyAlcoholConsump

    # 4. Interactions / proxies
    df_raw["BP_Chol_Interaction"] = HighBP * HighChol
    df_raw["MetSyn_Proxy"] = 1 if (HighBP + HighChol + df_raw["BMI_Obese"].iloc[0] + HeartDiseaseorAttack) >= 3 else 0
    df_raw["Health_Burden"] = (MentHlth + PhysHlth) / 60.0
    df_raw["MentHlth_Severe"] = 1 if MentHlth >= 14 else 0
    df_raw["PhysHlth_Severe"] = 1 if PhysHlth >= 14 else 0
    df_raw["SES_Score"] = (Income + Education) / 14.0
    df_raw["SES_Low"] = 1 if (Income <= 3 or Education <= 2) else 0
    df_raw["Age_BMI"] = Age * BMI / 100.0
    df_raw["GenHlth_PhysHlth"] = GenHlth * PhysHlth
    df_raw["Age_Comorbidity"] = Age * df_raw["Comorbidity_Score"].iloc[0] / 10.0
    df_raw["LifestyleRisk_Index"] = Smoker * 2 + HvyAlcoholConsump + df_raw["BMI_Obese"].iloc[0] + (1 - PhysActivity) * 2 + df_raw["MentHlth_Severe"].iloc[0]
    df_raw["Healthcare_Gap"] = NoDocbcCost * (1 - AnyHealthcare)

    # CRITICAL: Reindex to exact `all_features` order expected by scaler/model
    df_engineered = df_raw.reindex(columns=all_features)
    return df_engineered.astype(float)


# ─────────────────────────────────────────────
# Real Model Inference
# ─────────────────────────────────────────────
def predict_risk(df_engineered: pd.DataFrame) -> float:
    """
    Live inference pipeline. Scales the engineered DataFrame and passes it
    through the loaded calibrated soft-voting ensemble classifier.
    """
    if not artifacts_loaded or scaler is None or model is None:
        raise HTTPException(
            status_code=503,
            detail="Model artifacts are not loaded. The inference pipeline is unavailable."
        )
    X_scaled_array = scaler.transform(df_engineered)
    X_scaled = pd.DataFrame(X_scaled_array, columns=df_engineered.columns, index=df_engineered.index)
    if hasattr(model, "predict_proba"):
        prob = model.predict_proba(X_scaled)[:, 1][0]
    elif hasattr(model, "predict"):
        prob = float(model.predict(X_scaled)[0])
    else:
        raise HTTPException(
            status_code=500,
            detail="Loaded model does not support predict_proba or predict."
        )
    return float(prob)


# ─────────────────────────────────────────────
# Risk Tier Validation Strategy
# ─────────────────────────────────────────────
def get_risk_tier(probability: float):
    pct = probability * 100.0
    if pct < 20.0:
        return {"tier": "Very Low", "color": "#10B981", "action": "Maintain healthy lifestyle."}
    elif pct < 40.0:
        return {"tier": "Low", "color": "#34D399", "action": "Minor improvements recommended."}
    elif pct < 60.0:
        return {"tier": "Moderate", "color": "#F59E0B", "action": "Act now -- lifestyle changes can reverse risk."}
    elif pct < 80.0:
        return {"tier": "High", "color": "#EF4444", "action": "Seek GP screening within 3 months."}
    else:
        return {"tier": "Very High", "color": "#B91C1C", "action": "Urgent GP consult -- diabetes screening today."}


# ─────────────────────────────────────────────
# Lifestyle Score Grading Engine
# ─────────────────────────────────────────────
def compute_lifestyle_score(raw: dict) -> dict:
    score = 50.0

    # Physical Activity
    if int(raw["PhysActivity"]) == 1:
        score += 15.0
    else:
        score -= 10.0

    # BMI
    bmi = float(raw["BMI"])
    if bmi < 25:
        score += 20.0
    elif bmi < 30:
        score += 8.0
    elif bmi < 35:
        score -= 10.0
    else:
        score -= 20.0

    # Fruits
    if int(raw["Fruits"]) == 1:
        score += 5.0
    else:
        score -= 3.0

    # Veggies
    if int(raw["Veggies"]) == 1:
        score += 5.0
    else:
        score -= 3.0

    # Smoking
    if int(raw["Smoker"]) == 1:
        score -= 15.0

    # Heavy Alcohol
    if int(raw["HvyAlcoholConsump"]) == 1:
        score -= 10.0

    # Mental Health
    ment = int(raw["MentHlth"])
    if ment == 0:
        score += 10.0
    elif ment <= 5:
        score += 5.0
    elif ment <= 15:
        score -= 5.0
    else:
        score -= 10.0

    # General Health
    gen = int(raw["GenHlth"])
    if gen == 1:
        score += 10.0
    elif gen == 2:
        score += 6.0
    elif gen == 3:
        score += 2.0
    elif gen == 4:
        score -= 5.0
    elif gen == 5:
        score -= 12.0

    score = max(0.0, min(100.0, score))

    if score >= 80.0:
        grade = "A"
    elif score >= 65.0:
        grade = "B"
    elif score >= 50.0:
        grade = "C"
    elif score >= 35.0:
        grade = "D"
    else:
        grade = "F"

    return {"score": round(score, 1), "grade": grade}


# ─────────────────────────────────────────────
# Recommendation Rule Triggers
# ─────────────────────────────────────────────
def generate_recommendations(raw: dict) -> List[dict]:
    recs = []

    # 1. Physical Activity
    if int(raw["PhysActivity"]) == 0:
        recs.append({
            "category": "Physical Activity",
            "priority": "high",
            "title": "Move More Every Day",
            "text": "Walk to the market, farm, or trek 30 minutes daily. In Nigeria, even brisk walking through the compound or neighbourhood roads counts. Aim for 150 minutes weekly.",
            "evidence": "Regular walking and farm work reduce diabetes risk by 30–50% among Africans. WHO recommends 150 min/week moderate activity.",
        })

    # 2. BMI
    bmi = float(raw["BMI"])
    if bmi >= 30:
        recs.append({
            "category": "Weight Management",
            "priority": "high",
            "title": "Reduce Body Weight Gradually",
            "text": f"Your BMI is {bmi:.1f} (Obese). Cut down on large portions of eba, pounded yam, and white rice. Increase beans, vegetables (ugwu, efo), and lean proteins.",
            "evidence": "Among Nigerians, a 5–7% weight loss significantly improves fasting glucose and reduces prediabetes progression.",
        })
    elif bmi >= 25:
        recs.append({
            "category": "Weight Management",
            "priority": "medium",
            "title": "Watch Portion Sizes",
            "text": f"Your BMI is {bmi:.1f} (Overweight). Reduce swallow size, limit fried foods (dodo, akara), and eat more fibre-rich soups and vegetables.",
            "evidence": "Even modest 3–5% weight loss improves blood sugar control in overweight African adults.",
        })

    # 3. Smoking
    if int(raw["Smoker"]) == 1:
        recs.append({
            "category": "Tobacco Cessation",
            "priority": "high",
            "title": "Stop Smoking Now",
            "text": "Whether cigarettes, bidi, or shisha, smoking damages blood vessels and worsens diabetes risk. Seek support from a General Hospital clinic or community health worker.",
            "evidence": "Smokers have 30–40% higher risk of type 2 diabetes; quitting reduces risk over 5–10 years.",
        })

    # 4. High BP
    if int(raw["HighBP"]) == 1:
        recs.append({
            "category": "Cardiovascular",
            "priority": "high",
            "title": "Control Blood Pressure",
            "text": "Reduce salt in soups and stews. Use less bouillon cubes (Maggi). Walk daily. Check BP at a PHC or General Hospital. Target <130/80 mmHg if possible.",
            "evidence": "Hypertension is a core component of metabolic syndrome and strongly predicts diabetes in African populations.",
        })

    # 5. High Cholesterol
    if int(raw["HighChol"]) == 1:
        recs.append({
            "category": "Cardiovascular",
            "priority": "medium",
            "title": "Improve Your Lipid Profile",
            "text": "Reduce palm oil and fried snacks. Eat more fish (mackerel, sardines), beans, and fibre-rich vegetables. Ask your doctor about lipid testing at a Teaching Hospital.",
            "evidence": "High cholesterol clusters with insulin resistance; dietary change and exercise lower cardiovascular risk in African adults.",
        })

    # 6. Fruits & Veggies
    if int(raw["Fruits"]) == 0 or int(raw["Veggies"]) == 0:
        recs.append({
            "category": "Nutrition",
            "priority": "medium",
            "title": "Eat More Fruits and Vegetables",
            "text": "Include mango, orange, watermelon, and garden egg. Add ugwu, efo, okra, and bitter leaf to soups. These are affordable and widely available in Nigerian markets.",
            "evidence": "Higher fibre and polyphenol intake from local produce improves blood sugar control and gut health.",
        })

    # 7. Heavy Alcohol
    if int(raw["HvyAlcoholConsump"]) == 1:
        recs.append({
            "category": "Substance Use",
            "priority": "high",
            "title": "Cut Down on Alcohol",
            "text": "Limit palm wine, beer, and spirits (ogogoro). Heavy drinking adds empty calories and damages the liver, worsening diabetes risk.",
            "evidence": "Heavy alcohol use increases metabolic syndrome risk by ~50% and is linked to pancreatitis and liver disease.",
        })

    # 8. Mental Health
    ment = int(raw["MentHlth"])
    if ment >= 14:
        recs.append({
            "category": "Mental Health",
            "priority": "high",
            "title": "Address Persistent Stress or Worry",
            "text": "Chronic worry, financial stress, or family pressure raise cortisol and blood sugar. Talk to a trusted person, pastor/imam, or seek counselling at a General Hospital.",
            "evidence": "Depression and chronic stress are independent risk factors for diabetes through stress-hormone dysregulation.",
        })
    elif ment >= 7:
        recs.append({
            "category": "Mental Health",
            "priority": "medium",
            "title": "Rest and Recover",
            "text": "Aim for 7–9 hours of sleep. Turn off phones early. Brief prayer, meditation, or quiet time reduces stress hormones.",
            "evidence": "Sleep deprivation (<6h) impairs glucose tolerance and increases hunger hormones.",
        })

    # 9. NoDocbcCost
    if int(raw["NoDocbcCost"]) == 1 and int(raw["AnyHealthcare"]) == 0:
        recs.append({
            "category": "Healthcare Access",
            "priority": "high",
            "title": "Find Affordable Care",
            "text": "Visit a Primary Health Centre (PHC) or General Hospital. NHIS enrolment, community health insurance, and some faith-based clinics offer subsidised screening (fasting glucose, HbA1c).",
            "evidence": "Uninsured individuals are 2–3x less likely to receive preventive care and early diabetes diagnosis.",
        })
    elif int(raw["NoDocbcCost"]) == 1:
        recs.append({
            "category": "Healthcare Access",
            "priority": "medium",
            "title": "Reduce Cost Barriers",
            "text": "Ask for generic medications at the pharmacy. Many Teaching Hospitals and PHCs offer subsidised or free chronic disease clinics.",
            "evidence": "Cost-related non-adherence worsens chronic disease outcomes and increases emergency hospital visits.",
        })

    # 10. DiffWalk / PhysHlth
    phys = int(raw["PhysHlth"])
    if int(raw["DiffWalk"]) == 1 or phys >= 14:
        recs.append({
            "category": "Functional Capacity",
            "priority": "medium",
            "title": "Stay Mobile Despite Pain",
            "text": "Gentle walking within the compound, light household chores, and stretching help maintain mobility. See a doctor if joint pain or swelling persists.",
            "evidence": "Reduced mobility creates a cycle of weight gain and worsening blood sugar control.",
        })

    # 11. GenHlth
    gen = int(raw["GenHlth"])
    if gen >= 4:
        recs.append({
            "category": "General Wellness",
            "priority": "medium",
            "title": "Get a Full Health Check",
            "text": "Visit a General Hospital or Teaching Hospital for fasting glucose, lipid panel, and blood pressure. Treat infections and underlying inflammation promptly.",
            "evidence": "Self-reported poor health strongly predicts future diabetes and heart disease in African cohorts.",
        })

    # 12. Heart Disease
    if int(raw["HeartDiseaseorAttack"]) == 1:
        recs.append({
            "category": "Cardiac",
            "priority": "high",
            "title": "Manage Heart and Sugar Together",
            "text": "If you have had chest pain, heart attack, or heart failure, you need combined care. Ask your doctor at a Teaching Hospital about integrated diabetes-heart treatment.",
            "evidence": "Prior heart disease carries cardiovascular risk equivalent to diabetes; dual conditions require aggressive therapy.",
        })

    # 13. Stroke
    if int(raw["Stroke"]) == 1:
        recs.append({
            "category": "Neurovascular",
            "priority": "high",
            "title": "Prevent Another Stroke",
            "text": "Tight blood sugar control reduces recurrent stroke risk. Continue physiotherapy and attend follow-up at a Teaching Hospital or specialist clinic.",
            "evidence": "Diabetes doubles stroke recurrence risk; post-stroke glucose monitoring is critical for secondary prevention.",
        })

    # 14. Age
    age = int(raw["Age"])
    if age >= 9:
        recs.append({
            "category": "Age-Adjusted Screening",
            "priority": "medium",
            "title": "Screen More Often After 60",
            "text": "Adults 60+ should check fasting glucose or HbA1c at least twice yearly. Ask for kidney function tests (eGFR, urine protein) and eye exams at a General Hospital.",
            "evidence": "Diabetes prevalence rises sharply after age 60; early detection prevents blindness, kidney failure, and amputation.",
        })

    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    recs.sort(key=lambda x: priority_order.get(x["priority"], 3))
    return recs


# ─────────────────────────────────────────────
# Core Prediction Handler
# ─────────────────────────────────────────────
def run_prediction(raw: dict):
    """Orchestrate feature engineering, live inference, tiering, lifestyle, and recommendations."""
    df_engineered = engineer_features(raw)
    prob = predict_risk(df_engineered)
    pct = prob * 100.0
    tier = get_risk_tier(prob)
    lifestyle = compute_lifestyle_score(raw)
    recommendations = generate_recommendations(raw)

    return {
        "risk_probability": round(prob, 4),
        "risk_percentage": round(pct, 2),
        "tier": tier["tier"],
        "tier_color": tier["color"],
        "action": tier["action"],
        "lifestyle": lifestyle,
        "recommendations": recommendations,
        "feature_vector": df_engineered.values[0].tolist(),
        "model_loaded": artifacts_loaded,
    }


# ─────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {"status": "ok", "model_loaded": artifacts_loaded}


@app.post("/predict")
def predict_legacy(metrics: PatientMetrics):
    """Legacy route maintained for backward compatibility with existing frontend proxy."""
    return run_prediction(metrics.model_dump())


@app.post("/api/predict")
def predict_api(metrics: PatientMetrics):
    """Primary production route aligned with the live artifact pipeline."""
    return run_prediction(metrics.model_dump())


# ─────────────────────────────────────────────
# Entrypoint
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
