"""
routes/presentations.py — Presentations & Posters (2-phase flow)

Phase 1 — Abstract submission (everyone):
  POST /api/presentations/abstract
      Form-data: title, presenter, file (PDF/PPT/PPTX)
      Stores abstract file. One per user (enforced by user_email UNIQUE).

Phase 2 — TC review:
  PATCH /api/presentations/<id>/abstract-status
      Body: { status: 'accepted' | 'rejected' }
      Tech Council only.

Phase 3 — Final file upload (accepted submitters only):
  POST /api/presentations/<id>/file
      Form-data: file (PDF/PPT/PPTX)
      Only allowed when abstract_status == 'accepted' AND user owns it.

Read:
  GET /api/presentations/mine       → current user's row (or null)
  GET /api/presentations/accepted   → accepted + file uploaded (all users)
  GET /api/presentations/all        → everything (TC only)
  GET /uploads/<filename>           → serve files
"""

import os
from datetime import datetime
from flask import Blueprint, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename
from db import get_connection, serialize_row
from auth import get_current_user, is_tech_council
from config import UPLOAD_DIR

presentations_bp = Blueprint("presentations", __name__)

# Only PDF and PPT formats allowed for both abstract and final file
ALLOWED_EXT = {"pdf", "ppt", "pptx"}


def _allowed(filename):
    return (
        "." in filename and
        filename.rsplit(".", 1)[1].lower() in ALLOWED_EXT
    )


def _save_file(f):
    """Save an uploaded file and return the stored filename."""
    ts        = datetime.now().strftime("%Y%m%d%H%M%S%f")
    safe_name = f"{ts}_{secure_filename(f.filename)}"
    f.save(os.path.join(UPLOAD_DIR, safe_name))
    return safe_name


# ── Phase 1: Submit abstract (file upload) ─────────────────────
@presentations_bp.route("/api/presentations/abstract", methods=["POST"])
def submit_abstract():
    email = get_current_user()["email"]

    title     = (request.form.get("title")     or "").strip()
    presenter = (request.form.get("presenter") or "").strip()

    if not title or not presenter:
        return jsonify({"error": "Title and presenter are required"}), 400

    if "file" not in request.files:
        return jsonify({"error": "Abstract file is required"}), 400
    f = request.files["file"]
    if not f or not f.filename:
        return jsonify({"error": "Empty file"}), 400
    if not _allowed(f.filename):
        return jsonify({"error": "Only PDF, PPT, and PPTX files are allowed"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM presentations WHERE user_email = %s", (email,)
            )
            if cur.fetchone():
                return jsonify({
                    "error": "You have already submitted an abstract. "
                             "You cannot submit more than one."
                }), 409

        saved = _save_file(f)

        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO presentations "
                "(user_email, title, presenter, abstract_file_path, abstract_file_name) "
                "VALUES (%s, %s, %s, %s, %s)",
                (email, title, presenter, saved, f.filename)
            )
            new_id = cur.lastrowid
        conn.commit()
        return jsonify({"success": True, "id": new_id})
    finally:
        conn.close()


# ── Phase 2: TC accept / reject abstract ──────────────────────
@presentations_bp.route("/api/presentations/<int:pid>/abstract-status", methods=["PATCH"])
def update_abstract_status(pid):
    if not is_tech_council():
        return jsonify({"error": "Unauthorized — Tech Council only"}), 403

    status = (request.json or {}).get("status")
    if status not in ("accepted", "rejected", "pending"):
        return jsonify({"error": "Invalid status"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE presentations SET abstract_status = %s WHERE id = %s",
                (status, pid)
            )
        conn.commit()
        return jsonify({"success": True})
    finally:
        conn.close()


# ── Phase 3: Upload final file (accepted owner only) ──────────
@presentations_bp.route("/api/presentations/<int:pid>/file", methods=["POST"])
def upload_file(pid):
    email = get_current_user()["email"]

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT user_email, abstract_status FROM presentations WHERE id = %s",
                (pid,)
            )
            row = cur.fetchone()

        if not row:
            return jsonify({"error": "Submission not found"}), 404
        if row["user_email"] != email:
            return jsonify({"error": "You can only upload files for your own submission"}), 403
        if row["abstract_status"] != "accepted":
            return jsonify({"error": "Your abstract must be accepted before uploading a file"}), 403

        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400
        f = request.files["file"]
        if not f or not f.filename:
            return jsonify({"error": "Empty file"}), 400
        if not _allowed(f.filename):
            return jsonify({"error": "Only PDF, PPT, and PPTX files are allowed"}), 400

        saved = _save_file(f)

        with conn.cursor() as cur:
            cur.execute(
                "UPDATE presentations "
                "SET file_path = %s, file_name = %s, file_uploaded_at = NOW() "
                "WHERE id = %s",
                (saved, f.filename, pid)
            )
        conn.commit()
        return jsonify({"success": True})
    finally:
        conn.close()


# ── GET: current user's own submission ─────────────────────────
@presentations_bp.route("/api/presentations/mine", methods=["GET"])
def get_mine():
    email = get_current_user()["email"]
    conn  = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM presentations WHERE user_email = %s", (email,)
            )
            row = cur.fetchone()
        return jsonify(serialize_row(row))  # null if none
    finally:
        conn.close()


# ── GET: accepted + file-uploaded (shown to all) ───────────────
@presentations_bp.route("/api/presentations/accepted", methods=["GET"])
def get_accepted():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM presentations "
                "WHERE abstract_status = 'accepted' AND file_path IS NOT NULL "
                "ORDER BY file_uploaded_at DESC"
            )
            rows = cur.fetchall()
        return jsonify([serialize_row(r) for r in rows])
    finally:
        conn.close()


# ── GET: all submissions (TC only) ─────────────────────────────
@presentations_bp.route("/api/presentations/all", methods=["GET"])
def get_all():
    if not is_tech_council():
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM presentations ORDER BY submitted_at DESC"
            )
            rows = cur.fetchall()
        return jsonify([serialize_row(r) for r in rows])
    finally:
        conn.close()


# ── Serve uploaded files ───────────────────────────────────────
@presentations_bp.route("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(UPLOAD_DIR, filename)
