import io
import os
from datetime import datetime, timezone

import boto3
import matplotlib
matplotlib.use("Agg")  # 🔥 REQUIRED FOR ECS
import matplotlib.pyplot as plt

from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from inference import run_inference

# ---------- CONFIG ----------
RESULTS_BUCKET = os.environ.get("RESULTS_BUCKET_NAME")
RESULTS_PREFIX = os.environ.get("RESULTS_PREFIX", "battery-reports/")

if not RESULTS_BUCKET:
    raise RuntimeError("RESULTS_BUCKET_NAME env var not set")

s3_client = boto3.client("s3")

app = FastAPI(title="Battery Anomaly Inference Service")


class ReportRequest(BaseModel):
    device_id: Optional[str] = "device4"  # Optional, defaults to table name


def generate_plot(result: dict, device_id: str) -> io.BytesIO:
    anomalies = result["anomalies"]
    status = result["status"]

    labels = ["critical", "high", "medium", "low"]
    values = [anomalies.get(k, 0) for k in labels]

    fig, ax = plt.subplots(figsize=(6, 4))
    bars = ax.bar(labels, values, color=["#d32f2f", "#f57c00", "#fbc02d", "#388e3c"])
    ax.set_title(f"Battery Anomalies – {device_id}")
    ax.set_ylabel("Count")

    for bar in bars:
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height(),
                int(bar.get_height()), ha="center", va="bottom")

    fig.suptitle(f"Status: {status}", fontsize=11)

    buf = io.BytesIO()
    fig.tight_layout()
    fig.savefig(buf, format="png")
    plt.close(fig)
    buf.seek(0)
    return buf


def upload_to_s3(buf: io.BytesIO, device_id: str):
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    key = f"{RESULTS_PREFIX.rstrip('/')}/{device_id}/{timestamp}.png"

    s3_client.put_object(
        Bucket=RESULTS_BUCKET,
        Key=key,
        Body=buf.getvalue(),
        ContentType="image/png",
    )

    url = s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": RESULTS_BUCKET, "Key": key},
        ExpiresIn=3600,
    )

    return key, url


@app.post("/generate-report")
async def generate_report(req: ReportRequest = ReportRequest()):
    # device_id is just an identifier for the report, not used for querying
    device_id = req.device_id or "device4"

    try:
        result = run_inference(device_id)
    except Exception as e:
        raise HTTPException(500, f"Inference failed: {str(e)}")

    plot_buf = generate_plot(result, device_id)
    key, image_url = upload_to_s3(plot_buf, device_id)

    return {
        "device_id": device_id,
        "status": result["status"],
        "anomalies": result["anomalies"],
        "generated_at": result["generated_at"],
        "image_key": key,
        "image_url": image_url,
    }


@app.get("/health")
async def health():
    return {"status": "ok"}