"""
Convert old Keras model with batch_shape to compatible format
"""
import tensorflow as tf
import h5py
import numpy as np

print("Reading old model file...")
with h5py.File('models/autoencoder_best.h5', 'r') as f:
    # Print structure
    print("Model structure:")
    print(f.keys())
    if 'model_weights' in f:
        print("Model weights groups:", list(f['model_weights'].keys()))
    
    # Read model config
    if 'model_config' in f.attrs:
        import json
        config = json.loads(f.attrs['model_config'])
        print("Config:", config)

# Try loading with custom object to ignore batch_shape
print("\nAttempting to load with TF 2.10...")
try:
    # Load without deserializing - just get weights
    model = tf.keras.models.load_model(
        'models/autoencoder_best.h5',
        compile=False,
        custom_objects={'batch_shape': None}
    )
    print("Success! Model loaded")
    print(model.summary())
    
    # Re-save in new format
    model.save('models/autoencoder_converted.h5')
    print("✓ Converted model saved!")
except Exception as e:
    print(f"Failed: {e}")
    print("\nManually reconstructing model...")
    
    # Read layer info from h5 file
    with h5py.File('models/autoencoder_best.h5', 'r') as f:
        # Get layer names
        layer_names = [n.decode() for n in f['model_weights'].keys()]
        print(f"Layers found: {layer_names}")
        
    print("Model reconstruction not implemented yet - provide training code to retrain")

