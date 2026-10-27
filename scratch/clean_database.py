import pymongo
import sqlite3
from werkzeug.security import generate_password_hash

# 1. MongoDB Cleanup
client = pymongo.MongoClient('mongodb://127.0.0.1:27017')
db = client['skill_recommendation']

print('Purging MongoDB collections...')
db['assessment_history'].delete_many({})
db['user_skills'].delete_many({})
db['learning_progress'].delete_many({})
db['user_profiles'].delete_many({})
db['user_skill_progress'].delete_many({})
db['revoked_tokens'].delete_many({})

# Retain only admin@skills.ai
db['users'].delete_many({'email': {'$ne': 'admin@skills.ai'}})

# Ensure admin user is properly configured
admin_pwd_hash = generate_password_hash('Admin@2025!', method='pbkdf2:sha256')
db['users'].update_one(
    {'email': 'admin@skills.ai'},
    {'$set': {
        'id': 1,
        'full_name': 'Platform Administrator',
        'email': 'admin@skills.ai',
        'password_hash': admin_pwd_hash,
        'role': 'admin',
        'status': 'active',
        'career_goal': None,
        'created_at': '2026-10-26 00:00:00',
        'last_login': None
    }},
    upsert=True
)

# Reset counters
db['counters'].update_one({'_id': 'users'}, {'$set': {'seq': 1}}, upsert=True)
db['counters'].update_one({'_id': 'user_skills'}, {'$set': {'seq': 0}}, upsert=True)
db['counters'].update_one({'_id': 'learning_progress'}, {'$set': {'seq': 0}}, upsert=True)
db['counters'].update_one({'_id': 'assessment_history'}, {'$set': {'seq': 0}}, upsert=True)

print('MongoDB after cleanup:')
for col in db.list_collection_names():
    print(f'  {col}: {db[col].count_documents({})}')

# 2. SQLite Cleanup
conn = sqlite3.connect('backend/skill_recommendation.db')
cur = conn.cursor()
cur.execute('DELETE FROM assessment_history')
cur.execute('DELETE FROM user_skills')
cur.execute('DELETE FROM learning_progress')
cur.execute('DELETE FROM user_profiles')
cur.execute('DELETE FROM user_skill_progress')
cur.execute('DELETE FROM revoked_tokens')
cur.execute("DELETE FROM users WHERE email != 'admin@skills.ai'")

cur.execute("SELECT COUNT(*) FROM users WHERE email = 'admin@skills.ai'")
if cur.fetchone()[0] == 0:
    cur.execute('''
        INSERT INTO users (id, full_name, email, password_hash, role, status, created_at)
        VALUES (1, 'Platform Administrator', 'admin@skills.ai', ?, 'admin', 'active', '2026-10-26 00:00:00')
    ''', (admin_pwd_hash,))
else:
    cur.execute('''
        UPDATE users SET id = 1, password_hash = ?, role = 'admin', status = 'active', career_goal = NULL, last_login = NULL
        WHERE email = 'admin@skills.ai'
    ''', (admin_pwd_hash,))

try:
    cur.execute("DELETE FROM sqlite_sequence WHERE name IN ('user_skills', 'learning_progress', 'assessment_history', 'revoked_tokens', 'user_profiles', 'user_skill_progress')")
    cur.execute("UPDATE sqlite_sequence SET seq = 1 WHERE name = 'users'")
except Exception as sq_err:
    print('sqlite_sequence notice:', sq_err)

conn.commit()
conn.close()

print('SQLite cleanup finished successfully.')
