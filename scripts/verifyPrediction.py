"""
verifyPrediction.py
Verification script for Phase 3:
1. Samples 5 random rows from data/final_student_exam_performance.csv.
2. Compares direct Python prediction (joblib.load) vs FastAPI endpoint (POST http://127.0.0.1:8000/predict).
3. Tests a student profile with 15+ missing fields (null/None) to verify robust imputation.
"""

import json
import random
import urllib.request
import joblib
import numpy as np
import pandas as pd

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

MODEL_PATH = "ml-service/performiq_model.joblib"
CSV_PATH = "data/final_student_exam_performance.csv"
API_URL = "http://127.0.0.1:8000/predict"


def call_api(features_dict):
    """Sends JSON payload to the FastAPI /predict endpoint."""
    data = json.dumps(features_dict).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=5) as response:
        res_body = json.loads(response.read().decode("utf-8"))
        return res_body["predicted_score"]


def main():
    print("════════════════════════════════════════════════════════════════════════")
    print("  PerformIQ AI — Live Model Verification (Direct vs FastAPI Endpoint)")
    print("════════════════════════════════════════════════════════════════════════\n")

    # Load model directly
    print(f"Loading local model from {MODEL_PATH}...")
    model = joblib.load(MODEL_PATH)

    # Load CSV and select 5 random rows
    print(f"Sampling 5 random rows from {CSV_PATH}...\n")
    df = pd.read_csv(CSV_PATH)
    sample_indices = random.sample(range(len(df)), 5)
    samples = df.iloc[sample_indices]

    print("┌──────────────┬──────────────────┬─────────────────┬───────────┬─────────┐")
    print("│ Student ID   │ Direct Python ML │ FastAPI /predict│ Delta     │ Match?  │")
    print("├──────────────┼──────────────────┼─────────────────┼───────────┼─────────┤")

    all_matched = True

    for _, row in samples.iterrows():
        stu_id = row.get("student_id", "N/A")

        # 1. Direct Python Prediction
        row_dict = {col: (None if pd.isna(row[col]) else row[col]) for col in FEATURE_COLUMNS}
        input_df = pd.DataFrame([row_dict])
        direct_raw = model.predict(input_df)[0]
        direct_score = round(float(np.clip(direct_raw, 0, 100)), 2)

        # 2. FastAPI Endpoint Prediction
        api_score = call_api(row_dict)

        delta = round(abs(direct_score - api_score), 4)
        matched = delta < 0.01
        if not matched:
            all_matched = False

        status = "✅ PASS" if matched else "❌ FAIL"
        print(f"│ {stu_id:<12} │ {direct_score:>16.2f} │ {api_score:>15.2f} │ {delta:>9.4f} │ {status:<7} │")

    print("└──────────────┴──────────────────┴─────────────────┴───────────┴─────────┘")

    if all_matched:
        print("\n✅ Verification Successful: All 5 random rows match to 2 decimal places!\n")
    else:
        print("\n❌ Verification Failed: Discrepancy detected between direct and API predictions.\n")

    # ─────────────────────────────────────────────────────────────────────────
    # Verification: device_availability == "None" rows (keep_default_na=False)
    # ─────────────────────────────────────────────────────────────────────────
    print("════════════════════════════════════════════════════════════════════════")
    print("  Verification: device_availability == 'None' (keep_default_na=False)")
    print("  Testing parity between direct model (NaN-imputed) & FastAPI (cleaned)")
    print("════════════════════════════════════════════════════════════════════════\n")

    df_raw = pd.read_csv(CSV_PATH, keep_default_na=False)
    none_rows = df_raw[df_raw["device_availability"] == "None"]
    print(f"Total rows in CSV with literal device_availability == 'None': {len(none_rows)}")

    sample_none_indices = random.sample(range(len(none_rows)), 5)
    sample_none = none_rows.iloc[sample_none_indices]

    print("┌──────────────┬──────────────────┬─────────────────┬───────────┬─────────┐")
    print("│ Student ID   │ Direct (NaN/imp) │ FastAPI ('None')│ Delta     │ Match?  │")
    print("├──────────────┼──────────────────┼─────────────────┼───────────┼─────────┤")

    none_all_matched = True
    for _, row in sample_none.iterrows():
        stu_id = row.get("student_id", "N/A")

        # 1. Direct Python Prediction: simulate how pandas parsed it during training (None converted to NaN/None)
        direct_dict = {}
        for col in FEATURE_COLUMNS:
            v = row[col]
            if v == "" or (col == "device_availability" and v == "None"):
                direct_dict[col] = None
            else:
                direct_dict[col] = v
        direct_df = pd.DataFrame([direct_dict])
        direct_raw = model.predict(direct_df)[0]
        direct_score = round(float(np.clip(direct_raw, 0, 100)), 2)

        # 2. FastAPI Endpoint Prediction: sends raw dict where device_availability == "None"
        api_dict = {col: (None if row[col] == "" else row[col]) for col in FEATURE_COLUMNS}
        api_score = call_api(api_dict)

        delta = round(abs(direct_score - api_score), 4)
        matched = delta < 0.01
        if not matched:
            none_all_matched = False

        status = "✅ PASS" if matched else "❌ FAIL"
        print(f"│ {stu_id:<12} │ {direct_score:>16.2f} │ {api_score:>15.2f} │ {delta:>9.4f} │ {status:<7} │")

    print("└──────────────┴──────────────────┴─────────────────┴───────────┴─────────┘")

    if none_all_matched:
        print("\n✅ device_availability == 'None' Verification Successful: All rows match perfectly!\n")
    else:
        print("\n❌ device_availability == 'None' Verification Failed.\n")

    # ─────────────────────────────────────────────────────────────────────────
    # Test with 15+ missing fields
    # ─────────────────────────────────────────────────────────────────────────
    print("════════════════════════════════════════════════════════════════════════")
    print("  Test: Student with 15 Missing (Null) Fields")
    print("════════════════════════════════════════════════════════════════════════\n")

    sparse_student = {
        "age": 19,
        "gender": "Female",
        "education_level": "High School",
        "school_type": "Public",
        "previous_exam_score": 68.5,
        "study_hours_per_day": 3.0,
        "class_participation": "Medium",
        "exam_difficulty": "Medium",
        # Explicitly 15+ missing fields
        "parent_education": None,
        "family_income": None,
        "urban_rural": None,
        "previous_gpa": None,
        "attendance_percentage": None,
        "assignment_completion_rate": None,
        "self_study_hours": None,
        "private_tuition": None,
        "online_learning_hours": None,
        "study_consistency": None,
        "study_environment": None,
        "study_method": None,
        "revision_frequency": None,
        "practice_tests_completed": None,
        "notes_quality": None,
        "sleep_hours": None,
        "sleep_quality": None,
        "daily_screen_time": None,
        "physical_activity_hours": None,
        "break_frequency": None,
        "stress_level": None,
        "motivation_level": None,
        "internet_access": None,
        "device_availability": None,
        "educational_app_usage": None,
        "online_course_hours": None,
        "exam_preparation_days": None,
        "time_management_score": None,
        "exam_anxiety_level": None,
    }

    missing_count = sum(1 for v in sparse_student.values() if v is None)
    print(f"Total features sent: {len(sparse_student)}")
    print(f"Missing (null) features count: {missing_count} (out of 37)")

    # Direct predict
    sparse_df = pd.DataFrame([sparse_student])
    sparse_direct = round(float(np.clip(model.predict(sparse_df)[0], 0, 100)), 2)

    # API predict
    sparse_api = call_api(sparse_student)

    print(f"Direct prediction with {missing_count} null fields:  {sparse_direct}")
    print(f"FastAPI /predict prediction:              {sparse_api}")
    print(f"Score is within realistic bounds [0-100]: {0 <= sparse_api <= 100}")
    print(f"Result: {'✅ ROBUST & IDENTICAL' if abs(sparse_direct - sparse_api) < 0.01 else '❌ DISCREPANCY'}\n")


if __name__ == "__main__":
    main()
