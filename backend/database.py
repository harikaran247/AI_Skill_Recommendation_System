import os
import re
import json
import sqlite3
from datetime import datetime, timedelta

# Try importing PyMongo safely
try:
    import pymongo
    from bson.objectid import ObjectId
    HAS_PYMONGO = True
except ImportError:
    try:
        import pymongo
        from bson import ObjectId
        HAS_PYMONGO = True
    except ImportError:
        HAS_PYMONGO = False
        pymongo = None
        ObjectId = None

# ----------------------------------------------------
# Database Configuration (MongoDB Primary, SQLite Fallback)
# ----------------------------------------------------
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://127.0.0.1:27017')
DB_NAME = os.environ.get('MONGO_DB_NAME', 'skill_recommendation')
DB_PATH = os.path.join(os.path.dirname(__file__), 'skill_recommendation.db')

_client = None
_db = None
_use_mongo = None

def get_mongo_client():
    global _client
    if not HAS_PYMONGO:
        return None
    if _client is None:
        try:
            _client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        except Exception:
            _client = None
    return _client

def is_mongo_connected():
    global _use_mongo
    if not HAS_PYMONGO:
        return False
    try:
        client = get_mongo_client()
        if client is not None:
            client.admin.command('ping')
            _use_mongo = True
            return True
    except Exception:
        pass
    _use_mongo = False
    return False

def get_db():
    """Return MongoDB database instance if available, else None."""
    global _db
    if not is_mongo_connected():
        return None
    if _db is None:
        client = get_mongo_client()
        if client:
            _db = client[DB_NAME]
    return _db

def get_sqlite_conn():
    """Return connection to SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def get_db_connection():
    """Compatibility helper returning MongoDB database if connected, else SQLite connection."""
    if is_mongo_connected():
        return get_db()
    return get_sqlite_conn()

def get_next_sequence_value(sequence_name):
    """Atomic auto-incrementing integer sequence generator for collections in MongoDB."""
    db_conn = get_db()
    if db_conn is not None:
        try:
            seq_doc = db_conn['counters'].find_one_and_update(
                {'_id': sequence_name},
                {'$inc': {'seq': 1}},
                upsert=True,
                return_document=pymongo.ReturnDocument.AFTER
            )
            return int(seq_doc['seq'])
        except Exception:
            pass
    return int(datetime.now().timestamp() * 1000)

def format_doc(doc):
    """Format MongoDB document into clean JSON-serializable dictionary with integer/string id."""
    if not doc:
        return None
    d = dict(doc)
    if '_id' in d:
        d['_id'] = str(d['_id'])
    if 'id' not in d and '_id' in d:
        d['id'] = d['_id']
    return d

def format_docs(cursor):
    """Format multiple documents from a MongoDB cursor."""
    if cursor is None:
        return []
    return [format_doc(d) for d in cursor]

def parse_id(val):
    """Normalize ID to integer if numeric, or string/ObjectId."""
    if val is None:
        return None
    if isinstance(val, int):
        return val
    s = str(val).strip()
    if s.isdigit():
        return int(s)
    return s

def build_id_query(field_name, val):
    """Query helper matching either integer ID, string ID, or ObjectId."""
    parsed = parse_id(val)
    candidates = [{field_name: parsed}]
    if isinstance(parsed, int):
        candidates.append({field_name: str(parsed)})
    elif isinstance(parsed, str) and ObjectId and ObjectId.is_valid(parsed):
        candidates.append({field_name: ObjectId(parsed)})
        candidates.append({field_name: str(parsed)})
    return {'$or': candidates}

# ----------------------------------------------------
# Initialization Functions
# ----------------------------------------------------

def init_db():
    """Initialize collections/indexes in MongoDB and schema in SQLite."""
    # 1. MongoDB Initialization
    if is_mongo_connected():
        try:
            db_conn = get_db()
            if db_conn is not None:
                db_conn['users'].create_index([("email", pymongo.ASCENDING)], unique=True)
                db_conn['users'].create_index([("id", pymongo.ASCENDING)], unique=True)
                db_conn['user_skills'].create_index([("user_id", pymongo.ASCENDING)])
                db_conn['learning_progress'].create_index([("user_id", pymongo.ASCENDING)])
                db_conn['revoked_tokens'].create_index([("token", pymongo.ASCENDING)], unique=True)
                db_conn['assessment_history'].create_index([("user_id", pymongo.ASCENDING)])
                db_conn['user_profiles'].create_index([("id", pymongo.ASCENDING)], unique=True)
        except Exception as e:
            print(f"MongoDB index check note: {e}")

    # 2. SQLite Schema Preservation (Always safe)
    try:
        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                career_goal TEXT,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS user_skills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                skill_name TEXT NOT NULL,
                proficiency_level TEXT DEFAULT 'Intermediate',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS learning_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                skill_name TEXT NOT NULL,
                career_goal TEXT,
                status TEXT DEFAULT 'not_started',
                progress_percentage REAL DEFAULT 0.0,
                suggested_project TEXT,
                project_completed INTEGER DEFAULT 0,
                priority TEXT DEFAULT 'High',
                notes TEXT DEFAULT '',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS user_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                career_goal TEXT NOT NULL,
                existing_skills TEXT NOT NULL,
                match_percentage REAL DEFAULT 0.0,
                recommended_next_skill TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS user_skill_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id INTEGER NOT NULL,
                skill_name TEXT NOT NULL,
                career_goal TEXT NOT NULL,
                status TEXT DEFAULT 'not_started',
                priority TEXT DEFAULT 'High',
                suggested_project TEXT,
                project_completed INTEGER DEFAULT 0,
                notes TEXT DEFAULT '',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (profile_id) REFERENCES user_profiles(id) ON DELETE CASCADE
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS assessment_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id INTEGER,
                user_id INTEGER,
                career_goal TEXT,
                existing_skills TEXT,
                match_percentage REAL,
                recommended_next_skill TEXT,
                roadmap_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS revoked_tokens (
                token TEXT PRIMARY KEY,
                revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"SQLite schema check note: {e}")

# ----------------------------------------------------
# Token Revocation Management
# ----------------------------------------------------

def revoke_token(token):
    if not token or not str(token).strip():
        return False
    tok = str(token).strip()
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if is_mongo_connected():
        try:
            db_conn = get_db()
            db_conn['revoked_tokens'].update_one(
                {'token': tok},
                {'$set': {'token': tok, 'revoked_at': now_str}},
                upsert=True
            )
            return True
        except Exception:
            pass

    try:
        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("INSERT OR REPLACE INTO revoked_tokens (token, revoked_at) VALUES (?, ?)", (tok, now_str))
        conn.commit()
        conn.close()
        return True
    except Exception:
        return False

def is_token_revoked(token):
    if not token or not str(token).strip():
        return True
    tok = str(token).strip()

    if is_mongo_connected():
        try:
            db_conn = get_db()
            return db_conn['revoked_tokens'].find_one({'token': tok}) is not None
        except Exception:
            pass

    try:
        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("SELECT token FROM revoked_tokens WHERE token = ?", (tok,))
        row = cur.fetchone()
        conn.close()
        return bool(row)
    except Exception:
        return False

# ----------------------------------------------------
# User Authentication & Management Queries
# ----------------------------------------------------

def create_user(full_name, email, password_hash, role='user', career_goal=None):
    clean_name = str(full_name).strip()
    clean_email = str(email).strip().lower()
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if is_mongo_connected():
        try:
            db_conn = get_db()
            user_id = get_next_sequence_value('users')
            user_doc = {
                'id': user_id,
                'full_name': clean_name,
                'email': clean_email,
                'password_hash': password_hash,
                'role': role,
                'career_goal': career_goal,
                'status': 'active',
                'created_at': now_str,
                'last_login': None
            }
            db_conn['users'].insert_one(user_doc)
            return user_id
        except Exception as e:
            print(f"MongoDB create_user fallback: {e}")

    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute('''
        INSERT INTO users (full_name, email, password_hash, role, career_goal, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
    ''', (clean_name, clean_email, password_hash, role, career_goal))
    user_id = cur.lastrowid
    conn.commit()
    conn.close()
    return user_id

def get_user_by_email(email):
    if not email:
        return None
    clean_email = str(email).strip().lower()

    if is_mongo_connected():
        try:
            db_conn = get_db()
            user = db_conn['users'].find_one({
                'email': {'$regex': f'^{re.escape(clean_email)}$', '$options': 'i'}
            })
            if user:
                return format_doc(user)
        except Exception:
            pass

    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (clean_email,))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_id(user_id):
    if user_id is None:
        return None

    if is_mongo_connected():
        try:
            db_conn = get_db()
            query = build_id_query('id', user_id)
            user = db_conn['users'].find_one(query)
            if user:
                return format_doc(user)
        except Exception:
            pass

    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id = ?", (parse_id(user_id),))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None

def update_user_last_login(user_id):
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if is_mongo_connected():
        try:
            db_conn = get_db()
            db_conn['users'].update_one(build_id_query('id', user_id), {'$set': {'last_login': now_str}})
            return
        except Exception:
            pass

    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (parse_id(user_id),))
    conn.commit()
    conn.close()

def update_user_career_goal(user_id, career_goal):
    if is_mongo_connected():
        try:
            db_conn = get_db()
            db_conn['users'].update_one(build_id_query('id', user_id), {'$set': {'career_goal': career_goal}})
            return
        except Exception:
            pass

    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("UPDATE users SET career_goal = ? WHERE id = ?", (career_goal, parse_id(user_id)))
    conn.commit()
    conn.close()

def update_user_status(user_id, status):
    if is_mongo_connected():
        try:
            db_conn = get_db()
            db_conn['users'].update_one(build_id_query('id', user_id), {'$set': {'status': status}})
            return
        except Exception:
            pass

    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("UPDATE users SET status = ? WHERE id = ?", (status, parse_id(user_id)))
    conn.commit()
    conn.close()

def count_users(search=None):
    if is_mongo_connected():
        try:
            db_conn = get_db()
            query = {}
            if search and search.strip():
                regex = {'$regex': re.escape(search.strip()), '$options': 'i'}
                query = {'$or': [{'full_name': regex}, {'email': regex}]}
            return db_conn['users'].count_documents(query)
        except Exception:
            pass

    conn = get_sqlite_conn()
    cur = conn.cursor()
    if search:
        cur.execute("SELECT COUNT(*) FROM users WHERE full_name LIKE ? OR email LIKE ?", (f"%{search}%", f"%{search}%"))
    else:
        cur.execute("SELECT COUNT(*) FROM users")
    cnt = cur.fetchone()[0]
    conn.close()
    return cnt

def get_all_users_paginated(search='', sort_by='created_at', sort_dir='desc', page=1, per_page=10):
    if is_mongo_connected():
        try:
            db_conn = get_db()
            query = {}
            if search and search.strip():
                regex = {'$regex': re.escape(search.strip()), '$options': 'i'}
                query = {'$or': [{'full_name': regex}, {'email': regex}]}

            sort_dir_val = pymongo.ASCENDING if sort_dir.lower() == 'asc' else pymongo.DESCENDING
            sort_col = sort_by if sort_by in ['id', 'full_name', 'email', 'role', 'status', 'created_at', 'last_login'] else 'created_at'

            total_count = db_conn['users'].count_documents(query)
            offset = (page - 1) * per_page

            cursor = db_conn['users'].find(query).sort([(sort_col, sort_dir_val)]).skip(offset).limit(per_page)
            raw_users = format_docs(cursor)

            user_list = []
            for u in raw_users:
                u_id = u['id']
                u_query = build_id_query('user_id', u_id)
                skills_count = db_conn['user_skills'].count_documents(u_query)
                total_progress = db_conn['learning_progress'].count_documents(u_query)
                completed_progress = db_conn['learning_progress'].count_documents({
                    '$and': [u_query, {'status': 'completed'}]
                })
                pct = round((completed_progress / total_progress * 100), 1) if total_progress > 0 else 0.0

                user_list.append({
                    'id': u['id'],
                    'full_name': u['full_name'],
                    'email': u['email'],
                    'role': u['role'],
                    'status': u['status'],
                    'career_goal': u.get('career_goal'),
                    'created_at': u.get('created_at'),
                    'last_login': u.get('last_login'),
                    'skills_count': skills_count,
                    'total_progress_skills': total_progress,
                    'completed_progress_skills': completed_progress,
                    'progress_percentage': pct
                })
            return user_list, total_count
        except Exception:
            pass

    # SQLite fallback
    conn = get_sqlite_conn()
    cur = conn.cursor()
    valid_sort_cols = {
        'id': 'u.id', 'full_name': 'u.full_name', 'email': 'u.email',
        'role': 'u.role', 'status': 'u.status', 'created_at': 'u.created_at', 'last_login': 'u.last_login'
    }
    col = valid_sort_cols.get(sort_by, 'u.created_at')
    direction = 'ASC' if sort_dir.lower() == 'asc' else 'DESC'
    offset = (page - 1) * per_page

    where_clause = ""
    params = []
    if search:
        where_clause = "WHERE u.full_name LIKE ? OR u.email LIKE ?"
        params.extend([f"%{search}%", f"%{search}%"])

    query = f'''
        SELECT u.id, u.full_name, u.email, u.role, u.status, u.career_goal, u.created_at, u.last_login,
            (SELECT COUNT(*) FROM user_skills WHERE user_id = u.id) as skills_count,
            (SELECT COUNT(*) FROM learning_progress WHERE user_id = u.id) as total_progress_skills,
            (SELECT COUNT(*) FROM learning_progress WHERE user_id = u.id AND status = 'completed') as completed_progress_skills
        FROM users u {where_clause} ORDER BY {col} {direction} LIMIT ? OFFSET ?
    '''
    params.extend([per_page, offset])
    cur.execute(query, tuple(params))
    rows = cur.fetchall()

    user_list = []
    for r in rows:
        d = dict(r)
        tot = d.get('total_progress_skills', 0)
        comp = d.get('completed_progress_skills', 0)
        d['progress_percentage'] = round((comp / tot * 100), 1) if tot > 0 else 0.0
        user_list.append(d)

    if search:
        cur.execute("SELECT COUNT(*) FROM users WHERE full_name LIKE ? OR email LIKE ?", (f"%{search}%", f"%{search}%"))
    else:
        cur.execute("SELECT COUNT(*) FROM users")
    total_count = cur.fetchone()[0]
    conn.close()
    return user_list, total_count

def get_user_detail_admin(user_id):
    if is_mongo_connected():
        try:
            db_conn = get_db()
            user = get_user_by_id(user_id)
            if not user:
                return None
            u_id = user['id']
            u_query = build_id_query('user_id', u_id)
            skills = format_docs(db_conn['user_skills'].find(u_query).sort([('id', pymongo.ASCENDING)]))
            progress = format_docs(db_conn['learning_progress'].find(u_query).sort([('id', pymongo.ASCENDING)]))
            history = format_docs(db_conn['assessment_history'].find(u_query).sort([('created_at', pymongo.DESCENDING)]).limit(5))

            total = len(progress)
            completed = sum(1 for p in progress if p.get('status') == 'completed')
            in_progress = sum(1 for p in progress if p.get('status') == 'in_progress')
            pct = round((completed / total * 100), 1) if total > 0 else 0.0

            return {
                "user": user,
                "skills": skills,
                "learning_progress": progress,
                "assessment_history": history,
                "metrics": {
                    "total_skills": total,
                    "completed": completed,
                    "in_progress": in_progress,
                    "progress_percentage": pct
                }
            }
        except Exception:
            pass

    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, full_name, email, role, status, career_goal, created_at, last_login FROM users WHERE id = ?", (parse_id(user_id),))
    user_row = cur.fetchone()
    if not user_row:
        conn.close()
        return None
    user_data = dict(user_row)

    cur.execute("SELECT id, skill_name, proficiency_level, created_at FROM user_skills WHERE user_id = ? ORDER BY id ASC", (parse_id(user_id),))
    skills = [dict(r) for r in cur.fetchall()]

    cur.execute('''
        SELECT id, skill_name, career_goal, status, priority, suggested_project, project_completed, notes, updated_at
        FROM learning_progress WHERE user_id = ? ORDER BY id ASC
    ''', (parse_id(user_id),))
    progress = [dict(r) for r in cur.fetchall()]

    cur.execute('''
        SELECT id, career_goal, existing_skills, match_percentage, recommended_next_skill, created_at
        FROM assessment_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 5
    ''', (parse_id(user_id),))
    history = [dict(r) for r in cur.fetchall()]
    conn.close()

    total = len(progress)
    completed = sum(1 for p in progress if p['status'] == 'completed')
    in_progress = sum(1 for p in progress if p['status'] == 'in_progress')
    pct = round((completed / total * 100), 1) if total > 0 else 0.0

    return {
        "user": user_data,
        "skills": skills,
        "learning_progress": progress,
        "assessment_history": history,
        "metrics": {
            "total_skills": total,
            "completed": completed,
            "in_progress": in_progress,
            "progress_percentage": pct
        }
    }

def get_admin_dashboard_stats():
    if is_mongo_connected():
        try:
            db_conn = get_db()
            total_users = db_conn['users'].count_documents({})
            active_users = db_conn['users'].count_documents({'status': 'active'})
            seven_days_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d %H:%M:%S')
            new_registrations = db_conn['users'].count_documents({'created_at': {'$gte': seven_days_ago}})
            total_recommendations = db_conn['assessment_history'].count_documents({})

            chart_days = []
            for i in range(6, -1, -1):
                day_date = datetime.now() - timedelta(days=i)
                day_str = day_date.strftime('%Y-%m-%d')
                day_label = day_date.strftime('%b %d')
                reg_count = db_conn['users'].count_documents({'created_at': {'$regex': f'^{day_str}'}})
                rec_count = db_conn['assessment_history'].count_documents({'created_at': {'$regex': f'^{day_str}'}})
                chart_days.append({
                    "date": day_str, "label": day_label,
                    "registrations": reg_count, "recommendations": rec_count
                })

            pipeline = [
                {'$match': {'career_goal': {'$ne': None, '$nin': ['', 'General']}}},
                {'$group': {'_id': '$career_goal', 'count': {'$sum': 1}}},
                {'$sort': {'count': -1}},
                {'$limit': 5},
                {'$project': {'_id': 0, 'career_goal': '$_id', 'count': 1}}
            ]
            top_careers = list(db_conn['users'].aggregate(pipeline))
            return {
                "total_users": total_users,
                "active_users": active_users,
                "new_registrations": new_registrations,
                "total_recommendations": total_recommendations,
                "registration_chart": chart_days,
                "top_careers": top_careers
            }
        except Exception:
            pass

    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM users")
    total_users = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM users WHERE status = 'active'")
    active_users = cur.fetchone()[0]
    seven_days_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d %H:%M:%S')
    cur.execute("SELECT COUNT(*) FROM users WHERE created_at >= ?", (seven_days_ago,))
    new_registrations = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM assessment_history")
    total_recommendations = cur.fetchone()[0]

    chart_days = []
    for i in range(6, -1, -1):
        day_date = datetime.now() - timedelta(days=i)
        day_str = day_date.strftime('%Y-%m-%d')
        day_label = day_date.strftime('%b %d')
        cur.execute("SELECT COUNT(*) FROM users WHERE DATE(created_at) = DATE(?)", (day_str,))
        reg_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM assessment_history WHERE DATE(created_at) = DATE(?)", (day_str,))
        rec_count = cur.fetchone()[0]
        chart_days.append({
            "date": day_str, "label": day_label,
            "registrations": reg_count, "recommendations": rec_count
        })

    cur.execute('''
        SELECT career_goal, COUNT(*) as count FROM users 
        WHERE career_goal IS NOT NULL AND career_goal != ''
        GROUP BY career_goal ORDER BY count DESC LIMIT 5
    ''')
    top_careers = [dict(r) for r in cur.fetchall()]
    conn.close()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "new_registrations": new_registrations,
        "total_recommendations": total_recommendations,
        "registration_chart": chart_days,
        "top_careers": top_careers
    }

# ----------------------------------------------------
# User Specific Skills and Progress Tracking
# ----------------------------------------------------

def get_user_skills(user_id):
    if is_mongo_connected():
        try:
            db_conn = get_db()
            query = build_id_query('user_id', user_id)
            return format_docs(db_conn['user_skills'].find(query).sort([('id', pymongo.ASCENDING)]))
        except Exception:
            pass

    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, skill_name, proficiency_level, created_at FROM user_skills WHERE user_id = ? ORDER BY id ASC", (parse_id(user_id),))
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def set_user_skills(user_id, skill_names):
    parsed_uid = parse_id(user_id)
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if is_mongo_connected():
        try:
            db_conn = get_db()
            query = build_id_query('user_id', user_id)
            db_conn['user_skills'].delete_many(query)
            docs_to_insert = []
            for skill in skill_names:
                if skill and str(skill).strip():
                    docs_to_insert.append({
                        'id': get_next_sequence_value('user_skills'),
                        'user_id': parsed_uid,
                        'skill_name': str(skill).strip(),
                        'proficiency_level': 'Intermediate',
                        'created_at': now_str
                    })
            if docs_to_insert:
                db_conn['user_skills'].insert_many(docs_to_insert)
            return True
        except Exception:
            pass

    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM user_skills WHERE user_id = ?", (parsed_uid,))
    for skill in skill_names:
        if skill and skill.strip():
            cur.execute("INSERT INTO user_skills (user_id, skill_name) VALUES (?, ?)", (parsed_uid, skill.strip()))
    conn.commit()
    conn.close()
    return True

def get_user_learning_progress(user_id, career_goal=None):
    parsed_uid = parse_id(user_id)
    if is_mongo_connected():
        try:
            db_conn = get_db()
            uid_query = build_id_query('user_id', user_id)
            if career_goal:
                query = {'$and': [uid_query, {'career_goal': career_goal}]}
                items = format_docs(db_conn['learning_progress'].find(query).sort([('id', pymongo.ASCENDING)]))
                if not items:
                    items = format_docs(db_conn['learning_progress'].find(uid_query).sort([('id', pymongo.ASCENDING)]))
            else:
                items = format_docs(db_conn['learning_progress'].find(uid_query).sort([('id', pymongo.ASCENDING)]))
            total = len(items)
            completed = sum(1 for p in items if p.get('status') == 'completed')
            in_progress = sum(1 for p in items if p.get('status') == 'in_progress')
            pct = round((completed / total * 100), 1) if total > 0 else 0.0
            return {
                "items": items,
                "metrics": {
                    "total": total,
                    "completed": completed,
                    "in_progress": in_progress,
                    "not_started": total - (completed + in_progress),
                    "progress_percentage": pct
                }
            }
        except Exception:
            pass

    conn = get_sqlite_conn()
    cur = conn.cursor()
    if career_goal:
        cur.execute('''
            SELECT id, skill_name, career_goal, status, priority, suggested_project, project_completed, notes, updated_at
            FROM learning_progress WHERE user_id = ? AND career_goal = ? ORDER BY id ASC
        ''', (parse_id(user_id), career_goal))
        rows = cur.fetchall()
        if not rows:
            cur.execute('''
                SELECT id, skill_name, career_goal, status, priority, suggested_project, project_completed, notes, updated_at
                FROM learning_progress WHERE user_id = ? ORDER BY id ASC
            ''', (parse_id(user_id),))
            rows = cur.fetchall()
    else:
        cur.execute('''
            SELECT id, skill_name, career_goal, status, priority, suggested_project, project_completed, notes, updated_at
            FROM learning_progress WHERE user_id = ? ORDER BY id ASC
        ''', (parse_id(user_id),))
        rows = cur.fetchall()
    conn.close()

    items = [dict(r) for r in rows]
    total = len(items)
    completed = sum(1 for p in items if p['status'] == 'completed')
    in_progress = sum(1 for p in items if p['status'] == 'in_progress')
    pct = round((completed / total * 100), 1) if total > 0 else 0.0

    return {
        "items": items,
        "metrics": {
            "total": total,
            "completed": completed,
            "in_progress": in_progress,
            "not_started": total - (completed + in_progress),
            "progress_percentage": pct
        }
    }

def update_user_learning_progress(progress_id, user_id, status=None, project_completed=None, notes=None):
    parsed_uid = parse_id(user_id)
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if is_mongo_connected():
        try:
            db_conn = get_db()
            prog_query = build_id_query('id', progress_id)
            user_query = build_id_query('user_id', user_id)
            combined_query = {'$and': [prog_query, user_query]}

            existing = db_conn['learning_progress'].find_one(combined_query)
            if existing:
                updates = {'updated_at': now_str}
                if status is not None:
                    updates['status'] = status
                if project_completed is not None:
                    updates['project_completed'] = 1 if project_completed else 0
                if notes is not None:
                    updates['notes'] = notes
                db_conn['learning_progress'].update_one(combined_query, {'$set': updates})

                skill_name = existing.get('skill_name')
                if skill_name and str(skill_name).strip():
                    clean_sk = str(skill_name).strip()
                    if status == 'completed':
                        sk_exists = db_conn['user_skills'].find_one({
                            '$and': [
                                build_id_query('user_id', parsed_uid),
                                {'skill_name': {'$regex': f'^{re.escape(clean_sk)}$', '$options': 'i'}}
                            ]
                        })
                        if not sk_exists:
                            db_conn['user_skills'].insert_one({
                                'id': get_next_sequence_value('user_skills'),
                                'user_id': parsed_uid,
                                'skill_name': clean_sk,
                                'proficiency_level': 'Intermediate',
                                'created_at': now_str
                            })
                    elif status in ['not_started', 'in_progress']:
                        db_conn['user_skills'].delete_many({
                            '$and': [
                                build_id_query('user_id', parsed_uid),
                                {'skill_name': {'$regex': f'^{re.escape(clean_sk)}$', '$options': 'i'}}
                            ]
                        })
                return True
        except Exception:
            pass

    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, skill_name FROM learning_progress WHERE id = ? AND user_id = ?", (parse_id(progress_id), parsed_uid))
    row = cur.fetchone()
    if not row:
        conn.close()
        return False

    updates = []
    params = []
    if status is not None:
        updates.append("status = ?")
        params.append(status)
    if project_completed is not None:
        updates.append("project_completed = ?")
        params.append(1 if project_completed else 0)
    if notes is not None:
        updates.append("notes = ?")
        params.append(notes)

    updates.append("updated_at = CURRENT_TIMESTAMP")
    query = f"UPDATE learning_progress SET {', '.join(updates)} WHERE id = ? AND user_id = ?"
    params.extend([parse_id(progress_id), parsed_uid])
    cur.execute(query, tuple(params))

    if row['skill_name']:
        clean_sk = row['skill_name'].strip()
        if status == 'completed':
            cur.execute("SELECT id FROM user_skills WHERE user_id = ? AND LOWER(TRIM(skill_name)) = LOWER(TRIM(?))", (parsed_uid, clean_sk))
            if not cur.fetchone():
                cur.execute("INSERT INTO user_skills (user_id, skill_name) VALUES (?, ?)", (parsed_uid, clean_sk))
        elif status in ['not_started', 'in_progress']:
            cur.execute("DELETE FROM user_skills WHERE user_id = ? AND LOWER(TRIM(skill_name)) = LOWER(TRIM(?))", (parsed_uid, clean_sk))

    conn.commit()
    conn.close()
    return True

def save_user_assessment_and_roadmap(user_id, career_goal, existing_skills, match_percentage, recommended_next_skill, roadmap=None):
    parsed_uid = parse_id(user_id)
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    skills_list = existing_skills if isinstance(existing_skills, list) else [s.strip() for s in str(existing_skills).split(',') if s.strip()]

    if is_mongo_connected():
        try:
            db_conn = get_db()
            db_conn['users'].update_one(build_id_query('id', parsed_uid), {'$set': {'career_goal': career_goal}})
            for s in skills_list:
                if s and str(s).strip():
                    clean_s = str(s).strip()
                    sk_exists = db_conn['user_skills'].find_one({
                        '$and': [
                            build_id_query('user_id', parsed_uid),
                            {'skill_name': {'$regex': f'^{re.escape(clean_s)}$', '$options': 'i'}}
                        ]
                    })
                    if not sk_exists:
                        db_conn['user_skills'].insert_one({
                            'id': get_next_sequence_value('user_skills'),
                            'user_id': parsed_uid,
                            'skill_name': clean_s,
                            'proficiency_level': 'Intermediate',
                            'created_at': now_str
                        })

            skills_str = ", ".join(skills_list)
            db_conn['assessment_history'].insert_one({
                'id': get_next_sequence_value('assessment_history'),
                'user_id': parsed_uid,
                'career_goal': career_goal,
                'existing_skills': skills_str,
                'match_percentage': float(match_percentage),
                'recommended_next_skill': recommended_next_skill or '',
                'roadmap_json': json.dumps(roadmap) if roadmap else None,
                'created_at': now_str
            })

            if roadmap and 'learning_roadmap' in roadmap:
                for item in roadmap.get('learning_roadmap', []):
                    skill = (item.get('skill') or '').strip()
                    if not skill:
                        continue
                    prog_doc = db_conn['learning_progress'].find_one({
                        '$and': [
                            build_id_query('user_id', parsed_uid),
                            {'skill_name': {'$regex': f'^{re.escape(skill)}$', '$options': 'i'}}
                        ]
                    })
                    priority = item.get('priority', 'High')
                    suggested_proj = item.get('suggested_project', '')
                    if not prog_doc:
                        db_conn['learning_progress'].insert_one({
                            'id': get_next_sequence_value('learning_progress'),
                            'user_id': parsed_uid,
                            'skill_name': skill,
                            'career_goal': career_goal,
                            'status': 'not_started',
                            'progress_percentage': 0.0,
                            'suggested_project': suggested_proj,
                            'project_completed': 0,
                            'priority': priority,
                            'notes': '',
                            'updated_at': now_str
                        })
                    else:
                        db_conn['learning_progress'].update_one(
                            {'_id': prog_doc['_id']},
                            {'$set': {
                                'career_goal': career_goal,
                                'priority': priority,
                                'suggested_project': suggested_proj,
                                'updated_at': now_str
                            }}
                        )
            return True
        except Exception:
            pass

    # SQLite fallback
    conn = get_sqlite_conn()
    cur = conn.cursor()
    skills_str = existing_skills if isinstance(existing_skills, str) else ", ".join(existing_skills)
    cur.execute("UPDATE users SET career_goal = ? WHERE id = ?", (career_goal, parsed_uid))

    for s in skills_list:
        if s and s.strip():
            cur.execute("SELECT id FROM user_skills WHERE user_id = ? AND LOWER(skill_name) = LOWER(?)", (parsed_uid, s.strip()))
            if not cur.fetchone():
                cur.execute("INSERT INTO user_skills (user_id, skill_name) VALUES (?, ?)", (parsed_uid, s.strip()))

    cur.execute('''
        INSERT INTO assessment_history (user_id, career_goal, existing_skills, match_percentage, recommended_next_skill, roadmap_json)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (parsed_uid, career_goal, skills_str, match_percentage, recommended_next_skill, json.dumps(roadmap) if roadmap else None))

    if roadmap and 'learning_roadmap' in roadmap:
        for item in roadmap.get('learning_roadmap', []):
            skill = (item.get('skill') or '').strip()
            if not skill:
                continue
            cur.execute("SELECT id FROM learning_progress WHERE user_id = ? AND LOWER(TRIM(skill_name)) = LOWER(TRIM(?))", (parsed_uid, skill))
            row = cur.fetchone()
            if not row:
                cur.execute('''
                    INSERT INTO learning_progress (user_id, skill_name, career_goal, status, priority, suggested_project)
                    VALUES (?, ?, ?, 'not_started', ?, ?)
                ''', (parsed_uid, skill, career_goal, item.get('priority', 'High'), item.get('suggested_project', '')))
            else:
                cur.execute('''
                    UPDATE learning_progress SET career_goal = ?, priority = ?, suggested_project = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (career_goal, item.get('priority', 'High'), item.get('suggested_project', ''), row['id']))
    conn.commit()
    conn.close()
    return True

def toggle_user_skill_progress(user_id, skill_name, career_goal=None, completed=True):
    parsed_uid = parse_id(user_id)
    clean_skill = str(skill_name).strip()
    status = 'completed' if completed else 'not_started'
    proj = 1 if completed else 0
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if is_mongo_connected():
        try:
            db_conn = get_db()
            prog_doc = db_conn['learning_progress'].find_one({
                '$and': [
                    build_id_query('user_id', parsed_uid),
                    {'skill_name': {'$regex': f'^{re.escape(clean_skill)}$', '$options': 'i'}}
                ]
            })
            if prog_doc:
                db_conn['learning_progress'].update_one(
                    {'_id': prog_doc['_id']},
                    {'$set': {'status': status, 'project_completed': proj, 'updated_at': now_str}}
                )
            else:
                db_conn['learning_progress'].insert_one({
                    'id': get_next_sequence_value('learning_progress'),
                    'user_id': parsed_uid,
                    'skill_name': clean_skill,
                    'career_goal': career_goal or 'General',
                    'status': status,
                    'progress_percentage': 100.0 if completed else 0.0,
                    'suggested_project': f"{clean_skill} Mini Project",
                    'project_completed': proj,
                    'priority': 'High',
                    'notes': '',
                    'updated_at': now_str
                })

            if completed:
                sk_exists = db_conn['user_skills'].find_one({
                    '$and': [
                        build_id_query('user_id', parsed_uid),
                        {'skill_name': {'$regex': f'^{re.escape(clean_skill)}$', '$options': 'i'}}
                    ]
                })
                if not sk_exists:
                    db_conn['user_skills'].insert_one({
                        'id': get_next_sequence_value('user_skills'),
                        'user_id': parsed_uid,
                        'skill_name': clean_skill,
                        'proficiency_level': 'Intermediate',
                        'created_at': now_str
                    })
            return get_user_learning_progress(user_id)
        except Exception:
            pass

    # SQLite fallback
    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("SELECT id FROM learning_progress WHERE user_id = ? AND LOWER(TRIM(skill_name)) = LOWER(TRIM(?))", (parsed_uid, clean_skill))
    row = cur.fetchone()

    if row:
        cur.execute("UPDATE learning_progress SET status = ?, project_completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (status, proj, row['id']))
    else:
        cur.execute("INSERT INTO learning_progress (user_id, skill_name, career_goal, status, project_completed) VALUES (?, ?, ?, ?, ?)", (parsed_uid, clean_skill, career_goal or 'General', status, proj))

    if completed:
        cur.execute("SELECT id FROM user_skills WHERE user_id = ? AND LOWER(TRIM(skill_name)) = LOWER(TRIM(?))", (parsed_uid, clean_skill))
        if not cur.fetchone():
            cur.execute("INSERT INTO user_skills (user_id, skill_name) VALUES (?, ?)", (parsed_uid, clean_skill))

    conn.commit()
    conn.close()
    return get_user_learning_progress(user_id)

def log_anonymous_recommendation(career_goal, existing_skills, match_percentage, recommended_next_skill, roadmap=None):
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    skills_str = existing_skills if isinstance(existing_skills, str) else ", ".join(existing_skills)

    if is_mongo_connected():
        try:
            db_conn = get_db()
            rec_id = get_next_sequence_value('assessment_history')
            db_conn['assessment_history'].insert_one({
                'id': rec_id,
                'user_id': None,
                'profile_id': None,
                'career_goal': career_goal or 'General',
                'existing_skills': skills_str,
                'match_percentage': float(match_percentage or 0.0),
                'recommended_next_skill': recommended_next_skill or '',
                'roadmap_json': json.dumps(roadmap) if roadmap else None,
                'created_at': now_str
            })
            return rec_id
        except Exception:
            pass

    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute('''
        INSERT INTO assessment_history (career_goal, existing_skills, match_percentage, recommended_next_skill, roadmap_json)
        VALUES (?, ?, ?, ?, ?)
    ''', (career_goal, skills_str, match_percentage, recommended_next_skill, json.dumps(roadmap) if roadmap else None))
    assessment_id = cur.lastrowid
    conn.commit()
    conn.close()
    return assessment_id

# ----------------------------------------------------
# Legacy User Profile methods (Preserved exactly)
# ----------------------------------------------------

def save_profile(name, career_goal, existing_skills, match_percentage, recommended_next_skill, roadmap=None):
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    skills_str = existing_skills if isinstance(existing_skills, str) else ", ".join(existing_skills)
    clean_name = str(name).strip()

    if is_mongo_connected():
        try:
            db_conn = get_db()
            profile = db_conn['user_profiles'].find_one({'name': {'$regex': f'^{re.escape(clean_name)}$', '$options': 'i'}})
            if profile:
                profile_id = profile['id']
                db_conn['user_profiles'].update_one(
                    {'_id': profile['_id']},
                    {'$set': {
                        'career_goal': career_goal,
                        'existing_skills': skills_str,
                        'match_percentage': float(match_percentage),
                        'recommended_next_skill': recommended_next_skill,
                        'updated_at': now_str
                    }}
                )
            else:
                profile_id = get_next_sequence_value('user_profiles')
                db_conn['user_profiles'].insert_one({
                    'id': profile_id,
                    'name': clean_name,
                    'career_goal': career_goal,
                    'existing_skills': skills_str,
                    'match_percentage': float(match_percentage),
                    'recommended_next_skill': recommended_next_skill,
                    'created_at': now_str,
                    'updated_at': now_str
                })

            if roadmap:
                db_conn['assessment_history'].insert_one({
                    'id': get_next_sequence_value('assessment_history'),
                    'profile_id': profile_id,
                    'user_id': None,
                    'career_goal': career_goal,
                    'existing_skills': skills_str,
                    'match_percentage': float(match_percentage),
                    'recommended_next_skill': recommended_next_skill,
                    'roadmap_json': json.dumps(roadmap),
                    'created_at': now_str
                })
                for item in roadmap.get('learning_roadmap', []):
                    skill = item.get('skill')
                    if not skill:
                        continue
                    prog = db_conn['user_skill_progress'].find_one({
                        '$and': [build_id_query('profile_id', profile_id), {'skill_name': {'$regex': f'^{re.escape(skill)}$', '$options': 'i'}}]
                    })
                    if not prog:
                        db_conn['user_skill_progress'].insert_one({
                            'id': get_next_sequence_value('user_skill_progress'),
                            'profile_id': profile_id,
                            'skill_name': skill,
                            'career_goal': career_goal,
                            'status': 'not_started',
                            'priority': item.get('priority', 'High'),
                            'suggested_project': item.get('suggested_project', ''),
                            'project_completed': 0,
                            'notes': '',
                            'updated_at': now_str
                        })
            return profile_id
        except Exception:
            pass

    # SQLite fallback
    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("SELECT id FROM user_profiles WHERE name = ?", (clean_name,))
    row = cur.fetchone()
    if row:
        profile_id = row['id']
        cur.execute('''
            UPDATE user_profiles SET career_goal = ?, existing_skills = ?, match_percentage = ?, 
            recommended_next_skill = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        ''', (career_goal, skills_str, match_percentage, recommended_next_skill, profile_id))
    else:
        cur.execute('''
            INSERT INTO user_profiles (name, career_goal, existing_skills, match_percentage, recommended_next_skill)
            VALUES (?, ?, ?, ?, ?)
        ''', (clean_name, career_goal, skills_str, match_percentage, recommended_next_skill))
        profile_id = cur.lastrowid

    if roadmap:
        cur.execute('''
            INSERT INTO assessment_history (profile_id, career_goal, existing_skills, match_percentage, recommended_next_skill, roadmap_json)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (profile_id, career_goal, skills_str, match_percentage, recommended_next_skill, json.dumps(roadmap)))

        for item in roadmap.get('learning_roadmap', []):
            skill = item.get('skill')
            cur.execute("SELECT id FROM user_skill_progress WHERE profile_id = ? AND skill_name = ?", (profile_id, skill))
            if not cur.fetchone():
                cur.execute('''
                    INSERT INTO user_skill_progress (profile_id, skill_name, career_goal, status, priority, suggested_project)
                    VALUES (?, ?, ?, 'not_started', ?, ?)
                ''', (profile_id, skill, career_goal, item.get('priority', 'High'), item.get('suggested_project', '')))
    conn.commit()
    conn.close()
    return profile_id

def get_profiles():
    if is_mongo_connected():
        try:
            db_conn = get_db()
            return format_docs(db_conn['user_profiles'].find().sort([('updated_at', pymongo.DESCENDING)]))
        except Exception:
            pass

    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute('''
        SELECT id, name, career_goal, existing_skills, match_percentage, recommended_next_skill, created_at, updated_at
        FROM user_profiles ORDER BY updated_at DESC
    ''')
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_profile_progress(profile_id):
    if is_mongo_connected():
        try:
            db_conn = get_db()
            profile = db_conn['user_profiles'].find_one(build_id_query('id', profile_id))
            if profile:
                items = format_docs(db_conn['user_skill_progress'].find(build_id_query('profile_id', profile_id)).sort([('id', pymongo.ASCENDING)]))
                total = len(items)
                completed = sum(1 for p in items if p.get('status') == 'completed')
                in_progress = sum(1 for p in items if p.get('status') == 'in_progress')
                pct = round((completed / total * 100), 1) if total > 0 else 0.0
                return {
                    "profile": format_doc(profile),
                    "skills_progress": items,
                    "metrics": {
                        "total_skills_tracked": total,
                        "completed": completed,
                        "in_progress": in_progress,
                        "not_started": total - (completed + in_progress),
                        "progress_percentage": pct
                    }
                }
        except Exception:
            pass

    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM user_profiles WHERE id = ?", (parse_id(profile_id),))
    profile = cur.fetchone()
    if not profile:
        conn.close()
        return None

    cur.execute('''
        SELECT id, skill_name, career_goal, status, priority, suggested_project, project_completed, notes, updated_at
        FROM user_skill_progress WHERE profile_id = ? ORDER BY id ASC
    ''', (parse_id(profile_id),))
    items = [dict(p) for p in cur.fetchall()]
    conn.close()

    total = len(items)
    completed = sum(1 for p in items if p['status'] == 'completed')
    in_progress = sum(1 for p in items if p['status'] == 'in_progress')
    pct = round((completed / total * 100), 1) if total > 0 else 0.0

    return {
        "profile": dict(profile),
        "skills_progress": items,
        "metrics": {
            "total_skills_tracked": total,
            "completed": completed,
            "in_progress": in_progress,
            "not_started": total - (completed + in_progress),
            "progress_percentage": pct
        }
    }

def update_skill_status(progress_id, status, project_completed=None, notes=None):
    if is_mongo_connected():
        try:
            db_conn = get_db()
            prog_query = build_id_query('id', progress_id)
            updates = {'status': status, 'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            if project_completed is not None:
                updates['project_completed'] = 1 if project_completed else 0
            if notes is not None:
                updates['notes'] = notes
            res = db_conn['user_skill_progress'].update_one(prog_query, {'$set': updates})
            return res.matched_count > 0
        except Exception:
            pass

    conn = get_sqlite_conn()
    cur = conn.cursor()
    query = "UPDATE user_skill_progress SET status = ?, updated_at = CURRENT_TIMESTAMP"
    params = [status]
    if project_completed is not None:
        query += ", project_completed = ?"
        params.append(1 if project_completed else 0)
    if notes is not None:
        query += ", notes = ?"
        params.append(notes)
    query += " WHERE id = ?"
    params.append(parse_id(progress_id))
    cur.execute(query, tuple(params))
    conn.commit()
    conn.close()
    return True

def delete_profile(profile_id):
    if is_mongo_connected():
        try:
            db_conn = get_db()
            query = build_id_query('id', profile_id)
            prog_query = build_id_query('profile_id', profile_id)
            db_conn['user_profiles'].delete_many(query)
            db_conn['user_skill_progress'].delete_many(prog_query)
            db_conn['assessment_history'].delete_many(prog_query)
            return True
        except Exception:
            pass

    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM user_profiles WHERE id = ?", (parse_id(profile_id),))
    cur.execute("DELETE FROM user_skill_progress WHERE profile_id = ?", (parse_id(profile_id),))
    cur.execute("DELETE FROM assessment_history WHERE profile_id = ?", (parse_id(profile_id),))
    conn.commit()
    conn.close()
    return True

# Initialize database safely on import
try:
    init_db()
except Exception as _init_err:
    print(f"init_db safe notice: {_init_err}")
