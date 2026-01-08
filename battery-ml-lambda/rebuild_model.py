"""
Manually reconstruct the autoencoder from the old model file
Architecture: 14 -> 32 -> 16 -> 8 (bottleneck) -> 16 -> 32 -> 14
With BatchNorm, LeakyReLU, and Dropout layers
"""
import tensorflow as tf
import h5py
import numpy as np

print("Building new model with same architecture...")

# Build the architecture
inputs = tf.keras.Input(shape=(14,), name='input_layer')

# Encoder
x = tf.keras.layers.Dense(32, kernel_regularizer=tf.keras.regularizers.l2(1e-5), name='dense')(inputs)
x = tf.keras.layers.BatchNormalization(momentum=0.99, name='batch_normalization')(x)
x = tf.keras.layers.LeakyReLU(alpha=0.2, name='leaky_re_lu')(x)
x = tf.keras.layers.Dropout(0.25, name='dropout')(x)

x = tf.keras.layers.Dense(16, kernel_regularizer=tf.keras.regularizers.l2(1e-5), name='dense_1')(x)
x = tf.keras.layers.BatchNormalization(momentum=0.99, name='batch_normalization_1')(x)
x = tf.keras.layers.LeakyReLU(alpha=0.2, name='leaky_re_lu_1')(x)
x = tf.keras.layers.Dropout(0.25, name='dropout_1')(x)

# Bottleneck
x = tf.keras.layers.Dense(8, kernel_regularizer=tf.keras.regularizers.l2(1e-5), name='dense_2')(x)
x = tf.keras.layers.BatchNormalization(momentum=0.99, name='batch_normalization_2')(x)
x = tf.keras.layers.LeakyReLU(alpha=0.2, name='leaky_re_lu_2')(x)

# Decoder
x = tf.keras.layers.Dense(16, kernel_regularizer=tf.keras.regularizers.l2(1e-5), name='dense_3')(x)
x = tf.keras.layers.BatchNormalization(momentum=0.99, name='batch_normalization_3')(x)
x = tf.keras.layers.LeakyReLU(alpha=0.2, name='leaky_re_lu_3')(x)
x = tf.keras.layers.Dropout(0.25, name='dropout_2')(x)

x = tf.keras.layers.Dense(32, kernel_regularizer=tf.keras.regularizers.l2(1e-5), name='dense_4')(x)
x = tf.keras.layers.BatchNormalization(momentum=0.99, name='batch_normalization_4')(x)
x = tf.keras.layers.LeakyReLU(alpha=0.2, name='leaky_re_lu_4')(x)
x = tf.keras.layers.Dropout(0.25, name='dropout_3')(x)

outputs = tf.keras.layers.Dense(14, name='dense_5')(x)

model = tf.keras.Model(inputs=inputs, outputs=outputs, name='autoencoder')
print("Model built successfully!")
print(model.summary())

# Now load weights from old model file
print("\nLoading weights from old model...")
with h5py.File('models/autoencoder_best.h5', 'r') as f:
    # Load weights for each layer that has weights
    for layer in model.layers:
        if layer.name in f['model_weights'] and len(layer.weights) > 0:
            layer_weights = f['model_weights'][layer.name][layer.name]
            weights = []
            for w_name in layer_weights.keys():
                weights.append(np.array(layer_weights[w_name]))
            if weights:
                try:
                    layer.set_weights(weights)
                    print(f"  Loaded weights for {layer.name}")
                except Exception as e:
                    print(f"  Warning: Could not load weights for {layer.name}: {e}")

print("\nCompiling model...")
model.compile(optimizer='adam', loss='mse')

print("\nSaving converted model...")
model.save('models/autoencoder_converted.h5')

print("✓ Model converted and saved to models/autoencoder_converted.h5")

# Test loading
print("\nTesting new model...")
test_model = tf.keras.models.load_model('models/autoencoder_converted.h5', compile=False)
test_model.compile(optimizer='adam', loss='mse')
print("✓ New model loads successfully!")
