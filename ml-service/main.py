"""
PerformIQ AI - ML Prediction Service (FastAPI)
Serves predictions using the trained scikit-learn pipeline (HistGradientBoostingRegressor).
"""

import os
from contextlib import asynccontextmanager
from typing import Any, Dict, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Exact input columns required by the trained pipeline
FEATURE_COLUMNS = [
    'age', 'gender', 'education_level', 'school_type', 'family_income',
    'parent_education', 'urban_rural', 'previous_exam_score', 'previous_gpa',
    'attendance_percentage', 'assignment_completion_rate', 'class_participation',
    'study_hours_per_day', 'self_study_hours', 'private_tuition',
    'online_learning_hours', 'study_consistency', 'study_environment',
    'study_method', 'revision_frequency', 'practice_tests_completed',
    'notes_quality', 'sleep_hours', 'sleep_quality', 'daily_screen_time',
    'physical_activity_hours', 'break_frequency', 'stress_level',
    'motivation_level', 'internet_access', 'device_availability',
    'educational_app_usage', 'online_course_hours', 'exam_difficulty',
    'exam_preparation_days', 'time_management_score', 'exam_anxiety_level'
]

model = None
MODEL_PATH = os.path.join(os.path.dirname(__file__), "performiq_model.joblib")


def clean_features(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Cleans and standardizes input features for the scikit-learn pipeline:
    1. Replaces empty strings and nulls with None for SimpleImputer imputation.
    2. Converts device_availability == "None" to None:
       In data/final_student_exam_performance.csv, 2,965 rows have literal string "None"
       (indicating student has no dedicated or shared device). During notebook model training,
       pandas read_csv default na_values silently parsed "None" as NaN, so the training
       pipeline's SimpleImputer(strategy="most_frequent") imputed it.
       In live inference, sending "None" as a string causes OneHotEncoder to treat it as an
       unseen category. Converting "None" to None/NaN restores exact parity with the training
       pipeline.
    """
    row = {}
    for col in FEATURE_COLUMNS:
        val = features.get(col)
        if val == "" or val is None:
            row[col] = None
        elif col == "device_availability" and (val == "None" or str(val).strip().lower() == "none"):
            row[col] = None
        else:
            row[col] = val
    return row


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(f"Model file not found at: {MODEL_PATH}")
    model = joblib.load(MODEL_PATH)
    print(f"Loaded performiq_model.joblib ({type(model).__name__}) successfully.")
    yield


app = FastAPI(
    title="PerformIQ ML Service",
    description="Serves student exam score predictions using HistGradientBoosting pipeline.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StudentFeatures(BaseModel):
    # Allow arbitrary dictionary so missing fields default to None
    model_config = {"extra": "allow"}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "PerformIQ ML Service",
        "model_loaded": model is not None,
    }


@app.post("/predict")
def predict(features: Dict[str, Any]):
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded")

    try:
        row = clean_features(features)
        df = pd.DataFrame([row])

        # Run pipeline prediction and clip to 0-100 range
        raw_pred = model.predict(df)[0]
        score = float(np.clip(raw_pred, 0, 100))

        # Count how many features were missing / imputed
        missing_fields_count = sum(1 for v in row.values() if v is None)

        return {
            "success": True,
            "predicted_score": round(score, 2),
            "missing_fields_count": missing_fields_count,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")


@app.post("/predict-batch")
def predict_batch(items: list[Dict[str, Any]]):
    """
    Batch prediction endpoint for predicting multiple students at once.
    Cleans every row and handles device_availability == "None" identically.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded")

    try:
        rows = [clean_features(item) for item in items]
        df = pd.DataFrame(rows)

        raw_preds = model.predict(df)
        scores = np.clip(raw_preds, 0, 100)

        results = []
        for i, score in enumerate(scores):
            missing_count = sum(1 for v in rows[i].values() if v is None)
            results.append({
                "predicted_score": round(float(score), 2),
                "missing_fields_count": missing_count,
            })

        return {
            "success": True,
            "predictions": results,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Batch prediction error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
