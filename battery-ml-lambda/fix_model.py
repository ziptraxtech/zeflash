"""
Fix the TensorFlow model compatibility issue by reloading and resaving
"""
import os
import tensorflow as tf

MODEL_DIR = "models"
AUTOENCODER_PATH = os.path.join(MODEL_DIR, "autoencoder_best.h5")

try:
    print("Attempting to load model with legacy format...")
    # Try loading with legacy flag
    autoencoder = tf.keras.models.load_model(AUTOENCODER_PATH, compile=False)
    print("✓ Model loaded successfully!")
    
except Exception as e:
    print(f"Standard load failed: {e}")
    print("\nTrying alternative approach...")
    
    # Alternative: Load with custom objects
    try:
        with tf.keras.utils.custom_object_scope({}):
            autoencoder = tf.keras.models.load_model(AUTOENCODER_PATH, compile=False)
            print("✓ Model loaded with custom object scope!")
    except Exception as e2:
        print(f"Alternative approach failed: {e2}")
        print("\nTrying to inspect the model file...")
        
        import h5py
        with h5py.File(AUTOENCODER_PATH, 'r') as f:
            print("Model structure:")
            def print_structure(name, obj):
                print(name)
            f.visititems(print_structure)
