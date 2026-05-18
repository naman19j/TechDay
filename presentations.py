"""
routes/presentations.py — Presentations & Posters (2-phase flow)

Phase 1 — Abstract submission (everyone):
  POST /api/presentations/abstract
      Body: { title, presenter, abstract }
      Creates a pending row. One abstract per user (checked by user_email).

Phase 2 — TC review:
  PATCH /api/presentations/<id>/abstract-status
      Body: { status: 'accepted' | 'rejected' }
      Tech Council only.

Phase 3 — File upload (accepted submitters only):
  POST /api/presentations/<id>/file
      Form-data: file
      Only allowed when abstract_status == 'accepted' AND
      the requesting user owns this submission.

Read endpoints:
  GET /api/presentations/mine          → current user's own submission (or null)
  GET /api/presentations/accepted      → all accepted + file-uploaded (visible to all)
  GET /api/presentations/all           → everything (TC only)

  GET /uploads/<filename>              → serve uploaded files
"""

import os
from datetime import datetime
from flask import Blueprint, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename
from db import get_connection, serialize_row
from auth import get_current_user, is_tech_council
from config import UPLOAD_DIR, ALLOWED_EXTENSIONS

presentations_bp = Blueprint("presentations", __name__)


def _allowed(filename):
    return (
        "." in filename and
        filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


# ── Phase 1: Submit abstract ───────────────────────────────────
@presentations_bp.route("/api/presentations/abstract", methods=["POST"])
def submit_abstract():
    email = get_current_user()["email"]
    d     = request.json or {}

    title     = (d.get("title")     or "").strip()
    presenter = (d.get("presenter") or "").strip()
    abstract  = (d.get("abstract")  or "").strip()

    if not title or not presenter or not abstract:
        return jsonify({"error": "Title, presenter and abstract are all required"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Prevent duplicate — one abstract per user
            cur.execute(
                "SELECT id FROM presentations WHERE user_email = %s", (email,)
            )
            if cur.fetchone():
                return jsonify({"error": "You have already submitted an abstract. "
                                         "You cannot submit more than one."}), 409
            cur.execute(
                "INSERT INTO presentations (user_email, title, presenter, abstract) "
                "VALUES (%s, %s, %s, %s)",
                (email, title, presenter, abstract)
            )
            new_id = cur.lastrowid
        conn.commit()
        return jsonify({"success": True, "id": new_id})
    finally:
        conn.close()


# ── Phase 2: TC — accept or reject abstract ────────────────────
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


# ── Phase 3: Upload full file (accepted submitter only) ────────
@presentations_bp.route("/api/presentations/<int:pid>/file", methods=["POST"])
def upload_file(pid):
    email = get_current_user()["email"]

    # Verify ownership and accepted status
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
            return jsonify({"error": "Invalid file type. Allowed: PDF, PPT, PPTX, images"}), 400

        ts        = datetime.now().strftime("%Y%m%d%H%M%S%f")
        safe_name = f"{ts}_{secure_filename(f.filename)}"
        f.save(os.path.join(UPLOAD_DIR, safe_name))

        with conn.cursor() as cur:
            cur.execute(
                "UPDATE presentations "
                "SET file_path = %s, file_name = %s, file_uploaded_at = NOW() "
                "WHERE id = %s",
                (safe_name, f.filename, pid)
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
        return jsonify(serialize_row(row))   # null if none
    finally:
        conn.close()


# ── GET: accepted + file-uploaded (shown to all users) ─────────
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
