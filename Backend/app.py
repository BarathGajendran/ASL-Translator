import os
import io
import base64
import uuid
from flask import Flask, jsonify, request, session, send_from_directory
from flask_socketio import SocketIO, emit, join_room
from gtts import gTTS
from werkzeug.security import generate_password_hash, check_password_hash

# Import DB utilities and ML classifier
from utils.db_utils import (
    init_db, start_session, log_gesture, log_sentence, 
    get_session_history, get_analytics, create_user, get_user_by_username, get_user_by_id,
    clear_user_data
)
from models.classifier import ASLClassifier

app = Flask(__name__, static_folder='../Frontend/dist')
app.config['SECRET_KEY'] = 'sign_language_translator_secret_secure_key!'

# Initialize SocketIO with session support
socketio = SocketIO(app, cors_allowed_origins="*", manage_session=True)

# Delete existing DB file if old schema exists to ensure clean schema update
db_file = os.path.join(os.path.dirname(__file__), 'asl_translation.db')
if os.path.exists(db_file):
    try:
        # Check if table has old schema or just reset to be clean
        # Resetting is the safest way to prevent SQLite ALTER TABLE issues
        os.remove(db_file)
        print("Removed old database file to apply new authentication schema.")
    except Exception as e:
        print(f"Error resetting database: {e}")

# Initialize Database on Startup
init_db()

# Dictionary to keep track of active sessions and their classifier states
session_classifiers = {}

def get_session_classifier(session_id):
    """Retrieves or instantiates a classifier for a specific session ID."""
    if session_id not in session_classifiers:
        session_classifiers[session_id] = ASLClassifier()
    return session_classifiers[session_id]

# --- Authentication APIs ---

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Registers a new user."""
    data = request.json or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
        
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400
        
    # Check if user already exists
    if get_user_by_username(username):
        return jsonify({"error": "Username is already taken"}), 400
        
    password_hash = generate_password_hash(password)
    user = create_user(username, password_hash)
    
    if user:
        session['user_id'] = user['id']
        return jsonify({"user": user, "message": "Registration successful"}), 201
        
    return jsonify({"error": "Could not create user"}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Logs in an existing user."""
    data = request.json or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
        
    user = get_user_by_username(username)
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({"error": "Invalid username or password"}), 401
        
    session['user_id'] = user['id']
    return jsonify({
        "user": {"id": user['id'], "username": user['username']}, 
        "message": "Login successful"
    }), 200

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """Logs out the active user."""
    session.pop('user_id', None)
    return jsonify({"message": "Logged out successfully"}), 200

@app.route('/api/auth/user', methods=['GET'])
def get_current_user():
    """Retrieves the currently logged-in user profile details."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"user": None}), 200
        
    user = get_user_by_id(user_id)
    if user:
        return jsonify({"user": user}), 200
        
    return jsonify({"user": None}), 200

# --- Scoped Analytics & History APIs ---

@app.route('/api/history', methods=['GET'])
def history_endpoint():
    """Returns the translation history scoped to the logged-in user."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    try:
        sessions = get_session_history(user_id)
        return jsonify(sessions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analytics', methods=['GET'])
def analytics_endpoint():
    """Returns analytics statistics scoped to the logged-in user."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    try:
        analytics = get_analytics(user_id)
        return jsonify(analytics)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analytics/clear', methods=['POST'])
def clear_analytics_endpoint():
    """Deletes all session and translation statistics for the current user."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    try:
        success = clear_user_data(user_id)
        if success:
            # Also reset any in-memory classifiers for this user's active sessions if applicable
            return jsonify({"status": "success", "message": "All user analytics data reset to zero."})
        return jsonify({"error": "Failed to reset data"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/reset', methods=['POST'])
def reset_endpoint():
    """Resets the state of the active translation session."""
    data = request.json or {}
    session_id = data.get('session_id')
    if session_id:
        clf = get_session_classifier(session_id)
        clf.reset_translator()
        return jsonify({"status": "success", "message": "Session reset."})
    return jsonify({"status": "error", "message": "Missing session_id"}), 400

@app.route('/api/suggestion', methods=['POST'])
def suggestion_endpoint():
    """Accepts an autocomplete word suggestion for a session."""
    data = request.json or {}
    session_id = data.get('session_id')
    suggestion = data.get('suggestion')
    
    if session_id and suggestion:
        clf = get_session_classifier(session_id)
        sentence = clf.accept_suggestion(suggestion)
        
        # Log the updated sentence state to DB
        log_sentence(session_id, sentence)
        
        return jsonify({
            "status": "success", 
            "sentence": sentence,
            "suggestions": []
        })
    return jsonify({"status": "error", "message": "Missing parameters"}), 400

@app.route('/api/tts', methods=['POST'])
def text_to_speech():
    """Converts text to speech using Google Text-to-Speech (gTTS)."""
    data = request.json or {}
    text = data.get('text', '')
    lang = data.get('lang', 'en')
    
    if not text:
        return jsonify({"error": "Text is empty"}), 400
        
    try:
        tts = gTTS(text=text, lang=lang)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        audio_base64 = base64.b64encode(fp.read()).decode('utf-8')
        return jsonify({"audio": audio_base64})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/custom-gesture/record', methods=['POST'])
def record_custom_gesture():
    """Appends a recorded custom gesture landmark list to the local CSV dataset."""
    data = request.json or {}
    label = data.get('label', '').strip().lower()
    landmarks = data.get('landmarks')
    
    if not label or not landmarks:
        return jsonify({"error": "Missing label or landmarks"}), 400
        
    try:
        from utils.mediapipe_utils import normalize_landmarks
        normalized = normalize_landmarks(landmarks)
        
        custom_csv = os.path.join('Dataset', 'custom_landmarks.csv')
        os.makedirs('Dataset', exist_ok=True)
        
        # Check if file exists to write header if needed
        file_exists = os.path.exists(custom_csv)
        
        with open(custom_csv, 'a') as f:
            row = ",".join(map(str, normalized)) + f",{label}\n"
            f.write(row)
            
        return jsonify({"status": "success", "message": f"Successfully logged sample for '{label}'"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/custom-gesture/train', methods=['POST'])
def train_custom_gesture():
    """Retrains the 1D CNN model incorporating custom user landmarks."""
    try:
        from utils.train_model import train_custom_classifier
        # Trigger training
        success = train_custom_classifier()
        if success:
            # Reload global classifier
            global classifier
            classifier.load_model()
            # Reload room classifiers
            for clf in session_classifiers.values():
                clf.load_model()
            return jsonify({"status": "success", "message": "CNN classifier model retrained and reloaded!"})
        return jsonify({"status": "error", "message": "Retraining failed"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Serve React static build files
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@socketio.on('join')
def on_join(data):
    """Client joins a translation session room, scoped to user_id."""
    session_id = data.get('session_id')
    if not session_id:
        session_id = str(uuid.uuid4())
    user_id = data.get('user_id') or session.get('user_id')
    
    join_room(session_id)
    start_session(session_id, user_id=user_id)
    
    # Initialize classifier state for this room session
    get_session_classifier(session_id)
    
    emit('session_created', {'session_id': session_id})
    print(f"WS Client joined session room: {session_id} (user: {user_id})")

@socketio.on('landmarks')
def on_landmarks(data):
    """Receives hand landmarks, classifies them, logs if stable, and returns results."""
    session_id = data.get('session_id')
    landmarks = data.get('landmarks')
    user_id = data.get('user_id') or session.get('user_id')
    
    if not session_id or not landmarks:
        return
        
    clf = get_session_classifier(session_id)
    
    # Run prediction and update state machine
    gesture, confidence, is_stable, sentence, suggestions = clf.predict(landmarks)
    
    # If a gesture has been stabilized, commit to SQL database and update final text
    if is_stable:
        log_gesture(session_id, gesture, confidence)
        log_sentence(session_id, sentence)
        
    # Get latest analytics to push to the client dashboard in real-time
    analytics = get_analytics(user_id)
    
    emit('prediction', {
        'gesture': gesture,
        'confidence': confidence,
        'sentence': sentence,
        'suggestions': suggestions,
        'is_stable': is_stable,
        'analytics': analytics
    }, room=session_id)

@socketio.on('disconnect')
def on_disconnect():
    print("WS Client disconnected.")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Flask ASL Translation Server on port {port}...")
    socketio.run(app, host='0.0.0.0', port=port, debug=False, use_reloader=False)
