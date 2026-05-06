"""
app.py — Tech Day Event Website
Flask application entry point.

Run:
    pip install -r requirements.txt
    python app.py
"""

import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from config import BASE_DIR, UPLOAD_DIR
from auth import get_current_user

# ── Route blueprints ──────────────────────────────────────────
from routes.agenda         import agenda_bp
from routes.presentations  import presentations_bp
from routes.team           import team_bp
from routes.results        import results_bp
from routes.events         import events_bp
from routes.conferences    import conferences_bp
from routes.archive        import archive_bp

# ── App factory ───────────────────────────────────────────────
app = Flask(__name__, static_folder=os.path.join(BASE_DIR, "static"))
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/uploads/*": {"origins": "*"}})

# Ensure uploads folder exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── Register blueprints ───────────────────────────────────────
app.register_blueprint(agenda_bp)
app.register_blueprint(presentations_bp)
app.register_blueprint(team_bp)
app.register_blueprint(results_bp)
app.register_blueprint(events_bp)
app.register_blueprint(conferences_bp)
app.register_blueprint(archive_bp)


# ── Auth endpoint ─────────────────────────────────────────────
@app.route("/api/me")
def get_me():
    return jsonify(get_current_user())


# ── Serve frontend ────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")

@app.route("/static/assets/<path:filename>")
def serve_assets(filename):
    return send_from_directory(os.path.join(BASE_DIR, "static", "assets"), filename)



# ── Main ──────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n🚀  Tech Day server running at → http://localhost:5000\n")
    app.run(debug=True, port=5000, host="0.0.0.0")
