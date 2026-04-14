from flask import Flask, request, jsonify
import pickle
from flask_cors import CORS
import sqlite3
import uuid
from werkzeug.security import generate_password_hash, check_password_hash
from preprocess import clean_text
import os

app = Flask(__name__)
CORS(app)

# Load model gracefully
model_path = os.path.join("ml_model", "model.pkl")
vectorizer_path = os.path.join("ml_model", "vectorizer.pkl")

model = None
vectorizer = None
if os.path.exists(model_path) and os.path.exists(vectorizer_path):
    model = pickle.load(open(model_path, "rb"))
    vectorizer = pickle.load(open(vectorizer_path, "rb"))
else:
    print("Warning: ML model files not found. Predictions will be mocked.")

# Create DB
os.makedirs("database", exist_ok=True)
conn = sqlite3.connect("database/history_v2.db", check_same_thread=False)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    text TEXT,
    result TEXT,
    confidence REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
)
""")
conn.commit()

@app.route("/")
def home():
    return "Fake News Detection API Running 🚀"

@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({"error": "Missing required fields"}), 400

    hashed = generate_password_hash(password)
    user_id = str(uuid.uuid4())

    try:
        cursor.execute("INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)", (user_id, username, email, hashed))
        conn.commit()
        return jsonify({"message": "User created successfully", "user": {"id": user_id, "username": username, "email": email}}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username or email already exists"}), 409

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Missing credentials"}), 400

    cursor.execute("SELECT id, username, email, password_hash FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()

    if user and check_password_hash(user[3], password):
        return jsonify({"message": "Login successful", "token": user[0], "user": {"id": user[0], "username": user[1], "email": user[2]}}), 200
    else:
        return jsonify({"error": "Invalid credentials"}), 401

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    text = data.get("news", "")
    language = data.get("language", "en")
    source_url = data.get("source_url", "")
    user_id = data.get("user_id")

    if not text:
        return jsonify({"error": "No input provided"}), 400

    # 1. Translation
    try:
        from googletrans import Translator
        translator = Translator()
        if language in ["hi", "te"]:
            translation = translator.translate(text, src=language, dest="en")
            text_to_analyze = translation.text
        else:
            text_to_analyze = text
    except Exception as e:
        print("Translation error:", e)
        text_to_analyze = text

    # 2. Source Credibility
    from urllib.parse import urlparse
    TRUSTED_DOMAINS = ["bbc.com", "cnn.com", "reuters.com", "thehindu.com", "nytimes.com", "ndtv.com"]
    SUSPICIOUS_DOMAINS = ["randomblog.xyz", "fakenews.com", "satire.com", "theonion.com", "infowars.com"]
    
    domain = urlparse(source_url).netloc.lower().replace("www.", "") if source_url else ""
    source_status = "Unknown"
    source_modifier = 0

    if domain:
        for t in TRUSTED_DOMAINS:
            if t in domain:
                source_status = "Trusted"
                source_modifier = -0.20 # Reduces fake probability natively
                break
        for s in SUSPICIOUS_DOMAINS:
            if s in domain:
                source_status = "Suspicious"
                source_modifier = 0.20 # Increases fake likelihood
                break

    if not model or not vectorizer:
        confidence = 0.85
        result = "Fake News ❌"
        suspicious_words, credible_words = ["mocking", "fake"], ["real", "truths"]
    else:
        # Preprocess
        cleaned = clean_text(text_to_analyze)
        vector = vectorizer.transform([cleaned])
        
        probs = model.predict_proba(vector)[0]
        base_fake_prob = probs[0] # Fake is index 0
        
        # Apply domain modifier smartly capped between bounds
        final_fake_prob = max(0.0, min(1.0, base_fake_prob + source_modifier))
        
        if final_fake_prob > 0.5:
            result = "Fake News ❌"
            confidence = float(final_fake_prob)
        else:
            result = "Real News ✅"
            confidence = float(1.0 - final_fake_prob)

        # 3. Explainable AI (XAI) mapping
        feature_names = vectorizer.get_feature_names_out()
        coefs = model.coef_[0]
        
        doc_vector = vector.toarray()[0]
        non_zero_indices = doc_vector.nonzero()[0]
        
        # Mapping logic tracking explicit vectors
        word_contributions = [(feature_names[i], doc_vector[i] * coefs[i]) for i in non_zero_indices]
        
        suspicious_words = [w[0] for w in sorted(word_contributions, key=lambda x: x[1]) if w[1] < -0.05][:8]
        credible_words = [w[0] for w in sorted(word_contributions, key=lambda x: x[1], reverse=True) if w[1] > 0.05][:8]

    # Save to DB organically capturing user interactions
    if user_id:
        cursor.execute(
            "INSERT INTO history (user_id, text, result, confidence) VALUES (?, ?, ?, ?)",
            (user_id, text_to_analyze, result, confidence)
        )
        conn.commit()

    return jsonify({
        "prediction": result,
        "confidence": round(confidence * 100, 2),
        "source_status": source_status,
        "suspicious_words": suspicious_words,
        "credible_words": credible_words,
        "translated_text": text_to_analyze if language != "en" else None
    })

@app.route("/history", methods=["GET"])
def history():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    cursor.execute("SELECT text, result, confidence, timestamp FROM history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 15", (user_id,))
    rows = cursor.fetchall()
    
    data = [{"text": r[0], "result": r[1], "confidence": r[2], "timestamp": r[3]} for r in rows]
    return jsonify(data)

if __name__ == "__main__":
    app.run(debug=True, port=5000)