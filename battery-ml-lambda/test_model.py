"""
Test script to verify ML model is working properly.
Tests the model loading and inference locally.
"""

import json
import os
import numpy as np
import pandas as pd
import joblib
import tensorflow as tf

# Model paths
MODEL_DIR = "models"
AUTOENCODER_PATH = os.path.join(MODEL_DIR, "autoencoder_best.h5")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
ISOFOREST_PATH = os.path.join(MODEL_DIR, "isolation_forest.pkl")
CONFIG_PATH = os.path.join(MODEL_DIR, "config.json")
FEATURE_NAMES_PATH = os.path.join(MODEL_DIR, "feature_names.json")

def test_model_files_exist():
    """Test if all required model files exist."""
    print("=" * 60)
    print("TEST 1: Checking if model files exist...")
    print("=" * 60)
    
    files = {
        "Autoencoder Model": AUTOENCODER_PATH,
        "Scaler": SCALER_PATH,
        "Isolation Forest": ISOFOREST_PATH,
        "Config": CONFIG_PATH,
        "Feature Names": FEATURE_NAMES_PATH
    }
    
    all_exist = True
    for name, path in files.items():
        exists = os.path.exists(path)
        status = "✓" if exists else "✗"
        print(f"{status} {name}: {path}")
        if not exists:
            all_exist = False
    
    print("\n" + "=" * 60)
    if all_exist:
        print("✓ All model files found!")
    else:
        print("✗ Some model files are missing!")
    print("=" * 60 + "\n")
    
    return all_exist

def test_model_loading():
    """Test if models can be loaded successfully."""
    print("=" * 60)
    print("TEST 2: Loading models...")
    print("=" * 60)
    
    try:
        # Load autoencoder
        print("Loading autoencoder model...")
        # Use compile=False to avoid issues with custom objects
        autoencoder = tf.keras.models.load_model(AUTOENCODER_PATH, compile=False)
        # Compile it manually with a simple optimizer
        autoencoder.compile(optimizer='adam', loss='mse')
        print(f"✓ Autoencoder loaded successfully")
        print(f"  - Input shape: {autoencoder.input_shape}")
        print(f"  - Output shape: {autoencoder.output_shape}")
        print(f"  - Total parameters: {autoencoder.count_params():,}")
        
        # Load scaler
        print("\nLoading scaler...")
        scaler = joblib.load(SCALER_PATH)
        print(f"✓ Scaler loaded successfully")
        print(f"  - Type: {type(scaler).__name__}")
        
        # Load isolation forest
        print("\nLoading isolation forest...")
        iso_forest = joblib.load(ISOFOREST_PATH)
        print(f"✓ Isolation Forest loaded successfully")
        print(f"  - Type: {type(iso_forest).__name__}")
        print(f"  - Contamination: {iso_forest.contamination}")
        
        # Load config
        print("\nLoading config...")
        with open(CONFIG_PATH, "r") as f:
            config = json.load(f)
        print(f"✓ Config loaded successfully")
        print(f"  - Model type: {config.get('model_type', 'N/A')}")
        print(f"  - Total samples: {config.get('total_samples', 'N/A')}")
        print(f"  - Devices: {', '.join(config.get('devices', []))}")
        
        # Load feature names
        print("\nLoading feature names...")
        with open(FEATURE_NAMES_PATH, "r") as f:
            feature_names = json.load(f)
        print(f"✓ Feature names loaded successfully")
        print(f"  - Number of features: {len(feature_names)}")
        print(f"  - Features: {', '.join(feature_names)}")
        
        print("\n" + "=" * 60)
        print("✓ All models loaded successfully!")
        print("=" * 60 + "\n")
        
        return autoencoder, scaler, iso_forest, config, feature_names
    
    except Exception as e:
        print(f"\n✗ Error loading models: {str(e)}")
        print("=" * 60 + "\n")
        return None, None, None, None, None

def test_inference(autoencoder, scaler, iso_forest, config, feature_names):
    """Test model inference with synthetic data."""
    print("=" * 60)
    print("TEST 3: Testing inference with synthetic data...")
    print("=" * 60)
    
    if None in [autoencoder, scaler, iso_forest, config, feature_names]:
        print("✗ Cannot run inference test - models not loaded")
        print("=" * 60 + "\n")
        return False
    
    try:
        # Create synthetic test data
        print("Creating synthetic test data...")
        n_samples = 20
        
        # Generate reasonable values based on config thresholds
        current_stats = config.get("current_thresholds", {})
        temp_stats = config.get("temperature_thresholds", {})
        
        current_mean = current_stats.get("mean", 1.37)
        current_std = current_stats.get("std", 29.19)
        temp_mean = temp_stats.get("mean", 56.16)
        temp_std = temp_stats.get("std", 6.14)
        
        # Generate synthetic feature matrix
        X_test = []
        for _ in range(n_samples):
            current = np.clip(np.random.normal(current_mean, current_std / 10), 0, 10)
            temperature = np.clip(np.random.normal(temp_mean, temp_std), 40, 80)
            
            # Create a feature vector matching expected features
            features = {
                "current": current,
                "temperature": temperature,
                "current_roll_mean": current * (1 + np.random.normal(0, 0.1)),
                "current_roll_std": abs(np.random.normal(0.1, 0.05)),
                "current_roll_min": current * 0.9,
                "current_roll_max": current * 1.1,
                "temp_roll_mean": temperature * (1 + np.random.normal(0, 0.02)),
                "temp_roll_std": abs(np.random.normal(1, 0.5)),
                "current_rate": np.random.normal(0, 0.05),
                "temp_rate": np.random.normal(0, 0.5),
                "current_lag1": current * (1 + np.random.normal(0, 0.1)),
                "temp_lag1": temperature * (1 + np.random.normal(0, 0.02)),
                "current_temp_ratio": current / temperature if temperature != 0 else 0,
                "current_temp_product": current * temperature
            }
            X_test.append([features[fn] for fn in feature_names])
        
        X_test = np.array(X_test)
        print(f"✓ Synthetic data created: shape {X_test.shape}")
        
        # Test scaling
        print("\nTesting scaler...")
        X_scaled = scaler.transform(X_test)
        print(f"✓ Scaler works: transformed shape {X_scaled.shape}")
        print(f"  - Min scaled value: {X_scaled.min():.4f}")
        print(f"  - Max scaled value: {X_scaled.max():.4f}")
        print(f"  - Mean scaled value: {X_scaled.mean():.4f}")
        
        # Test autoencoder
        print("\nTesting autoencoder...")
        recon = autoencoder.predict(X_scaled, verbose=0)
        recon_errors = np.mean(np.square(X_scaled - recon), axis=1)
        print(f"✓ Autoencoder inference works: reconstruction shape {recon.shape}")
        print(f"  - Mean reconstruction error: {recon_errors.mean():.4f}")
        print(f"  - Min reconstruction error: {recon_errors.min():.4f}")
        print(f"  - Max reconstruction error: {recon_errors.max():.4f}")
        
        ae_threshold = config.get("autoencoder_threshold", 0.0)
        n_anomalies_ae = np.sum(recon_errors > ae_threshold)
        print(f"  - Threshold: {ae_threshold:.4f}")
        print(f"  - Anomalies detected: {n_anomalies_ae}/{n_samples}")
        
        # Test isolation forest
        print("\nTesting isolation forest...")
        iso_preds = iso_forest.predict(X_scaled)
        n_anomalies_iso = np.sum(iso_preds == -1)
        print(f"✓ Isolation Forest inference works")
        print(f"  - Predictions: {n_anomalies_iso} anomalies / {n_samples - n_anomalies_iso} normal")
        
        # Test classification logic
        print("\nTesting severity classification...")
        counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        
        current_thr = config.get("current_thresholds", {})
        temp_thr = config.get("temperature_thresholds", {})
        
        for i in range(n_samples):
            re = recon_errors[i]
            iso_anom = (iso_preds[i] == -1)
            curr = X_test[i][0]  # current is first feature
            temp = X_test[i][1]  # temperature is second feature
            
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
            
            counts[severity] += 1
        
        print(f"✓ Severity classification works")
        print(f"  - Critical: {counts['critical']}")
        print(f"  - High: {counts['high']}")
        print(f"  - Medium: {counts['medium']}")
        print(f"  - Low: {counts['low']}")
        
        # Determine overall status
        if counts['critical'] > 0 or counts['high'] > 3:
            status = "Immediate Action Required"
        elif counts['high'] > 0 or counts['medium'] > 5:
            status = "Degradation Accelerating"
        elif counts['medium'] > 0:
            status = "Moderate Irregularities"
        else:
            status = "Stable"
        
        print(f"\nOverall Status: {status}")
        
        print("\n" + "=" * 60)
        print("✓ All inference tests passed!")
        print("=" * 60 + "\n")
        
        return True
    
    except Exception as e:
        print(f"\n✗ Error during inference: {str(e)}")
        import traceback
        traceback.print_exc()
        print("=" * 60 + "\n")
        return False

def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("BATTERY ML MODEL TEST SUITE")
    print("=" * 60 + "\n")
    
    # Test 1: Check files
    files_ok = test_model_files_exist()
    if not files_ok:
        print("\n❌ FAILED: Model files are missing!")
        return
    
    # Test 2: Load models
    models = test_model_loading()
    if models[0] is None:
        print("\n❌ FAILED: Could not load models!")
        return
    
    # Test 3: Run inference
    inference_ok = test_inference(*models)
    if not inference_ok:
        print("\n❌ FAILED: Inference test failed!")
        return
    
    # Final summary
    print("=" * 60)
    print("✓✓✓ ALL TESTS PASSED! ✓✓✓")
    print("=" * 60)
    print("\nThe ML model is working properly!")
    print("\nNext steps:")
    print("1. Deploy Lambda function to AWS")
    print("2. Set up DynamoDB table with battery data")
    print("3. Configure API Gateway")
    print("4. Update frontend to call the Lambda endpoint")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
