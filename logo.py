"""
routes/logo.py — Logo Competition tab endpoints

GET  /api/logo/mine     → current user's own submission (or null)
POST /api/logo/submit   → submit or replace current user's logo
GET  /api/logo/all      → all submissions (Tech Council only)
GET  /logo-uploads/<f>  → serve logo files
"""

import os
from datetime import datetime
from flask import Blueprint, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename
from db import get_connection, serialize_row
from auth import get_current_user, is_tech_council
from config import BASE_DIR

logo_bp = Blueprint("logo", __name__)

LOGO_UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "logos")
ALLOWED_LOGO_EXT = {"png", "jpg", "jpeg", "svg", "gif", "webp"}
os.makedirs(LOGO_UPLOAD_DIR, exist_ok=True)


def _allowed(filename):
    return (
        "." in filename and
        filename.rsplit(".", 1)[1].lower() in ALLOWED_LOGO_EXT
    )


# ── Get current user's own submission ─────────────────────────
@logo_bp.route("/api/logo/mine", methods=["GET"])
def get_my_logo():
    email = get_current_user()["email"]
    conn  = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM logo_submissions WHERE user_email = %s",
                (email,)
            )
            row = cur.fetchone()
        return jsonify(serialize_row(row))   # null if none
    finally:
        conn.close()


# ── Submit or replace logo ─────────────────────────────────────
@logo_bp.route("/api/logo/submit", methods=["POST"])
def submit_logo():
    email = get_current_user()["email"]

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    f = request.files["file"]
    if not f or not f.filename:
        return jsonify({"error": "Empty file"}), 400
    if not _allowed(f.filename):
        return jsonify({"error": "Invalid file type. Allowed: PNG, JPG, JPEG, SVG, GIF, WEBP"}), 400

    # Build a unique filename
    ts        = datetime.now().strftime("%Y%m%d%H%M%S%f")
    safe_name = f"{ts}_{secure_filename(f.filename)}"
    save_path = os.path.join(LOGO_UPLOAD_DIR, safe_name)

    # Delete the old file from disk if one exists
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT file_path FROM logo_submissions WHERE user_email = %s",
                (email,)
            )
            existing = cur.fetchone()

        if existing:
            old_path = os.path.join(LOGO_UPLOAD_DIR, existing["file_path"])
            if os.path.isfile(old_path):
                os.remove(old_path)

        # Save new file
        f.save(save_path)

        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO logo_submissions (user_email, file_path, file_name)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    file_path  = VALUES(file_path),
                    file_name  = VALUES(file_name),
                    updated_at = CURRENT_TIMESTAMP
            """, (email, safe_name, f.filename))
        conn.commit()
        return jsonify({"success": True})
    finally:
        conn.close()


# ── TC: view all submissions ───────────────────────────────────
@logo_bp.route("/api/logo/all", methods=["GET"])
def get_all_logos():
    if not is_tech_council():
        return jsonify({"error": "Unauthorized — Tech Council only"}), 403
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM logo_submissions ORDER BY updated_at DESC"
            )
            rows = cur.fetchall()
        return jsonify([serialize_row(r) for r in rows])
    finally:
        conn.close()


# ── Serve logo image files ─────────────────────────────────────
@logo_bp.route("/logo-uploads/<path:filename>")
def serve_logo(filename):
    return send_from_directory(LOGO_UPLOAD_DIR, filename)
