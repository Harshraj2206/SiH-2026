"""
LandSafe landslide model training (real data).

Data: backend/data/real_landslide_training.csv, built by build_real_dataset.py from the
NASA Global Landslide Catalog (India, rain-triggered), ERA5 rainfall/soil moisture and the
Copernicus DEM. NDVI is not a model input: historical NDVI for every sample is not available.

Evaluation: spatial cross-validation. Samples are grouped by 1-degree grid cell so a test
fold never shares a location with its training folds (random splits would leak the place).

Run from the repo root:  python -m backend.app.ml.train_model
"""

import json
import os
from datetime import date

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (average_precision_score, confusion_matrix, f1_score,
                             precision_score, recall_score, roc_auc_score)
from sklearn.model_selection import GroupKFold

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, "model.joblib")
METADATA_PATH = os.path.join(MODEL_DIR, "feature_metadata.json")
DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(MODEL_DIR)), "data", "real_landslide_training.csv")

BASE_FEATURES = ["rainfall_24h", "rainfall_72h", "slope_deg", "soil_moisture",
                 "historical_incidents", "elevation_amsl"]
ENGINEERED_FEATURES = ["antecedent_rain_index", "pore_slope_interaction"]
FEATURES = BASE_FEATURES + ENGINEERED_FEATURES


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Same formulas as predictor.py at inference time."""
    X = df[BASE_FEATURES].astype(float).copy()
    slope_rad = np.radians(np.clip(X["slope_deg"].values, 0.0, 85.0))
    X["antecedent_rain_index"] = np.round(0.70 * X["rainfall_24h"] + 0.30 * X["rainfall_72h"], 2)
    X["pore_slope_interaction"] = np.round(X["soil_moisture"] * np.tan(slope_rad), 4)
    return X[FEATURES]


# More rain, wetter soil or a steeper slope must never lower the score. The data is too sparse at
# the extremes to learn this alone; the constraint costs ~0.01 ROC-AUC in spatial CV.
MONOTONIC_INCREASING = {"rainfall_24h", "rainfall_72h", "antecedent_rain_index",
                        "soil_moisture", "slope_deg", "pore_slope_interaction"}


def new_model() -> RandomForestClassifier:
    return RandomForestClassifier(n_estimators=200, min_samples_leaf=10, class_weight="balanced",
                                  monotonic_cst=[1 if f in MONOTONIC_INCREASING else 0 for f in FEATURES],
                                  random_state=42, n_jobs=-1)


def main():
    df = pd.read_csv(DATA_PATH)
    df = df[df["elevation_amsl"] > 0].reset_index(drop=True)  # drop points that fell in the sea
    X = engineer_features(df)
    y = df["landslide_occurrence"].astype(int).values
    groups = (np.floor(df["latitude"]).astype(int).astype(str) + "_" +
              np.floor(df["longitude"]).astype(int).astype(str)).values

    oof = np.zeros(len(df))
    for train_idx, test_idx in GroupKFold(n_splits=5).split(X, y, groups):
        m = new_model().fit(X.iloc[train_idx], y[train_idx])
        oof[test_idx] = m.predict_proba(X.iloc[test_idx])[:, 1]

    pred = (oof >= 0.5).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred).ravel()
    metrics = {
        "evaluation": "5-fold spatial cross-validation (1-degree grid cells held out)",
        "roc_auc": round(float(roc_auc_score(y, oof)), 4),
        "pr_auc": round(float(average_precision_score(y, oof)), 4),
        "precision": round(float(precision_score(y, pred)) * 100, 2),
        "recall": round(float(recall_score(y, pred)) * 100, 2),
        "f1_score": round(float(f1_score(y, pred)) * 100, 2),
        "false_negative_rate": round(float(fn / max(1, fn + tp)) * 100, 2),
        "confusion_matrix": {"true_positive": int(tp), "false_positive": int(fp),
                             "true_negative": int(tn), "false_negative": int(fn)},
    }
    by_kind = {k: round(float(oof[(df["kind"] == k).values].mean()) * 100, 1) for k in df["kind"].unique()}

    model = new_model().fit(X, y)
    joblib.dump(model, MODEL_PATH)

    metadata = {
        "model_type": "RandomForestClassifier",
        "constraints": "score never decreases as rainfall, soil moisture or slope increase",
        "training_dataset": "NASA Global Landslide Catalog (India, rain-triggered) + ERA5 rainfall/soil moisture + Copernicus DEM",
        "dataset_size": int(len(df)),
        "positives": int(y.sum()),
        "negatives": int(len(y) - y.sum()),
        "negative_sampling": "temporal (same place, same season, other year) and spatial (same day, 15-60 km away), both with no catalogued landslide nearby",
        "features": FEATURES,
        "base_features": BASE_FEATURES,
        "engineered_features": ENGINEERED_FEATURES,
        "not_used": {"ndvi": "historical NDVI per sample not available; shown for context only"},
        "score_meaning": "Model probability x 100 from a 1:2 landslide:non-landslide training set; a relative risk score, not a calibrated real-world probability.",
        "metrics": metrics,
        "mean_oof_score_by_sample_kind": by_kind,
        "feature_importances": {f: round(float(v), 4) for f, v in zip(FEATURES, model.feature_importances_)},
        "trained_date": date.today().isoformat(),
    }
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print(json.dumps({k: metadata[k] for k in ("dataset_size", "positives", "metrics",
                                               "mean_oof_score_by_sample_kind", "feature_importances")}, indent=2))


if __name__ == "__main__":
    main()
