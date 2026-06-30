import sqlite3
import os
import uuid
from datetime import datetime

DATABASE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'asl_translation.db')

def get_db_connection():
    """Establishes and returns a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the database schema with User Authentication and Sessions."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON")
    
    # 1. Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE,
            password_hash TEXT,
            created_at TEXT
        )
    ''')
    
    # 2. Sessions table (linked to users)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            start_time TEXT,
            end_time TEXT,
            total_gestures INTEGER DEFAULT 0,
            average_confidence REAL DEFAULT 0.0,
            final_text TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # 3. Gesture history logs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS gesture_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            timestamp TEXT,
            gesture TEXT,
            confidence REAL,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        )
    ''')
    
    # 4. Translated sentences table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sentence_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            timestamp TEXT,
            sentence TEXT,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    conn.close()
    print("Database initialized successfully with authentication support.")

# User Authentication Helpers
def create_user(username, password_hash):
    """Creates a new user in the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    user_id = str(uuid.uuid4())
    created_at = datetime.now().isoformat()
    try:
        cursor.execute(
            "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
            (user_id, username, password_hash, created_at)
        )
        conn.commit()
        return {"id": user_id, "username": username}
    except sqlite3.IntegrityError:
        return None # Username already exists
    finally:
        conn.close()

def get_user_by_username(username):
    """Retrieves a user by username."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def get_user_by_id(user_id):
    """Retrieves a user by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, created_at FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

# Session and Logging Helpers
def start_session(session_id, user_id=None):
    """Creates a new session record, optionally associated with a user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    try:
        cursor.execute(
            "INSERT INTO sessions (id, user_id, start_time, total_gestures, average_confidence, final_text) VALUES (?, ?, ?, ?, ?, ?)",
            (session_id, user_id, now_str, 0, 0.0, "")
        )
        conn.commit()
    except sqlite3.IntegrityError:
        pass # Session already exists
    finally:
        conn.close()

def log_gesture(session_id, gesture, confidence):
    """Logs a single gesture prediction and updates session metrics."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    
    # Insert gesture log
    cursor.execute(
        "INSERT INTO gesture_history (session_id, timestamp, gesture, confidence) VALUES (?, ?, ?, ?)",
        (session_id, now_str, gesture, confidence)
    )
    
    # Update session aggregate stats
    cursor.execute(
        "SELECT COUNT(*), AVG(confidence) FROM gesture_history WHERE session_id = ?",
        (session_id,)
    )
    count, avg_conf = cursor.fetchone()
    
    cursor.execute(
        "UPDATE sessions SET total_gestures = ?, average_confidence = ? WHERE id = ?",
        (count, avg_conf or 0.0, session_id)
    )
    
    conn.commit()
    conn.close()

def log_sentence(session_id, sentence):
    """Logs the final/updated sentence of a session."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    
    # Insert into sentence history
    cursor.execute(
        "INSERT INTO sentence_history (session_id, timestamp, sentence) VALUES (?, ?, ?)",
        (session_id, now_str, sentence)
    )
    
    # Update sessions final text
    cursor.execute(
        "UPDATE sessions SET final_text = ?, end_time = ? WHERE id = ?",
        (sentence, now_str, session_id)
    )
    
    conn.commit()
    conn.close()

def get_session_history(user_id=None):
    """Retrieves all sessions associated with a specific user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    if user_id:
        cursor.execute("SELECT * FROM sessions WHERE user_id = ? ORDER BY start_time DESC", (user_id,))
    else:
        cursor.execute("SELECT * FROM sessions ORDER BY start_time DESC")
    sessions = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return sessions

def get_analytics(user_id=None):
    """Generates analytics statistics filtered for a specific user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # SQL Filter base depending on user_id existence
    user_filter = "WHERE s.user_id = ?" if user_id else ""
    user_param = (user_id,) if user_id else ()
    
    # Total gestures detected overall
    cursor.execute(f'''
        SELECT COUNT(gh.id) 
        FROM gesture_history gh
        INNER JOIN sessions s ON gh.session_id = s.id
        {user_filter}
    ''', user_param)
    total_gestures = cursor.fetchone()[0] or 0
    
    # Average accuracy (confidence)
    cursor.execute(f'''
        SELECT AVG(gh.confidence) 
        FROM gesture_history gh
        INNER JOIN sessions s ON gh.session_id = s.id
        {user_filter}
    ''', user_param)
    avg_accuracy = cursor.fetchone()[0] or 0.0
    
    # Most used gestures (top 5)
    cursor.execute(f'''
        SELECT gh.gesture, COUNT(*) as count 
        FROM gesture_history gh
        INNER JOIN sessions s ON gh.session_id = s.id
        {user_filter}
        GROUP BY gh.gesture 
        ORDER BY count DESC 
        LIMIT 5
    ''', user_param)
    most_used = [dict(row) for row in cursor.fetchall()]
    
    # Confidence distribution
    cursor.execute(f'''
        SELECT CAST(gh.confidence * 10 as INTEGER) * 10 as bin, COUNT(*) as count
        FROM gesture_history gh
        INNER JOIN sessions s ON gh.session_id = s.id
        {user_filter}
        GROUP BY bin
        ORDER BY bin
    ''', user_param)
    confidence_distribution = [dict(row) for row in cursor.fetchall()]
    
    # History of last 10 sentences
    cursor.execute(f'''
        SELECT s.id as session_id, s.start_time, s.final_text, s.total_gestures, s.average_confidence 
        FROM sessions s 
        WHERE s.final_text != '' {"AND s.user_id = ?" if user_id else ""}
        ORDER BY s.start_time DESC
        LIMIT 10
    ''', user_param)
    recent_sentences = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    return {
        "totalGestures": total_gestures,
        "averageAccuracy": round(avg_accuracy * 100, 2),
        "mostUsed": most_used,
        "confidenceDistribution": confidence_distribution,
        "recentSentences": recent_sentences
    }

def clear_user_data(user_id):
    """Deletes all session and log records for a specific user to reset stats to zero."""
    if not user_id:
        return False
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    return True
