import urllib.request
import json
import time

BASE_URL = 'http://127.0.0.1:5000'

def request_json(method, path, data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(f'{BASE_URL}{path}', data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

print("=== 1. Checking Admin Dashboard Initial Clean State ===")
status, admin_login = request_json('POST', '/api/auth/login', {'email': 'admin@skills.ai', 'password': 'Admin@2025!'})
assert status == 200, f"Admin login failed: {admin_login}"
admin_token = admin_login['token']
print("Admin logged in successfully.")

status, admin_stats = request_json('GET', '/api/admin/stats', token=admin_token)
assert status == 200, f"Admin stats failed: {admin_stats}"
stats = admin_stats['stats']
print(f"Stats - Total Users: {stats['total_users']}, Total Recs: {stats['total_recommendations']}, Top Careers: {len(stats['top_careers'])}")
assert stats['total_recommendations'] == 0, f"Expected 0 recommendations, got {stats['total_recommendations']}"

status, admin_users = request_json('GET', '/api/admin/users', token=admin_token)
assert status == 200, f"Admin users failed: {admin_users}"
print(f"Admin User List Count: {len(admin_users['users'])} (only admin)")

print("\n=== 2. New User Signup ===")
ts = int(time.time() * 1000)
user_email = f"learner_{ts}@example.com"
status, signup_res = request_json('POST', '/api/auth/signup', {
    'full_name': 'New Learner',
    'email': user_email,
    'password': 'Password123!',
    'confirm_password': 'Password123!'
})
assert status == 201, f"Signup failed: {signup_res}"
user_token = signup_res['token']
user_id = signup_res['user']['id']
print(f"Learner signed up: ID {user_id}, Email {user_email}")

print("\n=== 3. Learner Adds Skills & Generates Roadmap ===")
status, rec_res = request_json('POST', '/api/recommend', {
    'career_goal': 'AI Engineer',
    'existing_skills': ['Python', 'Pandas', 'NumPy']
}, token=user_token)
assert status == 200, f"Recommendation failed: {rec_res}"
print(f"Recommendation successful: Recommended Next Skill = '{rec_res['recommended_next_skill']}', Match = {rec_res['match_percentage']}%")

print("\n=== 4. Learner Toggles Milestone in Progress ===")
status, toggle_res = request_json('POST', '/api/user/toggle-progress-topic', {
    'skill_name': 'Machine Learning',
    'completed': True
}, token=user_token)
assert status == 200, f"Toggle failed: {toggle_res}"
print("Progress topic toggled successfully.")

print("\n=== 5. Verifying Admin Dashboard Reflects the Stored Data ===")
status, updated_stats = request_json('GET', '/api/admin/stats', token=admin_token)
assert status == 200
new_stats = updated_stats['stats']
print(f"Updated Admin Stats:")
print(f"  Total Users: {new_stats['total_users']}")
print(f"  Total Recommendations: {new_stats['total_recommendations']}")
print(f"  Top Careers: {new_stats['top_careers']}")
assert new_stats['total_recommendations'] >= 1, "Admin stats recommendation count did not increase!"

status, updated_users = request_json('GET', '/api/admin/users', token=admin_token)
assert status == 200
matching = [u for u in updated_users['users'] if u['email'] == user_email]
assert len(matching) == 1, f"Learner not found in admin users table: {updated_users['users']}"
learner_info = matching[0]
print(f"Learner in Admin Table:")
print(f"  Email: {learner_info['email']}")
print(f"  Career Goal: {learner_info['career_goal']}")
print(f"  Skills Count: {learner_info['skills_count']}")
print(f"  Completed Progress Skills: {learner_info['completed_progress_skills']}")

status, user_detail = request_json('GET', f'/api/admin/users/{user_id}', token=admin_token)
assert status == 200
print(f"Admin User Detail Modal:")
print(f"  Assessments count: {len(user_detail['assessment_history'])}")
print(f"  Learning progress topics: {len(user_detail['learning_progress'])}")
print(f"  Acquired skills: {len(user_detail['skills'])}")
assert len(user_detail['assessment_history']) >= 1, "Assessment was not saved under user profile!"

print("\nALL VERIFICATIONS PASSED! Old data is clean, and hereafter all user data stores perfectly!")
