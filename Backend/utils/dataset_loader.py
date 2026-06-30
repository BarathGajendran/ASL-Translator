import numpy as np
import pandas as pd
import os

def generate_synthetic_asl_dataset(samples_per_class=200):
    """
    Generates a high-fidelity synthetic dataset of hand landmarks (x, y, z for 21 joints)
    representing all 28 classes (A-Z, space, delete).
    It defines highly specific 3D joint configurations, direction vectors, spreads,
    and angles for every letter, simulating real-world landmark data.
    """
    print(f"Generating high-fidelity ASL dataset with {samples_per_class} samples per class...")
    
    classes = [chr(i) for i in range(ord('A'), ord('Z') + 1)] + ['space', 'delete']
    num_classes = len(classes)
    
    X = []
    y = []
    
    # 21 landmarks: 0 = wrist
    # Thumb: 1-4, Index: 5-8, Middle: 9-12, Ring: 13-16, Pinky: 17-20
    
    for class_idx, class_name in enumerate(classes):
        for _ in range(samples_per_class):
            landmarks = np.zeros((21, 3))
            
            # Wrist at origin
            landmarks[0] = [0.0, 0.0, 0.0]
            
            # Knuckles (palm base joints) relative positions
            knuckles = [
                [0.12, 0.05, -0.02],  # Thumb base (CMC)
                [0.08, 0.18, 0.0],    # Index base (MCP)
                [0.02, 0.19, 0.01],   # Middle base (MCP)
                [-0.04, 0.18, 0.0],   # Ring base (MCP)
                [-0.09, 0.15, -0.01]  # Pinky base (MCP)
            ]
            
            # Set knuckles in the landmark array
            landmarks[1] = knuckles[0]  # Thumb base MCP
            landmarks[5] = knuckles[1]  # Index base MCP
            landmarks[9] = knuckles[2]  # Middle base MCP
            landmarks[13] = knuckles[3] # Ring base MCP
            landmarks[17] = knuckles[4] # Pinky base MCP
            
            # Default finger states: 1 = extended, 0 = curled
            finger_states = [0.0, 0.0, 0.0, 0.0, 0.0]
            
            # Directions for each finger (x, y, z)
            # Default pointing up (0.0, 0.1, 0.0)
            finger_dirs = [
                np.array([0.08, 0.05, 0.02]),  # Thumb
                np.array([0.01, 0.12, 0.0]),   # Index
                np.array([0.0, 0.13, 0.0]),    # Middle
                np.array([-0.01, 0.12, 0.0]),  # Ring
                np.array([-0.02, 0.10, 0.0])   # Pinky
            ]
            
            # Customize extension state and direction vectors per letter
            if class_name == 'A':
                # Fist, thumb at side (extended right)
                finger_states = [0.4, 0.0, 0.0, 0.0, 0.0]
                finger_dirs[0] = np.array([0.08, 0.02, 0.0]) # Thumb points right
                
            elif class_name == 'B':
                # Open flat hand, fingers up and touching
                finger_states = [0.0, 1.0, 1.0, 1.0, 1.0]
                # Align fingers closely
                finger_dirs[1] = np.array([0.01, 0.14, 0.0])
                finger_dirs[2] = np.array([0.0, 0.14, 0.0])
                finger_dirs[3] = np.array([-0.01, 0.14, 0.0])
                finger_dirs[4] = np.array([-0.02, 0.13, 0.0])
                
            elif class_name == 'C':
                # Curved C shape, all fingers curved forward/inward
                finger_states = [0.5, 0.5, 0.5, 0.5, 0.5]
                # Push tips forward along z-axis
                for i in range(5):
                    finger_dirs[i][2] = 0.08  # Curved depth
                    
            elif class_name == 'D':
                # Index pointing up, others curled in a circle with thumb
                finger_states = [0.3, 1.0, 0.2, 0.2, 0.2]
                finger_dirs[1] = np.array([0.0, 0.15, 0.0])
                # Thumb curved towards middle/ring finger
                finger_dirs[0] = np.array([-0.03, 0.06, 0.05])
                
            elif class_name == 'E':
                # Curled fist, knuckles bent (claws)
                finger_states = [0.1, 0.2, 0.2, 0.2, 0.2]
                for i in range(1, 5):
                    finger_dirs[i] = np.array([0.0, 0.03, 0.08]) # Bent forward
                    
            elif class_name == 'F':
                # Index and thumb touch, other three extended spread
                finger_states = [0.5, 0.5, 1.0, 1.0, 1.0]
                # Index curls to meet thumb
                finger_dirs[1] = np.array([0.02, 0.04, 0.06])
                finger_dirs[0] = np.array([-0.02, 0.05, 0.06])
                # Spread other fingers
                finger_dirs[2] = np.array([0.0, 0.13, 0.0])
                finger_dirs[3] = np.array([-0.03, 0.12, 0.0])
                finger_dirs[4] = np.array([-0.06, 0.11, 0.0])
                
            elif class_name == 'G':
                # Index and thumb pointing sideways (horizontal)
                finger_states = [1.0, 1.0, 0.0, 0.0, 0.0]
                finger_dirs[0] = np.array([0.12, 0.01, 0.0]) # Thumb points right
                finger_dirs[1] = np.array([0.15, 0.01, 0.0]) # Index points right
                
            elif class_name == 'H':
                # Index and Middle pointing sideways, touching
                finger_states = [0.0, 1.0, 1.0, 0.0, 0.0]
                finger_dirs[1] = np.array([0.14, 0.01, 0.0])
                finger_dirs[2] = np.array([0.14, -0.01, 0.0])
                
            elif class_name == 'I':
                # Pinky up, others curled
                finger_states = [0.0, 0.0, 0.0, 0.0, 1.0]
                finger_dirs[4] = np.array([-0.01, 0.14, 0.0])
                
            elif class_name == 'J':
                # Pinky up and curved (drawing J)
                finger_states = [0.0, 0.0, 0.0, 0.0, 0.9]
                finger_dirs[4] = np.array([-0.04, 0.10, 0.06])
                
            elif class_name == 'K':
                # Index and middle up, thumb vertical touching middle
                finger_states = [0.7, 1.0, 1.0, 0.0, 0.0]
                finger_dirs[1] = np.array([0.02, 0.14, 0.0])
                finger_dirs[2] = np.array([-0.02, 0.14, 0.0])
                finger_dirs[0] = np.array([0.03, 0.08, 0.02]) # Thumb points up/mid
                
            elif class_name == 'L':
                # L shape: thumb pointing right, index pointing up
                finger_states = [1.0, 1.0, 0.0, 0.0, 0.0]
                finger_dirs[0] = np.array([0.13, 0.02, 0.0])  # Thumb out
                finger_dirs[1] = np.array([0.0, 0.15, 0.0])   # Index up
                
            elif class_name == 'M':
                # Fist, thumb tucked under index, middle, ring knuckles
                finger_states = [0.1, 0.1, 0.1, 0.1, 0.0]
                finger_dirs[0] = np.array([-0.03, 0.02, 0.02]) # Tucked left
                # Fingers bent down over thumb
                for i in range(1, 4):
                    finger_dirs[i] = np.array([0.0, 0.03, 0.05])
                    
            elif class_name == 'N':
                # Fist, thumb tucked under index, middle knuckles
                finger_states = [0.1, 0.1, 0.1, 0.0, 0.0]
                finger_dirs[0] = np.array([-0.01, 0.02, 0.02])
                for i in range(1, 3):
                    finger_dirs[i] = np.array([0.0, 0.03, 0.05])
                    
            elif class_name == 'O':
                # Circular O shape
                finger_states = [0.4, 0.4, 0.4, 0.4, 0.4]
                for i in range(5):
                    finger_dirs[i] = np.array([0.0, 0.05, 0.06])
                    
            elif class_name == 'P':
                # Similar to K, but pointing downwards
                finger_states = [0.6, 1.0, 1.0, 0.0, 0.0]
                finger_dirs[1] = np.array([0.01, -0.14, 0.0]) # Down
                finger_dirs[2] = np.array([-0.02, -0.14, 0.0]) # Down
                finger_dirs[0] = np.array([0.03, -0.08, 0.02])
                
            elif class_name == 'Q':
                # Similar to G, but pointing downwards
                finger_states = [1.0, 1.0, 0.0, 0.0, 0.0]
                finger_dirs[0] = np.array([0.10, -0.06, 0.0]) # Down-right
                finger_dirs[1] = np.array([0.05, -0.14, 0.0]) # Down
                
            elif class_name == 'R':
                # Index and middle crossed (middle in front of index)
                finger_states = [0.0, 1.0, 1.0, 0.0, 0.0]
                finger_dirs[1] = np.array([-0.02, 0.14, 0.0]) # Leans left
                finger_dirs[2] = np.array([0.02, 0.14, 0.02]) # Leans right, crosses
                
            elif class_name == 'S':
                # Fist, thumb curled in front of fingers
                finger_states = [0.3, 0.0, 0.0, 0.0, 0.0]
                finger_dirs[0] = np.array([-0.01, 0.05, 0.03]) # Curled in front
                
            elif class_name == 'T':
                # Fist, thumb tucked under index finger
                finger_states = [0.2, 0.1, 0.0, 0.0, 0.0]
                finger_dirs[0] = np.array([0.02, 0.05, 0.02]) # Tucked under index
                finger_dirs[1] = np.array([0.0, 0.06, 0.03])  # Pushed out slightly
                
            elif class_name == 'U':
                # Index and middle up, touching tightly
                finger_states = [0.0, 1.0, 1.0, 0.0, 0.0]
                finger_dirs[1] = np.array([0.005, 0.15, 0.0])
                finger_dirs[2] = np.array([-0.005, 0.15, 0.0])
                
            elif class_name == 'V':
                # Index and middle up, spread apart (V sign)
                finger_states = [0.0, 1.0, 1.0, 0.0, 0.0]
                finger_dirs[1] = np.array([0.04, 0.14, 0.0])  # Left tilt
                finger_dirs[2] = np.array([-0.04, 0.14, 0.0]) # Right tilt
                
            elif class_name == 'W':
                # Index, middle, ring up, spread apart
                finger_states = [0.0, 1.0, 1.0, 1.0, 0.0]
                finger_dirs[1] = np.array([0.05, 0.13, 0.0])
                finger_dirs[2] = np.array([0.0, 0.14, 0.0])
                finger_dirs[3] = np.array([-0.05, 0.13, 0.0])
                
            elif class_name == 'X':
                # Hooked index finger
                finger_states = [0.0, 0.5, 0.0, 0.0, 0.0]
                finger_dirs[1] = np.array([0.01, 0.06, 0.08]) # Hooked forward
                
            elif class_name == 'Y':
                # Thumb and pinky extended fully, middle three curled
                finger_states = [1.0, 0.0, 0.0, 0.0, 1.0]
                finger_dirs[0] = np.array([0.12, 0.05, 0.0])  # Thumb out right
                finger_dirs[4] = np.array([-0.10, 0.10, 0.0]) # Pinky out left
                
            elif class_name == 'Z':
                # Index up slightly slanted
                finger_states = [0.0, 1.0, 0.0, 0.0, 0.0]
                finger_dirs[1] = np.array([-0.02, 0.13, 0.02])
                
            elif class_name == 'space':
                # Flat open hand horizontally (pointing right/sideways)
                finger_states = [1.0, 1.0, 1.0, 1.0, 1.0]
                for i in range(5):
                    finger_dirs[i] = np.array([0.12, 0.02, 0.0])
                    
            elif class_name == 'delete':
                # Thumbs down: fist, with thumb extended downwards
                finger_states = [1.0, 0.0, 0.0, 0.0, 0.0]
                finger_dirs[0] = np.array([0.05, -0.12, 0.0]) # Points down
            
            # Apply vectors to build joint coordinates
            for finger_idx in range(5):
                base_idx = 1 + finger_idx * 4
                knuckle = knuckles[finger_idx]
                
                state = finger_states[finger_idx]
                dir_vec = finger_dirs[finger_idx]
                
                # Joint lengths
                lengths = [0.8, 0.6, 0.5]
                
                curr_pos = np.array(knuckle)
                for joint_idx in range(3):
                    next_joint_idx = base_idx + 1 + joint_idx
                    
                    # Apply step vector scaled by extension state
                    # Curled joints (state < 0.5) curl along z-axis
                    step = dir_vec * lengths[joint_idx]
                    if state < 0.5:
                        step = step * state
                        # Add depth curl
                        step[2] += 0.04 * (1.0 - state)
                    else:
                        step = step * state
                        
                    curr_pos = curr_pos + step
                    landmarks[next_joint_idx] = curr_pos
            
            # Centering relative to wrist
            wrist = landmarks[0]
            landmarks = landmarks - wrist
            
            # Scaling normalization
            max_dist = np.max(np.linalg.norm(landmarks, axis=1))
            if max_dist > 0:
                landmarks = landmarks / max_dist
                
            # Random jitter (noise)
            noise = np.random.normal(0, 0.02, landmarks.shape)
            landmarks = landmarks + noise
            
            # Random rotation (+/- 15 degrees)
            theta = np.random.uniform(-np.pi/12, np.pi/12)
            rotation_matrix = np.array([
                [np.cos(theta), -np.sin(theta), 0],
                [np.sin(theta), np.cos(theta), 0],
                [0, 0, 1]
            ])
            landmarks = np.dot(landmarks, rotation_matrix)
            
            X.append(landmarks.flatten())
            y.append(class_idx)
            
    return np.array(X), np.array(y), classes

def save_dataset(X, y, classes, output_dir="Dataset"):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    df = pd.DataFrame(X)
    df['label'] = y
    df.to_csv(os.path.join(output_dir, 'asl_landmarks.csv'), index=False)
    with open(os.path.join(output_dir, 'classes.txt'), 'w') as f:
        for c in classes:
            f.write(f"{c}\n")
    print(f"Dataset saved successfully. Shape: {df.shape}")

if __name__ == '__main__':
    X, y, classes = generate_synthetic_asl_dataset()
    save_dataset(X, y, classes)
