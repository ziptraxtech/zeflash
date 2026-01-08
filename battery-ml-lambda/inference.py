import json
import os
from datetime import datetime, timezone
from decimal import Decimal

import boto3
import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from boto3.dynamodb.conditions import Key

# ---------- ENV ----------
BATTERY_TABLE_NAME = os.environ.get("BATTERY_TABLE_NAME", "BatteryChargingData")
DEVICE_KEY_NAME = os.environ.get("DEVICE_KEY_NAME", "device_id")
MODEL_DIR = os.environ.get("MODEL_DIR", "models")

AUTOENCODER_PATH = os.path.join(MODEL_DIR, "autoencoder_converted.h5")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
ISOFOREST_PATH = os.path.join(MODEL_DIR, "isolation_forest.pkl")
CONFIG_PATH = os.path.join(MODEL_DIR, "config.json")
FEATURE_NAMES_PATH = os.path.join(MODEL_DIR, "feature_names.json")

dynamodb = None
table = None
autoencoder = None
scaler = None
iso_forest = None
config = None
feature_names = None


def _load_models():
    global autoencoder, scaler, iso_forest, config, feature_names

    if autoencoder is not None:
        return

    autoencoder = tf.keras.models.load_model(AUTOENCODER_PATH, compile=False)
    autoencoder.compile(optimizer="adam", loss="mse")
    scaler = joblib.load(SCALER_PATH)
    iso_forest = joblib.load(ISOFOREST_PATH)

    with open(CONFIG_PATH) as f:
        config = json.load(f)

    with open(FEATURE_NAMES_PATH) as f:
        feature_names = json.load(f)


def _decimal_to_float(x):
    if isinstance(x, Decimal):
        return float(x)
    if isinstance(x, list):
        return [_decimal_to_float(v) for v in x]
    if isinstance(x, dict):
        return {k: _decimal_to_float(v) for k, v in x.items()}
    return x


def _fetch_data(device_id: str, minutes: int):
    """Fetch recent data from DynamoDB. Since device4 table has no device_id,
    we scan the entire table and filter by timestamp. device_id param is ignored."""
    global dynamodb, table

    if dynamodb is None:
        dynamodb = boto3.resource("dynamodb")
        table = dynamodb.Table(BATTERY_TABLE_NAME)

    # Calculate cutoff timestamp
    cutoff = int(datetime.now(timezone.utc).timestamp() - minutes * 60)

    # Scan table with timestamp filter (ts is partition key, so we scan)
    resp = table.scan()
    items = _decimal_to_float(resp.get("Items", []))
    
    # Handle pagination if needed
    while "LastEvaluatedKey" in resp:
        resp = table.scan(ExclusiveStartKey=resp["LastEvaluatedKey"])
        items.extend(_decimal_to_float(resp.get("Items", [])))

    if not items:
        return []

    # Filter by timestamp in memory
    df = pd.DataFrame(items)
    if "ts" in df.columns:
        df["ts"] = pd.to_numeric(df["ts"], errors="coerce")
        df = df[df["ts"] >= cutoff].sort_values("ts")

    return df.to_dict(orient="records")


def run_inference(device_id: str, minutes: int = 25) -> dict:
    _load_models()

    items = _fetch_data(device_id, minutes)

    if not items:
        return {
            "device_id": device_id,
            "status": "No Data",
            "summary": "No recent telemetry found.",
            "anomalies": {"critical": 0, "high": 0, "medium": 0, "low": 0},
            "recommended_actions": [],
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    df = pd.DataFrame(items)

    X = df[feature_names].dropna().values
    X_scaled = scaler.transform(X)

    recon = autoencoder.predict(X_scaled, verbose=0)
    recon_err = np.mean((X_scaled - recon) ** 2, axis=1)
    iso_preds = iso_forest.predict(X_scaled)

    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for r, i in zip(recon_err, iso_preds):
        if r > config["autoencoder_threshold"] or i == -1:
            counts["high"] += 1
        else:
            counts["low"] += 1

    status = "Stable" if counts["high"] == 0 else "Degradation Detected"

    return {
        "device_id": device_id,
        "status": status,
        "summary": "",
        "anomalies": counts,
        "recommended_actions": [],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }