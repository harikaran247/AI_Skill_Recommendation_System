import os
import io
import json
import math
from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    from recommender import SkillRecommender, SKILL_RESOURCES
    from resume_parser import extract_skills_from_pdf
    import database as db
    from auth import (
        hash_password, 
        verify_password, 
        generate_token, 
        validate_email, 
        validate_password_strength,
        require_auth, 
        require_admin, 
        optional_auth,
        extract_token_from_header
    )
except ImportError:
    from backend.recommender import SkillRecommender, SKILL_RESOURCES
    from backend.resume_parser import extract_skills_from_pdf
    import backend.database as db
    from backend.auth import (
        hash_password, 
        verify_password, 
        generate_token, 
        validate_email, 
        validate_password_strength,
        require_auth, 
        require_admin, 
        optional_auth,
        extract_token_from_header
    )

app = Flask(__name__)
# Enable CORS for all routes (frontend on Vite default 5173 / localhost)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Initialize recommender instance
recommender = SkillRecommender()

SAMPLE_PROFILES = [
    {
        "id": "sample-1",
        "title": "Beginner to Full Stack Developer",
        "career_goal": "Full Stack Developer",
        "skills": ["HTML", "CSS", "JavaScript"],
        "description": "Knows basic frontend web trio, needs backend, DB & deployment."
    },
    {
        "id": "sample-2",
        "title": "Python Developer aspiring AI Engineer",
        "career_goal": "AI Engineer",
        "skills": ["Python", "NumPy", "Pandas", "Statistics and Probability"],
        "description": "Strong foundational data skills, ready to level up into ML, DL, and PyTorch."
    },
    {
        "id": "sample-3",
        "title": "Excel Analyst moving to Data Analyst",
        "career_goal": "Data Analyst",
        "skills": ["Excel", "SQL"],
        "description": "Proficient in spreadsheets and SQL queries, wants Python, BI dashboards and EDA."
    },
    {
        "id": "sample-4",
        "title": "SysAdmin transitioning to Cloud Engineer",
        "career_goal": "Cloud Engineer",
        "skills": ["Computer Networking", "Linux Fundamentals", "Python or Bash Scripting"],
        "description": "Strong OS and networking experience, aiming for AWS, Docker, IaC and CI/CD."
    },
    {
        "id": "sample-5",
        "title": "Graphic Designer to UI/UX Specialist",
        "career_goal": "UI/UX Designer",
        "skills": ["Design Principles", "Color and Typography", "Figma"],
        "description": "Great visual eye, needing user research, wireframing, usability tests and handoff."
    }
]

# ----------------------------------------------------
# General & ML Recommendation Endpoints
# ----------------------------------------------------

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "service": "AI-Based Skill Recommendation API",
        "model_loaded": recommender.pipeline is not None,
        "dataset_verified_rows": 1640
    })

@app.route('/api/careers', methods=['GET'])
def get_careers():
    careers_data = []
    for career, req_skills in recommender.career_skills_map.items():
        careers_data.append({
            "name": career,
            "required_skills": req_skills,
            "skill_count": len(req_skills),
            "core_skills_preview": req_skills[:4]
        })
    return jsonify({
        "success": True,
        "count": len(careers_data),
        "careers": careers_data
    })

@app.route('/api/all-skills', methods=['GET'])
def get_all_skills():
    """Return all unique canonical skills across all career tracks"""
    all_skills = sorted(list(SKILL_RESOURCES.keys()))
    return jsonify({
        "success": True,
        "skills": all_skills,
        "count": len(all_skills)
    })

@app.route('/api/sample-profiles', methods=['GET'])
def get_sample_profiles():
    return jsonify({
        "success": True,
        "samples": SAMPLE_PROFILES
    })

@app.route('/api/recommend', methods=['POST'])
@optional_auth
def recommend():
    try:
        data = request.get_json() or {}
        career_goal = data.get('career_goal')
        existing_skills = data.get('existing_skills') if data.get('existing_skills') is not None else data.get('skills', [])

        result = recommender.recommend(career_goal, existing_skills)
        
        # Log to assessment_history and persist for user if logged in
        user_id = request.current_user['id'] if getattr(request, 'current_user', None) else None
        if user_id:
            effective_career = career_goal or result.get('career_goal')
            if effective_career:
                db.update_user_career_goal(user_id, effective_career)
            db.save_user_assessment_and_roadmap(
                user_id=user_id,
                career_goal=effective_career or "Skills Exploration",
                existing_skills=existing_skills,
                match_percentage=result.get('match_percentage', 0.0),
                recommended_next_skill=result.get('recommended_next_skill', ''),
                roadmap=result
            )
        else:
            db.log_anonymous_recommendation(
                career_goal=career_goal or result.get('career_goal') or "Skills Exploration",
                existing_skills=existing_skills,
                match_percentage=result.get('match_percentage', 0.0),
                recommended_next_skill=result.get('recommended_next_skill', ''),
                roadmap=result
            )

        return jsonify(result)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Recommendation failed: {str(e)}"
        }), 500

@app.route('/api/upload-resume', methods=['POST'])
def upload_resume():
    try:
        if 'resume' not in request.files:
            return jsonify({
                "success": False,
                "error": "No resume file provided. Please upload a PDF file."
            }), 400

        file = request.files['resume']
        if file.filename == '' or not file.filename.lower().endswith('.pdf'):
            return jsonify({
                "success": False,
                "error": "Invalid file format. Please upload a PDF document (.pdf)."
            }), 400

        file_stream = io.BytesIO(file.read())
        extraction_result = extract_skills_from_pdf(file_stream)
        
        return jsonify(extraction_result)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to process resume: {str(e)}"
        }), 500

@app.route('/api/model-info', methods=['GET'])
def get_model_info():
    """Return actual verified dataset statistics and evaluation metrics"""
    return jsonify({
        "success": True,
        "metrics": recommender.metrics_data.get('evaluation_metrics', {}),
        "dataset_verification": recommender.metrics_data.get('dataset_verification', {})
    })

# ----------------------------------------------------
# Authentication Endpoints
# ----------------------------------------------------

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json() or {}
        full_name = data.get('full_name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        confirm_password = data.get('confirm_password', '')
        career_goal = data.get('career_goal')

        if not full_name:
            return jsonify({"success": False, "error": "Full name is required."}), 400

        if not validate_email(email):
            return jsonify({"success": False, "error": "Please provide a valid email address."}), 400

        if not password:
            return jsonify({"success": False, "error": "Password is required."}), 400

        if password != confirm_password:
            return jsonify({"success": False, "error": "Passwords do not match."}), 400

        is_valid, err_msg, _ = validate_password_strength(password)
        if not is_valid:
            return jsonify({"success": False, "error": err_msg}), 400

        # Check for existing email registration
        existing = db.get_user_by_email(email)
        if existing:
            return jsonify({
                "success": False, 
                "error": "An account with this email address is already registered. Please sign in instead."
            }), 409

        # Hash password securely
        pwd_hash = hash_password(password)

        # Create user - regular signup ALWAYS creates role 'user', never 'admin'
        user_id = db.create_user(
            full_name=full_name,
            email=email,
            password_hash=pwd_hash,
            role='user',
            career_goal=career_goal
        )

        existing_skills = data.get('existing_skills', [])
        if isinstance(existing_skills, str):
            existing_skills = [s.strip() for s in existing_skills.split(',') if s.strip()]
        elif not isinstance(existing_skills, list):
            existing_skills = []

        if existing_skills:
            db.set_user_skills(user_id, existing_skills)

        # Automatically generate initial roadmap if career_goal is specified
        if career_goal:
            try:
                rec_result = recommender.recommend(career_goal, existing_skills)
                db.save_user_assessment_and_roadmap(
                    user_id=user_id,
                    career_goal=career_goal,
                    existing_skills=existing_skills,
                    match_percentage=rec_result.get('match_percentage', 0.0),
                    recommended_next_skill=rec_result.get('recommended_next_skill', ''),
                    roadmap=rec_result
                )
            except Exception as rec_err:
                app.logger.warning(f"Initial roadmap generation error: {rec_err}")

        user = db.get_user_by_id(user_id)
        token = generate_token(user)

        safe_user = {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user["role"],
            "career_goal": user["career_goal"],
            "created_at": user["created_at"],
            "status": user["status"]
        }

        return jsonify({
            "success": True,
            "message": "Registration successful! Welcome to AI Skill Recommender.",
            "token": token,
            "user": safe_user
        }), 201

    except Exception as e:
        return jsonify({"success": False, "error": f"Registration failed: {str(e)}"}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({"success": False, "error": "Email and password are required."}), 400

        user = db.get_user_by_email(email)
        if not user or not verify_password(password, user['password_hash']):
            return jsonify({"success": False, "error": "Invalid email or password."}), 401

        if user.get('status') == 'inactive':
            return jsonify({
                "success": False, 
                "error": "This account is inactive. Please contact an administrator."
            }), 403

        # Update last login timestamp
        db.update_user_last_login(user['id'])

        token = generate_token(user)

        safe_user = {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user["role"],
            "career_goal": user["career_goal"],
            "created_at": user["created_at"],
            "last_login": user["last_login"],
            "status": user["status"]
        }

        return jsonify({
            "success": True,
            "message": "Login successful.",
            "token": token,
            "user": safe_user
        })

    except Exception as e:
        return jsonify({"success": False, "error": f"Login failed: {str(e)}"}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    token = extract_token_from_header()
    if token:
        db.revoke_token(token)
    return jsonify({
        "success": True,
        "message": "Logged out successfully."
    })

@app.route('/api/auth/me', methods=['GET'])
@require_auth
def get_current_user():
    user = request.current_user
    safe_user = {
        "id": user["id"],
        "full_name": user["full_name"],
        "email": user["email"],
        "role": user["role"],
        "career_goal": user["career_goal"],
        "created_at": user["created_at"],
        "last_login": user["last_login"],
        "status": user["status"]
    }
    return jsonify({
        "success": True,
        "user": safe_user
    })

# ----------------------------------------------------
# User Dashboard & Personalized Data Endpoints
# ----------------------------------------------------

@app.route('/api/user/dashboard', methods=['GET'])
@require_auth
def user_dashboard_data():
    try:
        user_id = request.current_user['id']
        skills = db.get_user_skills(user_id)
        user_info = db.get_user_by_id(user_id)
        
        career_goal = user_info.get("career_goal") or "AI Engineer"
        user_skill_names = [s['skill_name'] for s in skills]
        progress_data = db.get_user_learning_progress(user_id, career_goal=career_goal)
        rec = {}
        try:
            rec = recommender.recommend(career_goal, user_skill_names)
            # If user has no progress items saved yet for this career goal, automatically initialize from roadmap
            if len(progress_data.get("items", [])) == 0 and rec.get("learning_roadmap"):
                db.save_user_assessment_and_roadmap(
                    user_id=user_id,
                    career_goal=career_goal,
                    existing_skills=user_skill_names,
                    match_percentage=rec.get("match_percentage", 0.0),
                    recommended_next_skill=rec.get("recommended_next_skill", ""),
                    roadmap=rec
                )
                progress_data = db.get_user_learning_progress(user_id, career_goal=career_goal)
        except Exception as e:
            app.logger.warning(f"Recommender error for dashboard: {e}")

        return jsonify({
            "success": True,
            "user": {
                "id": user_info["id"],
                "full_name": user_info["full_name"],
                "email": user_info["email"],
                "role": user_info["role"],
                "career_goal": user_info.get("career_goal"),
                "created_at": user_info["created_at"],
                "last_login": user_info["last_login"]
            },
            "skills": skills,
            "progress": progress_data["items"],
            "metrics": progress_data["metrics"],
            "recommendation": rec
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/user/progress/<int:progress_id>', methods=['PATCH'])
@require_auth
def update_user_progress(progress_id):
    try:
        user_id = request.current_user['id']
        data = request.get_json() or {}
        status = data.get('status')
        project_completed = data.get('project_completed')
        notes = data.get('notes')

        if status and status not in ['not_started', 'in_progress', 'completed']:
            return jsonify({"success": False, "error": "Invalid status value."}), 400

        success = db.update_user_learning_progress(
            progress_id=progress_id,
            user_id=user_id,
            status=status,
            project_completed=project_completed,
            notes=notes
        )

        if not success:
            return jsonify({"success": False, "error": "Progress item not found or unauthorized."}), 404

        user_info = db.get_user_by_id(user_id)
        career_goal = (user_info.get('career_goal') if user_info else None) or 'AI Engineer'

        progress_data = db.get_user_learning_progress(user_id, career_goal=career_goal)
        user_skills_docs = db.get_user_skills(user_id)
        user_skills_names = [s['skill_name'] for s in user_skills_docs]

        rec_result = recommender.recommend(career_goal, user_skills_names)

        # Save updated assessment in assessment_history
        if user_id and rec_result:
            db.save_user_assessment_and_roadmap(
                user_id=user_id,
                career_goal=career_goal,
                existing_skills=user_skills_names,
                match_percentage=rec_result.get('match_percentage', 0.0),
                recommended_next_skill=rec_result.get('recommended_next_skill', ''),
                roadmap=rec_result
            )

        return jsonify({
            "success": True,
            "message": "Progress item updated successfully.",
            "metrics": progress_data["metrics"],
            "progress": progress_data["items"],
            "progress_items": progress_data["items"],
            "skills": user_skills_docs,
            "recommendation": rec_result,
            "match_percentage": rec_result.get('match_percentage', 0.0)
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/user/toggle-progress-topic', methods=['POST'])
@require_auth
def toggle_progress_topic():
    try:
        user_id = request.current_user['id']
        data = request.get_json() or {}
        skill_name = data.get('skill_name')
        career_goal = data.get('career_goal')
        completed = bool(data.get('completed', True))

        if not skill_name or not str(skill_name).strip():
            return jsonify({"success": False, "error": "skill_name is required."}), 400

        progress_result = db.toggle_user_skill_progress(
            user_id=user_id,
            skill_name=skill_name.strip(),
            career_goal=career_goal,
            completed=completed
        )

        user_skills_docs = db.get_user_skills(user_id)
        user_skills_names = [s['skill_name'] for s in user_skills_docs]
        
        user_info = db.get_user_by_id(user_id)
        effective_career = career_goal or (user_info.get('career_goal') if user_info else None) or 'AI Engineer'

        rec_result = recommender.recommend(effective_career, user_skills_names)

        if user_id and rec_result:
            db.save_user_assessment_and_roadmap(
                user_id=user_id,
                career_goal=effective_career,
                existing_skills=user_skills_names,
                match_percentage=rec_result.get('match_percentage', 0.0),
                recommended_next_skill=rec_result.get('recommended_next_skill', ''),
                roadmap=rec_result
            )

        return jsonify({
            "success": True,
            "message": f"Progress updated for {skill_name}.",
            "metrics": progress_result["metrics"],
            "progress": progress_result["items"],
            "progress_items": progress_result["items"],
            "skills": user_skills_docs,
            "recommendation": rec_result,
            "match_percentage": rec_result.get('match_percentage', 0.0)
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/user/save-roadmap', methods=['POST'])
@require_auth
def save_user_roadmap():
    try:
        user_id = request.current_user['id']
        data = request.get_json() or {}
        career_goal = data.get('career_goal')
        existing_skills = data.get('existing_skills', [])
        match_percentage = data.get('match_percentage', 0.0)
        recommended_next_skill = data.get('recommended_next_skill', '')
        roadmap = data.get('roadmap', {})

        if not career_goal:
            return jsonify({"success": False, "error": "career_goal is required."}), 400

        db.save_user_assessment_and_roadmap(
            user_id=user_id,
            career_goal=career_goal,
            existing_skills=existing_skills,
            match_percentage=match_percentage,
            recommended_next_skill=recommended_next_skill,
            roadmap=roadmap
        )

        return jsonify({
            "success": True,
            "message": "Roadmap and skills saved to your personal dashboard."
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/user/skills', methods=['POST'])
@require_auth
def manage_user_skills():
    try:
        user_id = request.current_user['id']
        data = request.get_json() or {}
        new_skills = data.get('skills')
        add_skill = data.get('add_skill')
        remove_skill = data.get('remove_skill')

        current_skills_rows = db.get_user_skills(user_id)
        current_skills = [r['skill_name'] for r in current_skills_rows]

        if new_skills is not None:
            if isinstance(new_skills, str):
                updated_skills = [s.strip() for s in new_skills.split(',') if s.strip()]
            else:
                updated_skills = [s.strip() for s in new_skills if s and s.strip()]
        elif add_skill:
            add_skill = add_skill.strip()
            if not any(s.lower() == add_skill.lower() for s in current_skills):
                updated_skills = current_skills + [add_skill]
            else:
                updated_skills = current_skills
        elif remove_skill:
            remove_skill = remove_skill.strip().lower()
            updated_skills = [s for s in current_skills if s.lower() != remove_skill]
        else:
            return jsonify({"success": False, "error": "No skills provided to update."}), 400

        db.set_user_skills(user_id, updated_skills)

        user_info = db.get_user_by_id(user_id)
        career_goal = user_info.get('career_goal') or 'AI Engineer'

        # Recalculate recommendation and update roadmap
        try:
            rec_result = recommender.recommend(career_goal, updated_skills)
            db.save_user_assessment_and_roadmap(
                user_id=user_id,
                career_goal=career_goal,
                existing_skills=updated_skills,
                match_percentage=rec_result.get('match_percentage', 0.0),
                recommended_next_skill=rec_result.get('recommended_next_skill', ''),
                roadmap=rec_result
            )
        except Exception as rec_err:
            app.logger.warning(f"Error recalculating roadmap after skill update: {rec_err}")

        # Return refreshed user state
        refreshed_skills = db.get_user_skills(user_id)
        progress_data = db.get_user_learning_progress(user_id, career_goal=career_goal)

        return jsonify({
            "success": True,
            "message": "Skills updated successfully and learning roadmap refreshed.",
            "skills": refreshed_skills,
            "progress": progress_data["items"],
            "metrics": progress_data["metrics"],
            "recommendation": rec_result
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/user/career-goal', methods=['PUT'])
@require_auth
def update_career_goal():
    try:
        user_id = request.current_user['id']
        data = request.get_json() or {}
        new_career_goal = data.get('career_goal', '').strip()

        if not new_career_goal:
            return jsonify({"success": False, "error": "career_goal is required."}), 400

        db.update_user_career_goal(user_id, new_career_goal)

        current_skills_rows = db.get_user_skills(user_id)
        current_skills = [r['skill_name'] for r in current_skills_rows]

        rec_result = {}
        try:
            rec_result = recommender.recommend(new_career_goal, current_skills)
            db.save_user_assessment_and_roadmap(
                user_id=user_id,
                career_goal=new_career_goal,
                existing_skills=current_skills,
                match_percentage=rec_result.get('match_percentage', 0.0),
                recommended_next_skill=rec_result.get('recommended_next_skill', ''),
                roadmap=rec_result
            )
        except Exception as rec_err:
            app.logger.warning(f"Error recalculating roadmap after career goal update: {rec_err}")

        user_info = db.get_user_by_id(user_id)
        progress_data = db.get_user_learning_progress(user_id)

        return jsonify({
            "success": True,
            "message": f"Career goal updated to {new_career_goal} and learning roadmap regenerated.",
            "user": {
                "id": user_info["id"],
                "full_name": user_info["full_name"],
                "email": user_info["email"],
                "role": user_info["role"],
                "career_goal": user_info["career_goal"],
                "created_at": user_info["created_at"],
                "last_login": user_info["last_login"]
            },
            "progress": progress_data["items"],
            "metrics": progress_data["metrics"],
            "recommendation": rec_result
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ----------------------------------------------------
# Admin Dashboard Endpoints (Protected with @require_admin)
# ----------------------------------------------------

@app.route('/api/admin/stats', methods=['GET'])
@require_admin
def admin_stats():
    try:
        stats = db.get_admin_dashboard_stats()
        return jsonify({
            "success": True,
            "stats": stats
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/admin/users', methods=['GET'])
@require_admin
def admin_users_list():
    try:
        search = request.args.get('search', '').strip()
        sort_by = request.args.get('sort_by', 'created_at')
        sort_dir = request.args.get('sort_dir', 'desc')
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(50, max(1, int(request.args.get('per_page', 10))))

        users, total_count = db.get_all_users_paginated(
            search=search,
            sort_by=sort_by,
            sort_dir=sort_dir,
            page=page,
            per_page=per_page
        )

        total_pages = math.ceil(total_count / per_page) if total_count > 0 else 1

        return jsonify({
            "success": True,
            "users": users,
            "total": total_count,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/admin/users/<int:user_id>', methods=['GET'])
@require_admin
def admin_user_detail(user_id):
    try:
        detail = db.get_user_detail_admin(user_id)
        if not detail:
            return jsonify({"success": False, "error": "User not found."}), 404
        return jsonify({
            "success": True,
            **detail
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/admin/users/<int:user_id>/status', methods=['PATCH'])
@require_admin
def admin_update_user_status(user_id):
    try:
        admin_id = request.current_user['id']
        if admin_id == user_id:
            return jsonify({"success": False, "error": "You cannot change your own administrator status."}), 400

        data = request.get_json() or {}
        new_status = data.get('status')
        if new_status not in ['active', 'inactive']:
            return jsonify({"success": False, "error": "Status must be 'active' or 'inactive'."}), 400

        user = db.get_user_by_id(user_id)
        if not user:
            return jsonify({"success": False, "error": "User not found."}), 404

        db.update_user_status(user_id, new_status)
        return jsonify({
            "success": True,
            "message": f"User status successfully updated to {new_status}."
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ----------------------------------------------------
# Legacy User Profile endpoints (Preserved exactly)
# ----------------------------------------------------

@app.route('/api/profiles/save', methods=['POST'])
@optional_auth
def save_user_profile():
    try:
        data = request.get_json() or {}
        name = data.get('name', 'Anonymous User').strip() or 'Anonymous User'
        career_goal = data.get('career_goal')
        existing_skills = data.get('existing_skills', [])
        match_percentage = data.get('match_percentage', 0.0)
        recommended_next_skill = data.get('recommended_next_skill', '')
        roadmap = data.get('roadmap', {})

        if not career_goal:
            return jsonify({"success": False, "error": "career_goal is required."}), 400

        profile_id = db.save_profile(
            name=name,
            career_goal=career_goal,
            existing_skills=existing_skills,
            match_percentage=match_percentage,
            recommended_next_skill=recommended_next_skill,
            roadmap=roadmap
        )

        # If user is logged in, also update their account
        user_id = request.current_user['id'] if getattr(request, 'current_user', None) else None
        if user_id:
            db.save_user_assessment_and_roadmap(
                user_id=user_id,
                career_goal=career_goal,
                existing_skills=existing_skills,
                match_percentage=match_percentage,
                recommended_next_skill=recommended_next_skill,
                roadmap=roadmap
            )

        return jsonify({
            "success": True,
            "profile_id": profile_id,
            "message": "Profile saved successfully! Learning progress initialized."
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/profiles', methods=['GET'])
def list_profiles():
    try:
        profiles = db.get_profiles()
        return jsonify({
            "success": True,
            "profiles": profiles
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/profiles/<int:profile_id>/progress', methods=['GET'])
def get_progress(profile_id):
    try:
        data = db.get_profile_progress(profile_id)
        if not data:
            return jsonify({"success": False, "error": "Profile not found."}), 404
        return jsonify({
            "success": True,
            **data
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/progress/<int:progress_id>', methods=['PATCH'])
def update_progress(progress_id):
    try:
        data = request.get_json() or {}
        status = data.get('status', 'not_started')
        project_completed = data.get('project_completed')
        notes = data.get('notes')

        if status not in ['not_started', 'in_progress', 'completed']:
            return jsonify({"success": False, "error": "Invalid status value."}), 400

        db.update_skill_status(progress_id, status, project_completed, notes)
        return jsonify({
            "success": True,
            "message": "Skill progress updated successfully."
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/profiles/<int:profile_id>', methods=['DELETE'])
def delete_profile_endpoint(profile_id):
    try:
        db.delete_profile(profile_id)
        return jsonify({"success": True, "message": "Profile deleted."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.after_request
def set_no_cache_headers(response):
    if request.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    return response

if __name__ == '__main__':
    # Run Flask on port 5000
    app.run(host='127.0.0.1', port=5000, debug=True)
