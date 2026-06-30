import os
import numpy as np
import tensorflow as tf
from utils.mediapipe_utils import normalize_landmarks

class ASLClassifier:
    def __init__(self, model_path=None):
        """
        Initializes the ASL Gesture Classifier.
        Loads the trained 1D CNN model and sets up sentence building/smoothing state.
        """
        if model_path is None:
            # Default paths
            model_path = os.path.join(os.path.dirname(__file__), 'asl_cnn_model.h5')
            
        self.model_path = model_path
        self.model = None
        self.classes = []
        self.load_model()
        
        # Sentence builder and prediction smoothing state
        self.prediction_history = [] # Rolling window of raw predicted class indexes
        self.history_window_size = 8  # Number of frames to smooth over
        self.confidence_threshold = 0.45 # Minimum confidence to accept a prediction
        
        # State machine for letter confirmation
        self.current_stable_class = None
        self.stable_frames_count = 0
        self.required_stable_frames = 6 # Frames required to confirm a letter (~0.3-0.5s)
        
        # Output Text States
        self.current_word = ""
        self.translated_words = []
        self.last_confirmed_char = None
        
        # Dictionary for autocomplete
        self.common_words = [
            "hello", "help", "how", "are", "you", "thank", "thanks", "good", 
            "morning", "afternoon", "night", "please", "sorry", "yes", "no", 
            "sign", "language", "translator", "deaf", "interpreter", "welcome",
            "friend", "family", "visual", "gesture", "name", "happy", "fine",
            "morning", "everyone", "today", "ready", "excuse", "me", "learn"
        ]
        
        # Smart NLP Bigram transitions (next-word suggestions)
        self.next_word_transitions = {
            "hello": ["friend", "name", "everyone", "today"],
            "how": ["are", "is", "can", "do"],
            "are": ["you", "we", "they", "there"],
            "you": ["are", "welcome", "want", "need"],
            "good": ["morning", "afternoon", "night", "job", "luck"],
            "thank": ["you", "thanks", "everyone"],
            "please": ["help", "wait", "welcome", "repeat"],
            "my": ["name", "family", "friend", "sign"],
            "is": ["good", "bad", "fine", "ready", "happy"],
            "what": ["is", "are", "do", "you"],
            "i": ["am", "want", "need", "like", "love"],
            "am": ["fine", "happy", "sorry", "deaf", "learning"],
            "excuse": ["me"],
        }
        
    def load_model(self):
        """Loads the saved Keras/TensorFlow model."""
        if os.path.exists(self.model_path):
            try:
                self.model = tf.keras.models.load_model(self.model_path)
                print(f"ASLClassifier: Successfully loaded model from {self.model_path}")
            except Exception as e:
                print(f"ASLClassifier: Error loading model: {e}")
        else:
            print(f"ASLClassifier: Warning, model file not found at {self.model_path}")
            
        # Load classes
        classes_path = os.path.join(os.path.dirname(os.path.dirname(self.model_path)), 'Dataset', 'classes.txt')
        if os.path.exists(classes_path):
            with open(classes_path, 'r') as f:
                self.classes = [line.strip() for line in f.readlines()]
            print(f"ASLClassifier: Loaded {len(self.classes)} classes from {classes_path}")
        else:
            self.classes = [chr(i) for i in range(ord('A'), ord('Z') + 1)] + ['space', 'delete']
            print(f"ASLClassifier: Classes file not found, using default {len(self.classes)} classes")

    def predict(self, raw_landmarks):
        """
        Predicts the ASL sign from raw hand landmarks.
        Returns: (predicted_class_name, confidence, is_stable_update, current_sentence, suggestions)
        """
        if self.model is None:
            # Try to reload model if not loaded yet
            self.load_model()
            if self.model is None:
                return "Model Not Loaded", 0.0, False, self.get_current_sentence(), []
            
        # 1. Normalize coordinates
        try:
            normalized = normalize_landmarks(raw_landmarks)
        except Exception as e:
            print(f"ASLClassifier: Error normalizing landmarks: {e}")
            return "Error", 0.0, False, self.get_current_sentence(), []
            
        # 2. Reshape for CNN input: shape (1, 21, 3)
        input_data = normalized.reshape(1, 21, 3)
        
        # 3. Model Inference
        predictions = self.model.predict(input_data, verbose=0)[0]
        predicted_idx = np.argmax(predictions)
        confidence = float(predictions[predicted_idx])
        predicted_class = self.classes[predicted_idx]
        
        # 4. Temporal Smoothing (Sliding Window filter)
        self.prediction_history.append(predicted_idx)
        if len(self.prediction_history) > self.history_window_size:
            self.prediction_history.pop(0)
            
        # Find the most frequent class in our history window
        counts = np.bincount(self.prediction_history)
        most_frequent_idx = np.argmax(counts)
        smooth_class = self.classes[most_frequent_idx]
        
        # Compute smooth confidence
        smooth_confidence = confidence
        
        # 5. Stable Gesture Lock/Confirmation State Machine
        is_stable_update = False
        
        if smooth_confidence >= self.confidence_threshold:
            if smooth_class == self.current_stable_class:
                self.stable_frames_count += 1
            else:
                self.current_stable_class = smooth_class
                self.stable_frames_count = 1
                
            # If the sign is held stable for N frames, perform translation action
            if self.stable_frames_count == self.required_stable_frames:
                is_stable_update = self._process_stable_gesture(smooth_class)
        else:
            self.stable_frames_count = 0
            self.current_stable_class = None
            
        # 6. Generate Smart Autocomplete Suggestions
        suggestions = self.get_word_suggestions()
        
        return smooth_class, smooth_confidence, is_stable_update, self.get_current_sentence(), suggestions

    def _process_stable_gesture(self, gesture):
        """
        State machine action when a gesture is stable.
        """
        # Avoid immediate double-triggering of the same character
        if gesture == self.last_confirmed_char:
            return False
            
        self.last_confirmed_char = gesture
        
        if gesture == 'delete':
            # Remove last character of current word, or last word if current is empty
            if len(self.current_word) > 0:
                self.current_word = self.current_word[:-1]
            elif len(self.translated_words) > 0:
                self.current_word = self.translated_words.pop()
            return True
            
        elif gesture == 'space':
            # Complete the current word
            if len(self.current_word) > 0:
                self.translated_words.append(self.current_word)
                self.current_word = ""
                self.last_confirmed_char = None
            return True
            
        else:
            # It's an alphabet letter
            self.current_word += gesture.lower()
            return True

    def get_current_sentence(self):
        """Assembles and returns the current translated text."""
        words = self.translated_words.copy()
        if len(self.current_word) > 0:
            words.append(self.current_word)
        return " ".join(words)

    def get_word_suggestions(self):
        """Returns smart autocomplete suggestions or bigram next-word NLP predictions."""
        # Case A: User is in the middle of spelling a word
        if self.current_word:
            curr = self.current_word.lower()
            matches = [w for w in self.common_words if w.startswith(curr)]
            return matches[:3]
            
        # Case B: Current word is empty, suggest next word based on previous word
        if self.translated_words:
            last_word = self.translated_words[-1].lower()
            if last_word in self.next_word_transitions:
                return self.next_word_transitions[last_word]
                
        # Default suggestions for empty sentence
        return ["hello", "how", "please", "my"]

    def accept_suggestion(self, suggestion):
        """Replaces the active word or appends the next word suggestion."""
        # If user was spelling a word, replace it
        if self.current_word:
            self.current_word = suggestion.lower()
            self.translated_words.append(self.current_word)
            self.current_word = ""
        else:
            # It's a next-word prediction
            self.translated_words.append(suggestion.lower())
            
        self.last_confirmed_char = None
        return self.get_current_sentence()

    def reset_translator(self):
        """Resets all text states."""
        self.current_word = ""
        self.translated_words = []
        self.last_confirmed_char = None
        self.prediction_history = []
        self.stable_frames_count = 0
        self.current_stable_class = None
