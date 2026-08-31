"""
Landslide Early Warning System - ML Model Training Pipeline
Model: Random Forest Regressor for Landslide Risk Score Prediction (0 - 100)
Region: North Eastern Region (NER) Geospatial & Hydrological simulation
"""

import json
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, "model.joblib")
METADATA_PATH = os.path.join(MODEL_DIR, "feature_metadata.json")


def generate_synthetic_ner_terrain_data(n_samples: int = 6000, random_seed: int = 42) -> pd.DataFrame:
    """
    Generates a physically realistic synthetic hydrological & terrain dataset
    representative of the North Eastern Region of India (Meghalaya, Sikkim, Assam hills, Mizoram, Nagaland).
    """
    np.random.seed(random_seed)

    # 1. 24-hour rainfall (mm) - monsoon skewed
    rainfall_24h = np.random.gamma(shape=2.5, scale=28.0, size=n_samples)
    rainfall_24h = np.clip(rainfall_24h, 0.0, 320.0)

    # 2. 72-hour antecedent rainfall (mm)
    antecedent_ratio = np.random.uniform(1.3, 2.8, size=n_samples)
    rainfall_72h = np.clip(rainfall_24h * antecedent_ratio + np.random.normal(10, 5, size=n_samples), 0.0, 750.0)

    # 3. Slope angle (degrees) - hilly mountain terrain (0° to 60°)
    slope_deg = np.random.beta(a=3.2, b=2.8, size=n_samples) * 58.0 + np.random.uniform(0, 5, size=n_samples)
    slope_deg = np.clip(slope_deg, 2.0, 65.0)

    # 4. Volumetric Soil Moisture (fraction 0.05 to 0.95)
    # Soil moisture correlates with recent rainfall
    base_moisture = np.random.beta(a=2.5, b=2.5, size=n_samples) * 0.5 + 0.2
    rain_moisture_boost = (rainfall_72h / 500.0) * 0.35
    soil_moisture = np.clip(base_moisture + rain_moisture_boost + np.random.normal(0, 0.04, size=n_samples), 0.08, 0.96)

    # 5. NDVI / Vegetation Index (-0.1 to 0.9) - Higher vegetation stabilizes soil
    ndvi = np.random.beta(a=4.0, b=2.5, size=n_samples) * 0.85
    ndvi = np.clip(ndvi + np.random.normal(0, 0.05, size=n_samples), 0.02, 0.92)

    # 6. Historical Landslide Incidents in past 10 years (0 to 14)
    hist_prob = np.clip((slope_deg / 65.0) * 0.6 + (rainfall_72h / 600.0) * 0.4, 0, 1)
    historical_incidents = np.random.binomial(n=12, p=hist_prob * 0.5, size=n_samples)

    # -------------------------------------------------------------
    # Physical Landslide Instability Formula (Geotechnical Ground Truth)
    # -------------------------------------------------------------
    # Geotechnical factor formulation
    # Slope destabilization
    slope_factor = np.where(
        slope_deg < 15,
        slope_deg * 0.5,
        np.where(
            slope_deg < 30,
            7.5 + (slope_deg - 15) * 1.8,
            34.5 + np.power(np.maximum(slope_deg - 30, 0), 1.25) * 2.1
        )
    )

    # Pore-water pressure (Rainfall + Antecedent + Moisture)
    rain_factor = (rainfall_24h * 0.22) + (rainfall_72h * 0.08)
    moisture_factor = (soil_moisture * 45.0)

    # Vegetation mitigation factor
    veg_mitigation = (1.0 - (ndvi * 0.32))

    # Historical structural fragility factor
    history_factor = historical_incidents * 2.4

    # Composite Raw Landslide Risk
    raw_risk = (slope_factor * 0.40 + (rain_factor + moisture_factor) * 0.45 + history_factor) * veg_mitigation
    
    # Add geotechnical noise
    noise = np.random.normal(0, 2.5, size=n_samples)
    final_risk = raw_risk + noise

    # Normalize strictly to 0 - 100 scale
    risk_score = np.clip(final_risk, 0.0, 100.0)

    df = pd.DataFrame({
        "rainfall_24h": np.round(rainfall_24h, 2),
        "rainfall_72h": np.round(rainfall_72h, 2),
        "slope_deg": np.round(slope_deg, 2),
        "soil_moisture": np.round(soil_moisture, 3),
        "ndvi": np.round(ndvi, 3),
        "historical_incidents": historical_incidents,
        "risk_score": np.round(risk_score, 1)
    })

    return df


def train_and_export_model():
    print("[*] Generating synthetic North Eastern Region terrain dataset...")
    df = generate_synthetic_ner_terrain_data(n_samples=7000, random_seed=42)

    feature_cols = [
        "rainfall_24h",
        "rainfall_72h",
        "slope_deg",
        "soil_moisture",
        "ndvi",
        "historical_incidents"
    ]
    target_col = "risk_score"

    X = df[feature_cols]
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print(f"[*] Training Random Forest Regressor on {len(X_train)} samples...")
    model = RandomForestRegressor(
        n_estimators=120,
        max_depth=12,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    # Evaluation
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))

    print(f"[+] Model Evaluation Metrics:")
    print(f"    - R^2 Score: {r2:.4f}")
    print(f"    - MAE:       {mae:.2f}")
    print(f"    - RMSE:      {rmse:.2f}")

    # Feature Importances
    importances = model.feature_importances_
    feature_importance_dict = {
        feat: round(float(imp), 4) for feat, imp in zip(feature_cols, importances)
    }
    print("[+] Feature Importances:", json.dumps(feature_importance_dict, indent=2))

    # Save artifacts
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"[+] Serialized model saved to: {MODEL_PATH}")

    metadata = {
        "model_type": "RandomForestRegressor",
        "features": feature_cols,
        "n_estimators": 120,
        "metrics": {
            "r2_score": round(r2, 4),
            "mae": round(mae, 2),
            "rmse": round(rmse, 2)
        },
        "feature_importances": feature_importance_dict,
        "trained_date": "2026-08-25",
        "description": "Trained for SIH26001 Landslide Early Warning System (NER region)"
    }

    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"[+] Feature metadata saved to: {METADATA_PATH}")

    # Save sample dataset to data/ folder for reference & analytics
    data_csv_path = os.path.join(os.path.dirname(os.path.dirname(MODEL_DIR)), "..", "data", "ner_synthetic_landslide_dataset.csv")
    os.makedirs(os.path.dirname(data_csv_path), exist_ok=True)
    df.to_csv(data_csv_path, index=False)
    print(f"[+] Reference dataset saved to: {data_csv_path}")


if __name__ == "__main__":
    train_and_export_model()
