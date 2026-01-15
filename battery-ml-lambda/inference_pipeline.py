"""
Inference Pipeline: Fetch live battery data → Run ML model → Save results to S3

This script:
1. Fetches battery data from the active API (configured in config.json)
2. Preprocesses and builds features
3. Runs autoencoder + isolation forest inference
4. Classifies anomalies and generates status
5. Creates visualization chart
6. Uploads results to S3
"""

import io
import os
import json
import argparse
from datetime import datetime, timezone
from typing import Optional, Tuple, Dict
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

# Suppress TensorFlow warnings and info messages
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # 0=all, 1=no INFO, 2=no WARNING, 3=no INFO/WARNING/ERROR
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Disable oneDNN custom ops to suppress warnings

import warnings
warnings.filterwarnings('ignore', category=UserWarning)
warnings.filterwarnings('ignore', category=DeprecationWarning)
warnings.filterwarnings('ignore', category=FutureWarning)

import boto3
import numpy as np
import pandas as pd
import joblib
try:
    import tensorflow as tf
    # Suppress TensorFlow logging
    tf.get_logger().setLevel('ERROR')
    import logging
    logging.getLogger('tensorflow').setLevel(logging.ERROR)
    logging.getLogger('keras').setLevel(logging.ERROR)
    TF_AVAILABLE = True
except Exception as e:
    print(f"[WARN] TensorFlow not available: {e}")
    TF_AVAILABLE = False
    tf = None
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# ============ CONFIG ============
MODEL_DIR = "models"
AUTOENCODER_PATH = os.path.join(MODEL_DIR, "autoencoder_best.h5")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
ISOFOREST_PATH = os.path.join(MODEL_DIR, "isolation_forest.pkl")
CONFIG_PATH = os.path.join(MODEL_DIR, "config.json")
FEATURE_NAMES_PATH = os.path.join(MODEL_DIR, "feature_names.json")

# S3 Configuration
S3_BUCKET = os.environ.get("S3_BUCKET", "battery-ml-results-070872471952")
S3_PREFIX = os.environ.get("S3_PREFIX", "battery-reports/")

# ============ LOAD MODELS ============
print("Loading models...")

# Build autoencoder from scratch (model was trained with Keras 3.x, we use TF 2.x)
def build_autoencoder(input_dim=14):
    """Rebuild the autoencoder architecture."""
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(32, activation=None, input_dim=input_dim),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.LeakyReLU(alpha=0.2),
        tf.keras.layers.Dropout(0.25),
        
        tf.keras.layers.Dense(16),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.LeakyReLU(alpha=0.2),
        tf.keras.layers.Dropout(0.25),
        
        tf.keras.layers.Dense(8),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.LeakyReLU(alpha=0.2),
        
        # Decoder
        tf.keras.layers.Dense(16),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.LeakyReLU(alpha=0.2),
        tf.keras.layers.Dropout(0.25),
        
        tf.keras.layers.Dense(32),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.LeakyReLU(alpha=0.2),
        tf.keras.layers.Dropout(0.25),
        
        tf.keras.layers.Dense(input_dim)
    ])
    model.compile(optimizer='adam', loss='mse')
    return model

if TF_AVAILABLE:
    print("Building autoencoder architecture...")
    autoencoder = build_autoencoder(14)

    print("Loading weights from saved model...")
    try:
        # Try to load just the weights
        autoencoder.load_weights(AUTOENCODER_PATH)
    except Exception as e:
        print(f"[WARN] Could not load weights from HDF5: {str(e)}")
        print("Will use model for inference only without pre-trained weights")
else:
    autoencoder = None

scaler = joblib.load(SCALER_PATH)
iso_forest = joblib.load(ISOFOREST_PATH)

with open(CONFIG_PATH, "r") as f:
    config = json.load(f)

with open(FEATURE_NAMES_PATH, "r") as f:
    feature_names = json.load(f)

# Hyperparameters
ROLL_WIN = int(config.get("hyperparameters", {}).get("roll_win", 5))
ae_threshold = float(config.get("autoencoder_threshold", 0.0))
current_thr = config.get("current_thresholds", {})
temp_thr = config.get("temperature_thresholds", {})

s3_client = boto3.client("s3")

print("[OK] Models loaded successfully\n")


# ============ FUNCTIONS ============

def fetch_data_from_api(api_url: str, auth_token: Optional[str] = None, limit: int = 10, auth_scheme: str = "Bearer") -> list:
    """Fetch battery data from the active API.

    Parameters:
    - api_url: Fully-qualified URL to call
    - auth_token: Token string without scheme unless already prefixed (e.g. "abc" or "Basic abc...")
    - limit: Number of records to request (will override any limit in URL)
    - auth_scheme: "Bearer" or "Basic"; ignored if auth_token already includes a scheme
    """
    # Update limit parameter in URL
    if '&limit=' in api_url:
        api_url = api_url.rsplit('&limit=', 1)[0] + f'&limit={limit}'
    elif '?limit=' in api_url:
        api_url = api_url.rsplit('?limit=', 1)[0] + f'?limit={limit}'
    else:
        api_url = api_url + f'&limit={limit}' if '?' in api_url else api_url + f'?limit={limit}'
    
    print(f"Fetching {limit} latest documents from API...")
    print(f"URL: {api_url}\n")
    print(f"Auth scheme: {auth_scheme}")
    print(f"Auth token (first 20 chars): {auth_token[:20] if auth_token else 'None'}...\n")
    try:
        headers = {}
        if auth_token:
            # If token already includes scheme, use as-is; else apply provided scheme
            if any(auth_token.strip().startswith(prefix) for prefix in ("Bearer ", "Basic ", "basic ")):
                headers['Authorization'] = auth_token.strip()
                print(f"Using token as-is: {auth_token[:30]}...")
            else:
                headers['Authorization'] = f'{auth_scheme} {auth_token.strip()}'
                print(f"Applied scheme: {headers['Authorization'][:30]}...")
        
        print(f"Request headers: {headers}\n")
        
        req = Request(api_url, headers=headers)
        with urlopen(req, timeout=30) as response:
            raw_response = response.read().decode('utf-8')
            print(f"Raw API response (first 500 chars):\n{raw_response[:500]}\n")
            data = json.loads(raw_response)
        
        print(f"Parsed JSON type: {type(data)}")
        if isinstance(data, dict):
            print(f"JSON keys: {list(data.keys())}")
        
        # Handle different response formats
        if isinstance(data, dict):
            if "data" in data and isinstance(data["data"], list):
                items = data["data"]
            elif "Items" in data:
                items = data["Items"]
            elif "records" in data:
                items = data["records"]
            elif "result" in data:
                items = data["result"] if isinstance(data["result"], list) else [data["result"]]
            else:
                # Try to find first list in response
                for key, value in data.items():
                    if isinstance(value, list):
                        items = value
                        print(f"Using list from key: {key}")
                        break
                else:
                    items = [data]
        elif isinstance(data, list):
            items = data
        else:
            items = [data]
        
        print(f"[OK] Fetched {len(items)} data points from API")
        if items:
            print(f"  Sample item keys: {list(items[0].keys()) if isinstance(items[0], dict) else 'N/A'}\n")
        return items
    except Exception as e:
        print(f"[ERROR] Error fetching from API: {str(e)}\n")
        raise


def build_features(items: list) -> Tuple[np.ndarray, pd.DataFrame]:
    """Build feature matrix from raw data items."""
    if not items:
        raise ValueError("No data points available")

    # Transform API response to standard format
    transformed_items = []
    for item in items:
        transformed = {}
        
        # Map timestamp
        if 'ts' in item:
            transformed['ts'] = item['ts']
        elif 'createdat' in item:
            # Convert ISO string to epoch seconds
            from datetime import datetime
            try:
                dt = datetime.fromisoformat(item['createdat'].replace('Z', '+00:00'))
                transformed['ts'] = int(dt.timestamp())
            except:
                continue
        elif 'date' in item:
            from datetime import datetime
            try:
                dt = datetime.fromisoformat(item['date'].replace('Z', '+00:00'))
                transformed['ts'] = int(dt.timestamp())
            except:
                continue
        else:
            continue
        
        # Extract measurements from complex nested payload
        current_value = None
        temperature_value = None
        
        if 'payload' in item and isinstance(item['payload'], list):
            # Flatten the nested key-value structure
            payload = item['payload']
            for payload_item in payload:
                if isinstance(payload_item, dict) and payload_item.get('Key') == 'meterValue':
                    meter_values = payload_item.get('Value', [])
                    if isinstance(meter_values, list) and meter_values:
                        meter_value = meter_values[0]  # First meter value
                        if isinstance(meter_value, list):
                            for meter_field in meter_value:
                                if isinstance(meter_field, dict) and meter_field.get('Key') == 'sampledValue':
                                    sampled_values = meter_field.get('Value', [])
                                    if isinstance(sampled_values, list):
                                        for sample in sampled_values:
                                            if isinstance(sample, list):
                                                measurand = None
                                                value = None
                                                for field in sample:
                                                    if isinstance(field, dict):
                                                        if field.get('Key') == 'measurand':
                                                            measurand = field.get('Value', '')
                                                        elif field.get('Key') == 'value':
                                                            value = field.get('Value', '')
                                                
                                                if measurand and value:
                                                    try:
                                                        if 'Current.Import' in measurand:
                                                            current_value = float(value.strip())
                                                        elif 'Temperature' in measurand:
                                                            temperature_value = float(value.strip())
                                                    except:
                                                        pass
        
        transformed['current'] = current_value if current_value is not None else 0.0
        transformed['temperature'] = temperature_value if temperature_value is not None else 50.0
        
        if all(k in transformed for k in ['ts', 'current', 'temperature']):
            transformed_items.append(transformed)
    
    if not transformed_items:
        if items:
            print(f"Sample raw item:\n{json.dumps(items[0], indent=2, default=str)[:800]}")
        raise ValueError(f"Could not extract required fields from {len(items)} items. Check data format.")

    df = pd.DataFrame(transformed_items)
    
    # Ensure columns exist
    for col in ["ts", "current", "temperature"]:
        if col not in df.columns:
            raise ValueError(f"Missing column '{col}' in data.")

    # Convert to numeric
    df["ts"] = pd.to_numeric(df["ts"], errors="coerce")
    df["current"] = pd.to_numeric(df["current"], errors="coerce")
    df["temperature"] = pd.to_numeric(df["temperature"], errors="coerce")
    
    # Remove rows with NaN
    df = df.dropna(subset=["ts", "current", "temperature"])
    
    if df.empty:
        raise ValueError("No valid data after transformation")
    
    # Sort by timestamp
    df = df.sort_values("ts")
    
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

    # Keep only rows with all features
    df = df.dropna(subset=feature_names)

    if df.empty:
        raise ValueError("Not enough data points to compute features")

    X = df[feature_names].values
    base_stats = df[["current", "temperature"]].reset_index(drop=True)

    print(f"[OK] Built features: shape {X.shape}")
    return X, base_stats


def classify_anomalies(recon_errors: np.ndarray, iso_preds: np.ndarray, 
                      base_stats: pd.DataFrame) -> Tuple[Dict, list]:
    """Classify anomalies by severity."""
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
            curr_uc = current_thr.get("upper_critical", 100)
            curr_uw = current_thr.get("upper_warning", 2)

            if temp >= temp_uc or curr >= curr_uc:
                severity = "critical"
            elif temp >= temp_uw or curr >= curr_uw:
                severity = "high"
            else:
                severity = "medium"

        severities.append(severity)
        counts[severity] += 1

    return counts, severities


def get_overall_status(counts: Dict) -> str:
    """Determine overall battery status."""
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


def generate_visualization(result: Dict, device_id: str) -> io.BytesIO:
    """Generate anomaly visualization chart."""
    anomalies = result["anomalies"]
    status = result["status"]

    labels = list(anomalies.keys())
    values = [anomalies.get(k, 0) for k in labels]
    colors = ["#d32f2f", "#f57c00", "#fbc02d", "#388e3c"]

    fig, ax = plt.subplots(figsize=(8, 5), facecolor='white')
    bars = ax.bar(labels, values, color=colors, edgecolor='black', linewidth=1.5)
    
    ax.set_title(f"Battery Anomaly Detection - {device_id}", fontsize=14, fontweight='bold', pad=20)
    ax.set_ylabel("Count", fontsize=12, fontweight='bold')
    ax.set_xlabel("Severity Level", fontsize=12, fontweight='bold')
    
    # Add value labels on bars
    for bar in bars:
        height = bar.get_height()
        if height > 0:
            ax.text(bar.get_x() + bar.get_width()/2, height,
                   f'{int(height)}',
                   ha='center', va='bottom', fontweight='bold', fontsize=11)

    # Add status text
    status_color = {
        "Immediate Action Required": "#d32f2f",
        "Degradation Accelerating": "#f57c00",
        "Moderate Irregularities": "#fbc02d",
        "Stable": "#388e3c"
    }
    
    ax.text(0.98, 0.97, f"Status: {status}", 
            transform=ax.transAxes,
            fontsize=12, fontweight='bold',
            color='white',
            bbox=dict(boxstyle='round', facecolor=status_color.get(status, '#333'), alpha=0.8),
            ha='right', va='top')

    ax.grid(axis='y', alpha=0.3, linestyle='--')
    ax.set_ylim(0, max(values) * 1.15 if values else 1)
    
    fig.tight_layout()
    
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    
    return buf


def upload_to_s3(buf: io.BytesIO, device_id: str, result: Dict) -> Tuple[str, str]:
    """Upload visualization to S3 and return key and URL."""
    # Use fixed filename instead of timestamp so frontend can always find it
    filename = "battery_health_report.png"
    key = f"{S3_PREFIX.rstrip('/')}/{device_id}/{filename}"

    print(f"Uploading to S3: {key}")
    
    try:
        # Upload with public-read ACL
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=buf.getvalue(),
            ContentType="image/png",
            ACL='public-read',  # Make object publicly readable
            Metadata={
                "status": result["status"],
                "device_id": device_id,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
        )
        print(f"[OK] Uploaded to S3 (public-read)")
    except Exception as e:
        print(f"[WARN] Could not set public-read ACL: {str(e)}")
        print("Uploading without ACL...")
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=buf.getvalue(),
            ContentType="image/png",
            Metadata={
                "status": result["status"],
                "device_id": device_id,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
        )

    # Generate presigned URL with longer expiration (7 days)
    url = s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": key},
        ExpiresIn=604800,  # 7 days
    )
    
    # Also generate direct public URL
    public_url = f"https://{S3_BUCKET}.s3.amazonaws.com/{key}"

    print(f"[OK] Uploaded to S3: {key}")
    print(f"  - Presigned URL (7 days): {url[:80]}...")
    print(f"  - Public URL: {public_url}\n")
    
    return key, url


def build_cms_time_lapsed_url(evse_id: str, connector_id: int = 1, page: int = 1, limit: int = 10,
                              role: str = "Admin", operator: str = "All") -> str:
    """Construct the CMS time_lapsed API URL for a specific EVSE and connector.

    Example endpoint:
    https://cms.charjkaro.in/commands/secure/api/v1/get/charger/time_lapsed?role=Admin&operator=All&evse_id=032300130C03064&connector_id=1&page=1&limit=10
    """
    base = "https://cms.charjkaro.in/commands/secure/api/v1/get/charger/time_lapsed"
    return (
        f"{base}?role={role}&operator={operator}"
        f"&evse_id={evse_id}&connector_id={connector_id}&page={page}&limit={limit}"
    )


def run_inference_pipeline(device_id: str, api_url: Optional[str] = None, 
                          auth_token: Optional[str] = None, limit: int = 10, auth_scheme: str = "Bearer") -> Dict:
    """Main inference pipeline."""
    print("=" * 70)
    print(f"BATTERY ML INFERENCE PIPELINE - {device_id}")
    print("=" * 70 + "\n")

    # Step 1: Fetch data
    if api_url is None:
        # Get API URL from config for the device
        if device_id in config.get("devices", []):
            idx = config["devices"].index(device_id)
            api_url = config["api_endpoints"][idx]
        else:
            raise ValueError(f"Device {device_id} not found in config")

    # If using CMS URL, derive a friendly label for S3/device_id
    try:
        if "cms.charjkaro.in" in api_url:
            from urllib.parse import urlparse, parse_qs
            qs = parse_qs(urlparse(api_url).query)
            evse = qs.get("evse_id", [None])[0]
            conn = qs.get("connector_id", [None])[0]
            if evse:
                device_id = f"{evse}{('_' + conn) if conn else ''}"
    except Exception:
        pass

    items = fetch_data_from_api(api_url, auth_token, limit, auth_scheme)

    # Step 2: Build features
    X_raw, base_stats = build_features(items)
    print(f"[OK] Feature matrix shape: {X_raw.shape}")
    print(f"  - Current range: [{X_raw[:, 0].min():.2f}, {X_raw[:, 0].max():.2f}]")
    print(f"  - Temperature range: [{X_raw[:, 1].min():.2f}, {X_raw[:, 1].max():.2f}]\n")

    # Step 3: Scale
    X_scaled = scaler.transform(X_raw)

    # Step 4: Autoencoder inference (optional)
    if TF_AVAILABLE and autoencoder is not None:
        print("Running autoencoder...")
        recon = autoencoder.predict(X_scaled, verbose=0)
        recon_errors = np.mean(np.square(X_scaled - recon), axis=1)
        print(f"[OK] Reconstruction error range: [{recon_errors.min():.4f}, {recon_errors.max():.4f}]")
        print(f"  - Threshold: {ae_threshold:.4f}")
        print(f"  - Anomalies detected: {np.sum(recon_errors > ae_threshold)}/{len(recon_errors)}\n")
    else:
        print("TensorFlow not available; skipping autoencoder. Using zeros for reconstruction error.")
        recon_errors = np.zeros(X_scaled.shape[0])

    # Step 5: Isolation Forest
    print("Running isolation forest...")
    iso_preds = iso_forest.predict(X_scaled)
    iso_anomalies = np.sum(iso_preds == -1)
    print(f"[OK] Isolation Forest anomalies: {iso_anomalies}/{len(iso_preds)}\n")

    # Step 6: Classify
    counts, severities = classify_anomalies(recon_errors, iso_preds, base_stats)
    status = get_overall_status(counts)

    result = {
        "device_id": device_id,
        "status": status,
        "anomalies": counts,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "data_points": len(items)
    }

    print("Anomaly Breakdown:")
    for severity, count in counts.items():
        print(f"  - {severity.capitalize()}: {count}")
    
    print(f"\n[STATUS] Overall Status: {status}\n")

    # Step 7: Generate visualization
    print("Generating visualization...")
    chart_buf = generate_visualization(result, device_id)

    # Step 8: Upload to S3
    s3_key, s3_url = upload_to_s3(chart_buf, device_id, result)
    result["s3_key"] = s3_key
    result["s3_url"] = s3_url

    print("=" * 70)
    print("[SUCCESS] INFERENCE PIPELINE COMPLETE")
    print("=" * 70)
    print(f"\nResults:")
    print(json.dumps(result, indent=2, default=str))
    print(f"\n[IMAGE] Image URL: {s3_url}")
    
    return result


# ============ CLI INTERFACE ============

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run battery ML inference pipeline")
    parser.add_argument("device_id", nargs="?", default="device4", 
                       help="Device ID (default: device4)")
    parser.add_argument("--api-url", help="Custom API URL")
    parser.add_argument("--auth-token", help="API auth token (omit scheme or include 'Bearer ' / 'Basic ' / 'basic ' prefix)")
    parser.add_argument("--auth-scheme", choices=["Bearer", "Basic", "basic"], default="Bearer",
                       help="Auth scheme when token has no prefix (default: Bearer)")
    parser.add_argument("--evse-id", help="EVSE ID to build CMS URL (e.g. 032300130C03064)")
    parser.add_argument("--connector-id", type=int, default=1, help="Connector ID (default: 1)")
    parser.add_argument("--page", type=int, default=1, help="Pagination page (default: 1)")
    parser.add_argument("--limit", type=int, default=10,
                       help="Number of latest documents to fetch (default: 10)")
    parser.add_argument("--bucket", help="Override S3 bucket")
    
    args = parser.parse_args()
    
    if args.bucket:
        S3_BUCKET = args.bucket
    
    # Use env var for token if not provided
    if not args.auth_token:
        env_token = os.environ.get("CMS_BASIC_TOKEN")
        if env_token:
            args.auth_token = env_token
            # Default to Basic when token comes from CMS_BASIC_TOKEN
            args.auth_scheme = "Basic"

    # Build API URL from EVSE/connector if not provided
    api_url = args.api_url
    if not api_url and args.evse_id:
        api_url = build_cms_time_lapsed_url(
            evse_id=args.evse_id,
            connector_id=args.connector_id,
            page=args.page,
            limit=args.limit,
        )

    try:
        result = run_inference_pipeline(
            args.device_id,
            api_url,
            args.auth_token,
            args.limit,
            args.auth_scheme,
        )
    except Exception as e:
        print(f"\n[ERROR] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        exit(1)
