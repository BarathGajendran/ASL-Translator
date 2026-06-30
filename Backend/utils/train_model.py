import os
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv1D, MaxPooling1D, Flatten, Dense, Dropout, BatchNormalization, Input
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import synthetic generator from dataset_loader
from utils.dataset_loader import generate_synthetic_asl_dataset, save_dataset

def build_cnn_model(input_shape, num_classes):
    """
    Builds a 1D Convolutional Neural Network (CNN) model for hand landmark classification.
    """
    model = Sequential([
        Input(shape=input_shape), # (21, 3)
        
        Conv1D(64, kernel_size=3, activation='relu', padding='same'),
        BatchNormalization(),
        Conv1D(64, kernel_size=3, activation='relu', padding='same'),
        BatchNormalization(),
        MaxPooling1D(pool_size=2),
        Dropout(0.2),
        
        Conv1D(128, kernel_size=3, activation='relu', padding='same'),
        BatchNormalization(),
        Conv1D(128, kernel_size=3, activation='relu', padding='same'),
        BatchNormalization(),
        MaxPooling1D(pool_size=2),
        Dropout(0.3),
        
        Flatten(),
        Dense(256, activation='relu'),
        BatchNormalization(),
        Dropout(0.4),
        Dense(num_classes, activation='softmax')
    ])
    
    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model

def train_custom_classifier():
    """
    Loads synthetic dataset and appends any user-recorded custom gestures.
    Retrains the CNN model and saves it.
    This runs in under 10 seconds.
    """
    print("ASLTrainer: Starting model retraining with custom data...")
    dataset_path = os.path.join('Dataset', 'asl_landmarks.csv')
    custom_path = os.path.join('Dataset', 'custom_landmarks.csv')
    
    # 1. Load synthetic base dataset
    if not os.path.exists(dataset_path):
        X, y, classes = generate_synthetic_asl_dataset(samples_per_class=200)
        save_dataset(X, y, classes)
    else:
        df = pd.read_csv(dataset_path)
        X = df.drop(columns=['label']).values
        y = df['label'].values
        
    classes_path = os.path.join('Dataset', 'classes.txt')
    if os.path.exists(classes_path):
        with open(classes_path, 'r') as f:
            classes = [line.strip() for line in f.readlines()]
    else:
        classes = [chr(i) for i in range(ord('A'), ord('Z') + 1)] + ['space', 'delete']
        
    # 2. Append custom data if it exists
    if os.path.exists(custom_path):
        try:
            custom_df = pd.read_csv(custom_path, header=None)
            custom_X = custom_df.iloc[:, :-1].values
            custom_labels = custom_df.iloc[:, -1].values
            
            # Map custom label strings to class indices
            custom_y = []
            for label in custom_labels:
                if label in classes:
                    custom_y.append(classes.index(label))
                else:
                    # New class? Append it!
                    classes.append(label)
                    custom_y.append(len(classes) - 1)
            
            custom_y = np.array(custom_y)
            
            # Merge datasets
            X = np.vstack((X, custom_X))
            y = np.concatenate((y, custom_y))
            print(f"ASLTrainer: Merged {len(custom_y)} custom samples. New total samples: {len(y)}")
            
            # Update classes.txt if classes changed
            with open(classes_path, 'w') as f:
                for c in classes:
                    f.write(f"{c}\n")
        except Exception as e:
            print(f"ASLTrainer: Error loading custom data: {e}")
            
    num_classes = len(classes)
    X_reshaped = X.reshape(-1, 21, 3)
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X_reshaped, y, test_size=0.15, random_state=42, stratify=y
    )
    
    model = build_cnn_model((21, 3), num_classes)
    
    callbacks = [
        EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
    ]
    
    # Train quickly
    model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=20,
        batch_size=64,
        callbacks=callbacks,
        verbose=0
    )
    
    # Save model
    model_checkpoint_path = os.path.join('Model', 'asl_cnn_model.h5')
    backend_model_path = os.path.join('Backend', 'models', 'asl_cnn_model.h5')
    
    os.makedirs('Model', exist_ok=True)
    os.makedirs(os.path.join('Backend', 'models'), exist_ok=True)
    
    model.save(model_checkpoint_path)
    model.save(backend_model_path)
    print("ASLTrainer: Retraining completed successfully.")
    return True

def main():
    # Regular training logic
    train_custom_classifier()

if __name__ == '__main__':
    main()
