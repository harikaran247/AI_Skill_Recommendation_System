import unittest
import time
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.app import app
import backend.database as db

class RequirementsE2ETestCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.ts = int(time.time() * 1000)

    def test_requirements_verification(self):
        print("\n--- Starting End-to-End Requirements Verification ---")

        # 1. Register User A
        email_a = f"user_a_{self.ts}@test.com"
        pwd = "Password123!"
        res_signup = self.client.post('/api/auth/signup', json={
            "full_name": "User Alpha",
            "email": email_a,
            "password": pwd,
            "confirm_password": pwd,
            "career_goal": "AI Engineer",
            "existing_skills": ["Python"]
        })
        self.assertEqual(res_signup.status_code, 201)
        data_a = res_signup.get_json()
        token_a = data_a['token']
        user_id_a = data_a['user']['id']
        print(f"[PASS] User A registered: ID={user_id_a}, Email={email_a}")

        # 2. Check Dashboard restoration for User A
        headers_a = {"Authorization": f"Bearer {token_a}"}
        res_dash = self.client.get('/api/user/dashboard', headers=headers_a)
        self.assertEqual(res_dash.status_code, 200)
        dash_a = res_dash.get_json()
        self.assertTrue(dash_a['success'])
        self.assertEqual(dash_a['user']['career_goal'], "AI Engineer")

        # Known skills: must contain 'Python'
        skill_names = [s['skill_name'] for s in dash_a['skills']]
        self.assertIn("Python", skill_names)
        print(f"[PASS] Saved domain 'AI Engineer' and known skill 'Python' restored for User A.")

        # Formula test: 1 acquired out of 11 required skills for AI Engineer = 9.1%
        self.assertEqual(dash_a['recommendation']['match_percentage'], 9.1)
        self.assertEqual(dash_a['recommendation']['recommended_next_skill'], "NumPy")
        self.assertNotIn("Python", dash_a['recommendation']['missing_skills'])
        print(f"[PASS] Match % is 9.1% and 'Python' is never in missing skills.")

        # 3. Mark roadmap skill 'NumPy' as completed
        # Find progress item for NumPy
        numpy_item = next((p for p in dash_a['progress'] if p['skill_name'] == 'NumPy'), None)
        self.assertIsNotNone(numpy_item)

        res_patch = self.client.patch(f"/api/user/progress/{numpy_item['id']}", json={
            "status": "completed",
            "project_completed": 1
        }, headers=headers_a)
        self.assertEqual(res_patch.status_code, 200)
        patched_data = res_patch.get_json()
        self.assertTrue(patched_data['success'])

        # Verify updated match percentage: 2 acquired out of 11 = 18.2%
        self.assertEqual(patched_data['match_percentage'], 18.2)
        # Verify NumPy moved into known skills
        patched_skills = [s['skill_name'] for s in patched_data['skills']]
        self.assertIn("NumPy", patched_skills)
        self.assertNotIn("NumPy", patched_data['recommendation']['missing_skills'])
        self.assertEqual(patched_data['recommendation']['recommended_next_skill'], "Pandas")
        print(f"[PASS] NumPy marked completed: Match % updated to 18.2%, NumPy moved to known skills, next is Pandas.")

        # 4. Logout User A
        res_logout = self.client.post('/api/auth/logout', headers=headers_a)
        self.assertEqual(res_logout.status_code, 200)
        print("[PASS] User A logged out. Token invalidated.")

        # Invalidate check: Accessing dashboard with revoked token returns 401
        res_revoked = self.client.get('/api/user/dashboard', headers=headers_a)
        self.assertEqual(res_revoked.status_code, 401)
        print("[PASS] Private dashboard route rejects revoked token with 401.")

        # 5. Log in again as User A
        res_login = self.client.post('/api/auth/login', json={
            "email": email_a,
            "password": pwd
        })
        self.assertEqual(res_login.status_code, 200)
        new_token_a = res_login.get_json()['token']
        new_headers_a = {"Authorization": f"Bearer {new_token_a}"}

        # Restored dashboard after re-login:
        res_dash_re = self.client.get('/api/user/dashboard', headers=new_headers_a)
        self.assertEqual(res_dash_re.status_code, 200)
        dash_re = res_dash_re.get_json()
        self.assertEqual(dash_re['user']['career_goal'], "AI Engineer")
        re_skills = [s['skill_name'] for s in dash_re['skills']]
        self.assertIn("Python", re_skills)
        self.assertIn("NumPy", re_skills)
        self.assertEqual(dash_re['recommendation']['match_percentage'], 18.2)
        print("[PASS] Logging in again restores career goal, known skills (Python, NumPy), and progress (18.2%).")

        # 6. User Isolation Test: Register User B
        email_b = f"user_b_{self.ts}@test.com"
        res_signup_b = self.client.post('/api/auth/signup', json={
            "full_name": "User Beta",
            "email": email_b,
            "password": pwd,
            "confirm_password": pwd,
            "career_goal": "Full Stack Developer",
            "existing_skills": ["HTML", "CSS"]
        })
        self.assertEqual(res_signup_b.status_code, 201)
        token_b = res_signup_b.get_json()['token']
        headers_b = {"Authorization": f"Bearer {token_b}"}

        res_dash_b = self.client.get('/api/user/dashboard', headers=headers_b)
        dash_b = res_dash_b.get_json()
        self.assertEqual(dash_b['user']['career_goal'], "Full Stack Developer")
        b_skills = [s['skill_name'] for s in dash_b['skills']]
        self.assertIn("HTML", b_skills)
        self.assertIn("CSS", b_skills)
        self.assertNotIn("NumPy", b_skills)  # User A's completed skill must NOT be visible to User B!
        print("[PASS] User data isolated: User B sees only Full Stack Developer and HTML/CSS, not User A's data.")

        # 7. ML Recommendations & Admin Dashboard
        # Direct ML recommender endpoint
        res_ml = self.client.post('/api/recommend', json={
            "career_goal": "Data Scientist",
            "existing_skills": ["Python", "SQL"]
        })
        self.assertEqual(res_ml.status_code, 200)
        ml_data = res_ml.get_json()
        self.assertTrue(ml_data['success'])
        self.assertIn('match_percentage', ml_data)
        self.assertIn('learning_roadmap', ml_data)
        print(f"[PASS] ML Recommender operates correctly (Data Scientist match: {ml_data['match_percentage']}%).")

        # Admin privileges check
        # Non-admin cannot access admin stats
        res_admin_denied = self.client.get('/api/admin/stats', headers=new_headers_a)
        self.assertEqual(res_admin_denied.status_code, 403)
        print("[PASS] Standard user cannot access Admin endpoints (403 Access Denied).")

        # Admin user login
        res_admin_login = self.client.post('/api/auth/login', json={
            "email": "admin@skills.ai",
            "password": "Admin@2025!"
        })
        if res_admin_login.status_code != 200:
            from backend.create_admin import create_or_upgrade_admin
            create_or_upgrade_admin("admin@skills.ai", "Platform Administrator", "Admin@2025!")
            res_admin_login = self.client.post('/api/auth/login', json={
                "email": "admin@skills.ai",
                "password": "Admin@2025!"
            })
        self.assertEqual(res_admin_login.status_code, 200)
        admin_token = res_admin_login.get_json()['token']
        res_admin_stats = self.client.get('/api/admin/stats', headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(res_admin_stats.status_code, 200)
        print("[PASS] Admin dashboard stats accessible to authenticated administrator.")

if __name__ == '__main__':
    unittest.main()
