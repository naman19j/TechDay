"""
routes/logo.py — Logo Competition

GET  /api/logo/mine              → current user's own submission
POST /api/logo/submit            → submit or replace logo
GET  /api/logo/all               → all submissions (TC only)
PATCH /api/logo/<id>/status      → accept / reject (TC only)
                                   accepting one auto-resets all others to pending
GET  /api/logo/winner            → the single accepted logo (visible to all)
GET  /logo-uploads/<filename>    → serve logo files
"""

import os
from datetime import datetime
from flask import Blueprint, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename
from db import get_connection, serialize_row
from auth import get_current_user, is_tech_council
from config import BASE_DIR

logo_bp = Blueprint("logo", __name__)

LOGO_UPLOAD_DIR  = os.path.join(BASE_DIR, "uploads", "logos")
ALLOWED_LOGO_EXT = {"png", "jpg", "jpeg", "svg", "gif", "webp"}
os.makedirs(LOGO_UPLOAD_DIR, exist_ok=True)


def _allowed(filename):
    return (
        "." in filename and
        filename.rsplit(".", 1)[1].lower() in ALLOWED_LOGO_EXT
    )


# ── Current user's own submission ─────────────────────────────
@logo_bp.route("/api/logo/mine", methods=["GET"])
def get_my_logo():
    email = get_current_user()["email"]
    conn  = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM logo_submissions WHERE user_email = %s", (email,)
            )
            row = cur.fetchone()
        return jsonify(serialize_row(row))
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

    ts        = datetime.now().strftime("%Y%m%d%H%M%S%f")
    safe_name = f"{ts}_{secure_filename(f.filename)}"

    conn = get_connection()
    try:
        # Delete old file from disk if replacing
        with conn.cursor() as cur:
            cur.execute(
                "SELECT file_path FROM logo_submissions WHERE user_email = %s", (email,)
            )
            existing = cur.fetchone()
        if existing:
            old = os.path.join(LOGO_UPLOAD_DIR, existing["file_path"])
            if os.path.isfile(old):
                os.remove(old)

        f.save(os.path.join(LOGO_UPLOAD_DIR, safe_name))

        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO logo_submissions (user_email, file_path, file_name, status)
                VALUES (%s, %s, %s, 'pending')
                ON DUPLICATE KEY UPDATE
                    file_path  = VALUES(file_path),
                    file_name  = VALUES(file_name),
                    status     = 'pending',
                    updated_at = CURRENT_TIMESTAMP
            """, (email, safe_name, f.filename))
        conn.commit()
        return jsonify({"success": True})
    finally:
        conn.close()


# ── TC: accept or reject a logo ───────────────────────────────
@logo_bp.route("/api/logo/<int:lid>/status", methods=["PATCH"])
def update_logo_status(lid):
    if not is_tech_council():
        return jsonify({"error": "Unauthorized — Tech Council only"}), 403

    status = (request.json or {}).get("status")
    if status not in ("accepted", "rejected", "pending"):
        return jsonify({"error": "Invalid status"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Only one logo can be accepted at a time —
            # accepting a new one resets all others back to pending
            if status == "accepted":
                cur.execute(
                    "UPDATE logo_submissions SET status = 'pending' "
                    "WHERE status = 'accepted'"
                )
            cur.execute(
                "UPDATE logo_submissions SET status = %s WHERE id = %s",
                (status, lid)
            )
        conn.commit()
        return jsonify({"success": True})
    finally:
        conn.close()


# ── Winner — the single accepted logo (visible to all) ────────
@logo_bp.route("/api/logo/winner", methods=["GET"])
def get_winner():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM logo_submissions WHERE status = 'accepted' LIMIT 1"
            )
            row = cur.fetchone()
        return jsonify(serialize_row(row))  # null if no winner yet
    finally:
        conn.close()


# ── TC: all submissions ────────────────────────────────────────
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
