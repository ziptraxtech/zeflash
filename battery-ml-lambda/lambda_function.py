import json
import os
from datetime import datetime, timezone
from decimal import Decimal

import boto3
import numpy as np
import pandas as pd
import joblib
import tensorflow as tf
from boto3.dynamodb.conditions import Key

# ---------- ENVIRONMENT VARIABLES ----------
BATTERY_TABLE_NAME = os.environ.get("BATTERY_TABLE_NAME", "BatteryChargingData")
DEVICE_KEY_NAME = os.environ.get("DEVICE_KEY_NAME", "device_id")

MODEL_DIR = os.environ.get("MODEL_DIR", "models")

AUTOENCODER_PATH = os.path.join(MODEL_DIR, "autoencoder_best.h5")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
ISOFOREST_PATH = os.path.join(MODEL_DIR, "isolation_forest.pkl")
CONFIG_PATH = os.path.join(MODEL_DIR, "config.json")
FEATURE_NAMES_PATH = os.path.join(MODEL_DIR, "feature_names.json")

FRONTEND_ORIGIN = os.environ.get(
    "FRONTEND_ORIGIN",
    "https://your-frontend-domain.com"  # change in Lambda config later
)

# ---------- LOAD MODELS AT INIT (cold start only) ----------
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(BATTERY_TABLE_NAME)

# Load models into memory once per container
autoencoder = tf.keras.models.load_model(AUTOENCODER_PATH)
scaler = joblib.load(SCALER_PATH)
iso_forest = joblib.load(ISOFOREST_PATH)

with open(CONFIG_PATH, "r") as f:
    config = json.load(f)

with open(FEATURE_NAMES_PATH, "r") as f:
    feature_names = json.load(f)

# Hyperparameters and thresholds from config
ROLL_WIN = int(config.get("hyperparameters", {}).get("roll_win", 5))
ae_threshold = float(config.get("autoencoder_threshold", 0.0))

current_thr = config.get("current_thresholds", {})
temp_thr = config.get("temperature_thresholds", {})


# ---------- HELPERS ----------

def decimal_to_float(item):
    """Recursively convert Decimal to float in DynamoDB response."""
    if isinstance(item, list):
        return [decimal_to_float(v) for v in item]
    if isinstance(item, dict):
        return {k: decimal_to_float(v) for k, v in item.items()}
    if isinstance(item, Decimal):
        return float(item)
    return item


def fetch_recent_data(device_id: str, minutes: int = 25):
    """
    Fetch last `minutes` worth of data for a given device_id.
    Assumes partition key = DEVICE_KEY_NAME (e.g. 'device_id'),
    sort key = 'ts' (number, epoch seconds).
    """
    now_ts = int(datetime.now(timezone.utc).timestamp())
    from_ts = now_ts - minutes * 60

    # Query by device and ts range
    resp = table.query(
        KeyConditionExpression=Key(DEVICE_KEY_NAME).eq(device_id) & Key("ts").between(from_ts, now_ts)
    )
    items = resp.get("Items", [])
    return decimal_to_float(items)


def build_features(items):
    """
    Given raw items from DynamoDB, build feature matrix X and
    a base_stats DataFrame with current & temp for severity logic.
    """
    if not items:
        raise ValueError("No data points found for the given device in the recent window.")

    df = pd.DataFrame(items)

    # Ensure columns exist
    for col in ["ts", "current", "temperature"]:
        if col not in df.columns:
            raise ValueError(f"Missing column '{col}' in data.")

    # Sort by timestamp
    df["ts"] = pd.to_numeric(df["ts"], errors="coerce")
    df = df.sort_values("ts")

    # Numeric conversion
    df["current"] = pd.to_numeric(df["current"], errors="coerce")
    df["temperature"] = pd.to_numeric(df["temperature"], errors="coerce")

    # Clip negative current to 0
    df["current"] = df["current"].clip(lower=0)

    # Time features
    df["ts_dt"] = pd.to_datetime(df["ts"], unit="s", utc=True)
    df["delta_t"] = df["ts_dt"].diff().dt.total_seconds()
    df.loc[df["delta_t"] == 0, "delta_t"] = np.nan

    # Rolling features - current
    df["current_roll_mean"] = df["current"].rolling(ROLL_WIN).mean()
    df["current_roll_std"] = df["current"].rolling(ROLL_WIN).std()
    df["current_roll_min"] = df["current"].rolling(ROLL_WIN).min()
    df["current_roll_max"] = df["current"].rolling(ROLL_WIN).max()

    # Rolling features - temperature
    df["temp_roll_mean"] = df["temperature"].rolling(ROLL_WIN).mean()
    df["temp_roll_std"] = df["temperature"].rolling(ROLL_WIN).std()

    # Rates
    df["current_rate"] = df["current"].diff() / df["delta_t"]
    df["temp_rate"] = df["temperature"].diff() / df["delta_t"]

    # Lag features
    df["current_lag1"] = df["current"].shift(1)
    df["temp_lag1"] = df["temperature"].shift(1)

    # Ratio & product
    df["current_temp_ratio"] = df["current"] / df["temperature"].replace(0, np.nan)
    df["current_temp_product"] = df["current"] * df["temperature"]

    # Keep only rows that have all features
    df = df.dropna(subset=feature_names)

    if df.empty:
        raise ValueError("Not enough data points to compute features. Try a longer window or ensure regular sampling.")

    X = df[feature_names].values
    base_stats = df[["current", "temperature"]].reset_index(drop=True)

    return X, base_stats


def classify_anomalies(recon_errors, iso_preds, base_stats):
    """
    Using reconstruction error, IsolationForest predictions,
    and base stats, classify each point into severity buckets.
    """
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    severities = []

    for i in range(len(recon_errors)):
        re = recon_errors[i]
        iso_anom = (iso_preds[i] == -1)
        curr = base_stats.loc[i, "current"]
        temp = base_stats.loc[i, "temperature"]

        is_auto_anom = re > ae_threshold
        severity = "low"

        if iso_anom or is_auto_anom:
            temp_uc = temp_thr.get("upper_critical", 80)
            temp_uw = temp_thr.get("upper_warning", 70)
            temp_lw = temp_thr.get("lower_warning", 40)

            curr_uc = current_thr.get("upper_critical", 100)
            curr_uw = current_thr.get("upper_warning", 2)
            curr_lw = current_thr.get("lower_warning", 0)

            if temp >= temp_uc or curr >= curr_uc:
                severity = "critical"
            elif temp >= temp_uw or curr >= curr_uw:
                severity = "high"
            elif temp >= temp_lw or curr >= curr_lw:
                severity = "medium"
            else:
                severity = "low"

        severities.append(severity)
        counts[severity] += 1

    return counts, severities


def overall_status_from_counts(counts):
    crit = counts.get("critical", 0)
    high = counts.get("high", 0)
    med = counts.get("medium", 0)

    if crit > 0 or high > 3:
        return "Immediate Action Required"
    if high > 0 or med > 5:
        return "Degradation Accelerating"
    if med > 0:
        return "Moderate Irregularities"
    return "Stable"


def summary_and_actions(status, counts):
    crit = counts.get("critical", 0)
    high = counts.get("high", 0)
    med = counts.get("medium", 0)
    low = counts.get("low", 0)

    if status == "Immediate Action Required":
        summary = (
            "Multiple high-severity anomalies were detected during this charging session. "
            "The battery is exhibiting behavior that requires immediate attention."
        )
        actions = [
            "Stop using the vehicle for high-load trips until a detailed inspection is done.",
            "Schedule a battery health diagnostic with a certified service center.",
            "Avoid fast charging until the issue is investigated."
        ]
    elif status == "Degradation Accelerating":
        summary = (
            "Anomaly patterns suggest that battery degradation is accelerating. "
            "While the battery is still usable, its long-term health is at risk."
        )
        actions = [
            "Reduce exposure to high temperatures during charging and operation.",
            "Avoid frequent fast-charging sessions in a short duration.",
            "Plan a preventive battery checkup within the next few weeks."
        ]
    elif status == "Moderate Irregularities":
        summary = (
            "Some irregularities were detected, but they are not yet critical. "
            "Battery health should be monitored over upcoming sessions."
        )
        actions = [
            "Monitor future charging sessions with regular diagnostics.",
            "Avoid charging immediately after high-load driving when the pack is hot."
        ]
    else:
        summary = (
            "No significant anomalies detected in this session. "
            "The battery behavior appears consistent with healthy operation."
        )
        actions = [
            "Continue using standard charging practices.",
            "Re-run diagnostics periodically to track long-term health."
        ]

    summary += f" (Anomaly counts — Critical: {crit}, High: {high}, Medium: {med}, Low: {low}.)"
    return summary, actions


def make_response(status_code, body_dict):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,x-api-key",
            "Access-Control-Allow-Methods": "OPTIONS,POST"
        },
        "body": json.dumps(body_dict)
    }


# ---------- LAMBDA HANDLER ----------

def lambda_handler(event, context):
    try:
        # Parse incoming body
        if "body" in event and isinstance(event["body"], str):
            body = json.loads(event["body"] or "{}")
        else:
            body = event.get("body", {}) or {}

        device_id = body.get("device_id")

        if not device_id:
            return make_response(400, {"error": "device_id is required"})

        # Fetch recent data from DynamoDB
        items = fetch_recent_data(device_id=device_id, minutes=25)

        # Build features
        X_raw, base_stats = build_features(items)

        # Scale
        X_scaled = scaler.transform(X_raw)

        # Autoencoder inference
        recon = autoencoder.predict(X_scaled, verbose=0)
        recon_errors = np.mean(np.square(X_scaled - recon), axis=1)

        # Isolation Forest
        iso_preds = iso_forest.predict(X_scaled)

        # Severity classification
        counts, _ = classify_anomalies(recon_errors, iso_preds, base_stats)

        # High-level status + explanation
        status = overall_status_from_counts(counts)
        summary, actions = summary_and_actions(status, counts)

        result = {
            "device_id": device_id,
            "status": status,
            "summary": summary,
            "anomalies": counts,
            "recommended_actions": actions,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }

        return make_response(200, result)

    except Exception as e:
        print("Error in lambda_handler:", str(e))
        return make_response(500, {
            "error": "Internal server error",
            "details": str(e)
        })