import numpy as np

def normalize_landmarks(raw_landmarks):
    """
    Normalizes a list or array of raw hand landmarks.
    Expects raw_landmarks to be:
      - A flat list/array of 63 elements (21 joints * 3 coordinates)
      - Or a list of dicts/objects: [{'x':..., 'y':..., 'z':...}, ...]
      
    Normalization steps:
      1. Center: Shift all landmarks relative to the wrist (landmark 0).
      2. Scale: Scale the entire hand so that the maximum distance from the wrist is 1.0.
      3. Flatten: Return a flat 1D numpy array of 63 elements.
    """
    # 1. Parse input
    if isinstance(raw_landmarks, list) and len(raw_landmarks) > 0 and isinstance(raw_landmarks[0], dict):
        # Convert list of dicts to numpy array of shape (21, 3)
        landmarks = np.array([[lm['x'], lm['y'], lm['z']] for lm in raw_landmarks])
    else:
        # Assume it's a flat list/array of 63 numbers
        landmarks = np.array(raw_landmarks).reshape(21, 3)
        
    # Invert the y-coordinate because MediaPipe's y-axis points down (0 at top, 1 at bottom),
    # whereas the ML training dataset templates point up (0 at wrist, positive values above).
    landmarks[:, 1] = -landmarks[:, 1]
        
    # 2. Center at wrist (landmark 0)
    wrist = landmarks[0]
    centered_landmarks = landmarks - wrist
    
    # 3. Scale to unit distance
    # Compute Euclidean distance from wrist for each joint
    distances = np.linalg.norm(centered_landmarks, axis=1)
    max_distance = np.max(distances)
    
    if max_distance > 0:
        normalized_landmarks = centered_landmarks / max_distance
    else:
        normalized_landmarks = centered_landmarks
        
    return normalized_landmarks.flatten()
