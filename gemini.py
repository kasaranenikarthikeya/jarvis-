from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import psycopg2
import requests
import secrets
from flask_session import Session

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

app.config["SESSION_TYPE"] = "filesystem"
Session(app)

CORS(app)

# ✅ Replace with your Render PostgreSQL Database URL
DB_URL = "postgresql://my_flask_db_xrny_user:E5yWDOjujKIQmcqxTJU3OdmxQjZRarpb@dpg-cv7g2t2j1k6c73ed8330-a.oregon-postgres.render.com/my_flask_db_xrny"

# ✅ Connect to PostgreSQL
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

# ✅ Create table for chat history if it doesn’t exist
cur.execute("""
CREATE TABLE IF NOT EXISTS chat (
    id SERIAL PRIMARY KEY,
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")
conn.commit()

# ✅ Replace with your Google Gemini API Key
GEMINI_API_KEY = "AIzaSyA2bD7wy8LopWgI2e_C8OaiCRGvKWxgUg4"
GEMINI_MODEL = "gemini-1.5-pro"
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    try:
        if not request.is_json:
            return jsonify({"error": "Invalid request format. Expected JSON."}), 400

        data = request.get_json()
        user_input = data.get("message", "").strip()

        if not user_input:
            return jsonify({"error": "No message provided"}), 400

        # ✅ Retrieve last 5 messages from database for context
        cur.execute("SELECT user_message, bot_response FROM chat_history ORDER BY created_at DESC LIMIT 5")
        chat_history = cur.fetchall()

        # ✅ Format chat history for AI request
        conversation = "\n".join([f"User: {msg[0]}\nBot: {msg[1]}" for msg in chat_history])

        # ✅ API Payload with past context
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": conversation + "\nUser: " + user_input}]
                }
            ]
        }

        headers = {"Content-Type": "application/json"}
        response = requests.post(GEMINI_API_URL, headers=headers, json=payload)

        print(f"Raw API Response: {response.text}")  # Debugging step

        if response.status_code != 200:
            return jsonify({"error": f"AI API Error: {response.text}"}), response.status_code

        ai_response = response.json()

        # ✅ Extract AI's response correctly
        bot_reply = ai_response.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "I'm not sure how to respond.")

        # ✅ Store conversation in database
        cur.execute("INSERT INTO chat (user_message, bot_response) VALUES (%s, %s)", (user_input, bot_reply))
        conn.commit()

        return jsonify({"response": bot_reply})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)