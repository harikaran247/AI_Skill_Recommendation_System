import os
import re
from datetime import datetime, timedelta, timezone
from functools import wraps
import jwt
from flask import request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

try:
    import database as db
except ImportError:
    from backend import database as db

JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'ai-skill-rec-secure-jwt-secret-key-3f8a9e2d1c')
JWT_ALGORITHM = 'HS256'
TOKEN_EXPIRATION_HOURS = 24

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def validate_email(email):
    if not email or not isinstance(email, str):
        return False
    return bool(EMAIL_REGEX.match(email.strip()))

def validate_password_strength(password):
    """
    Returns (is_valid, error_message, strength_score)
    strength_score: 0 to 4
    """
    if not password or len(password) < 6:
        return False, "Password must be at least 6 characters long.", 1
        
    score = 0
    if len(password) >= 8:
        score += 1
    if re.search(r"[A-Z]", password):
        score += 1
    if re.search(r"[0-9]", password):
        score += 1
    if re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        score += 1
        
    return True, "", max(1, score)

def hash_password(password):
    return generate_password_hash(password)

def verify_password(password, password_hash):
    return check_password_hash(password_hash, password)

import uuid

def generate_token(user):
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "full_name": user["full_name"],
        "iat": now,
        "exp": now + timedelta(hours=TOKEN_EXPIRATION_HOURS),
        "jti": str(uuid.uuid4())
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def extract_token_from_header():
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header.split(' ', 1)[1].strip()
    return None

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = extract_token_from_header()
        if not token:
            return jsonify({
                "success": False,
                "error": "Authentication token is missing. Please log in."
            }), 401
            
        if db.is_token_revoked(token):
            return jsonify({
                "success": False,
                "error": "This session has been logged out. Please sign in again."
            }), 401
            
        payload = decode_token(token)
        if not payload:
            return jsonify({
                "success": False,
                "error": "Authentication token is invalid or has expired. Please log in again."
            }), 401
            
        user = db.get_user_by_id(payload.get('user_id'))
        if not user:
            return jsonify({
                "success": False,
                "error": "User account no longer exists."
            }), 401
            
        if user.get('status') == 'inactive':
            return jsonify({
                "success": False,
                "error": "Your account has been deactivated. Please contact an administrator."
            }), 403
            
        request.current_user = user
        return f(*args, **kwargs)
    return decorated

def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = extract_token_from_header()
        if not token:
            return jsonify({
                "success": False,
                "error": "Admin authentication required. Token missing."
            }), 401
            
        if db.is_token_revoked(token):
            return jsonify({
                "success": False,
                "error": "This administrator session has been logged out. Please sign in again."
            }), 401
            
        payload = decode_token(token)
        if not payload:
            return jsonify({
                "success": False,
                "error": "Admin session expired or invalid. Please sign in again."
            }), 401
            
        user = db.get_user_by_id(payload.get('user_id'))
        if not user:
            return jsonify({
                "success": False,
                "error": "Admin user not found."
            }), 401
            
        if user.get('status') == 'inactive':
            return jsonify({
                "success": False,
                "error": "Admin account is inactive."
            }), 403
            
        if user.get('role') != 'admin':
            return jsonify({
                "success": False,
                "error": "Access denied. Administrator privileges are required to access this resource."
            }), 403
            
        request.current_user = user
        return f(*args, **kwargs)
    return decorated

def optional_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = extract_token_from_header()
        request.current_user = None
        if token and not db.is_token_revoked(token):
            payload = decode_token(token)
            if payload:
                user = db.get_user_by_id(payload.get('user_id'))
                if user and user.get('status') != 'inactive':
                    request.current_user = user
        return f(*args, **kwargs)
    return decorated
