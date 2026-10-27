"""
Comprehensive Backend Authentication & Admin Security Test Suite
"""
import unittest
import time
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import app
import database as db

class AuthAndAdminTestCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.unique_suffix = int(time.time() * 1000)

    def test_1_signup_validation(self):
        # Empty full name
        res = self.client.post('/api/auth/signup', json={
            "full_name": "",
            "email": f"invalid_{self.unique_suffix}@test.com",
            "password": "Password123!",
            "confirm_password": "Password123!"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("Full name is required", res.get_json()['error'])

        # Invalid email
        res = self.client.post('/api/auth/signup', json={
            "full_name": "Test User",
            "email": "not-an-email",
            "password": "Password123!",
            "confirm_password": "Password123!"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("valid email", res.get_json()['error'])

        # Mismatched password
        res = self.client.post('/api/auth/signup', json={
            "full_name": "Test User",
            "email": f"valid_{self.unique_suffix}@test.com",
            "password": "Password123!",
            "confirm_password": "DifferentPassword!"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("Passwords do not match", res.get_json()['error'])

    def test_2_successful_user_signup_and_role_security(self):
        email = f"user_{self.unique_suffix}@example.com"
        res = self.client.post('/api/auth/signup', json={
            "full_name": "Alice Learner",
            "email": email,
            "password": "SecurePassword123!",
            "confirm_password": "SecurePassword123!",
            "career_goal": "Full Stack Developer"
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertIn('token', data)
        self.assertEqual(data['user']['role'], 'user')  # Regular signup NEVER grants admin role
        self.assertNotIn('password_hash', data['user'])

        # Duplicate email prevention
        res_dup = self.client.post('/api/auth/signup', json={
            "full_name": "Clone User",
            "email": email,
            "password": "SecurePassword123!",
            "confirm_password": "SecurePassword123!"
        })
        self.assertEqual(res_dup.status_code, 409)
        self.assertIn("already registered", res_dup.get_json()['error'])

    def test_3_user_login(self):
        email = f"user_login_{self.unique_suffix}@example.com"
        pwd = "SecurePassword123!"
        # Create user first
        self.client.post('/api/auth/signup', json={
            "full_name": "Login Test User",
            "email": email,
            "password": pwd,
            "confirm_password": pwd
        })

        # Invalid password
        res_bad = self.client.post('/api/auth/login', json={
            "email": email,
            "password": "WrongPassword!"
        })
        self.assertEqual(res_bad.status_code, 401)

        # Successful login
        res = self.client.post('/api/auth/login', json={
            "email": email,
            "password": pwd
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertIn('token', data)
        self.assertEqual(data['user']['email'], email)

    def test_3b_logout_token_invalidation(self):
        email = f"user_logout_{self.unique_suffix}@example.com"
        pwd = "SecurePassword123!"
        res_signup = self.client.post('/api/auth/signup', json={
            "full_name": "Logout Test User",
            "email": email,
            "password": pwd,
            "confirm_password": pwd
        })
        token = res_signup.get_json()['token']

        # Token works initially
        res_me = self.client.get('/api/auth/me', headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_me.status_code, 200)

        # Call logout with token
        res_logout = self.client.post('/api/auth/logout', headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_logout.status_code, 200)

        # Attempt to use revoked token -> MUST be 401 Unauthorized
        res_revoked = self.client.get('/api/auth/me', headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_revoked.status_code, 401)
        self.assertIn("logged out", res_revoked.get_json()['error'])

    def test_4_admin_authorization_barrier(self):
        # Create regular user
        email = f"user_barrier_{self.unique_suffix}@example.com"
        pwd = "SecurePassword123!"
        res_signup = self.client.post('/api/auth/signup', json={
            "full_name": "Barrier Test User",
            "email": email,
            "password": pwd,
            "confirm_password": pwd
        })
        user_token = res_signup.get_json()['token']

        # Normal user tries to access admin stats -> MUST BE 403 Forbidden
        res_admin_stats = self.client.get('/api/admin/stats', headers={
            "Authorization": f"Bearer {user_token}"
        })
        self.assertEqual(res_admin_stats.status_code, 403)
        self.assertIn("Administrator privileges are required", res_admin_stats.get_json()['error'])

        # Normal user tries to access admin users list -> MUST BE 403 Forbidden
        res_admin_users = self.client.get('/api/admin/users', headers={
            "Authorization": f"Bearer {user_token}"
        })
        self.assertEqual(res_admin_users.status_code, 403)

        # Unauthenticated request -> MUST BE 401 Unauthorized
        res_unauth = self.client.get('/api/admin/stats')
        self.assertEqual(res_unauth.status_code, 401)

    def test_5_admin_login_and_admin_endpoints(self):
        # Login as admin
        res = self.client.post('/api/auth/login', json={
            "email": "admin@skills.ai",
            "password": "Admin@2025!"
        })
        self.assertEqual(res.status_code, 200)
        admin_data = res.get_json()
        self.assertEqual(admin_data['user']['role'], 'admin')
        admin_token = admin_data['token']

        # Admin accesses admin stats
        res_stats = self.client.get('/api/admin/stats', headers={
            "Authorization": f"Bearer {admin_token}"
        })
        self.assertEqual(res_stats.status_code, 200)
        stats = res_stats.get_json()['stats']
        self.assertGreaterEqual(stats['total_users'], 1)
        self.assertIn('registration_chart', stats)

        # Admin accesses admin users
        res_users = self.client.get('/api/admin/users', headers={
            "Authorization": f"Bearer {admin_token}"
        })
        self.assertEqual(res_users.status_code, 200)
        users_data = res_users.get_json()
        self.assertIn('users', users_data)
        self.assertGreaterEqual(len(users_data['users']), 1)

    def test_6_recommendation_and_progress_flow(self):
        email = f"user_flow_{self.unique_suffix}@example.com"
        pwd = "SecurePassword123!"
        res_signup = self.client.post('/api/auth/signup', json={
            "full_name": "Flow User",
            "email": email,
            "password": pwd,
            "confirm_password": pwd,
            "career_goal": "Full Stack Developer"
        })
        user_token = res_signup.get_json()['token']

        # Call recommendation with token
        rec_res = self.client.post('/api/recommend', 
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "career_goal": "Full Stack Developer",
                "existing_skills": ["HTML", "CSS", "JavaScript"]
            }
        )
        self.assertEqual(rec_res.status_code, 200)
        rec_data = rec_res.get_json()
        self.assertTrue(rec_data['success'])
        self.assertIn('match_percentage', rec_data)

        # Check user dashboard data
        dash_res = self.client.get('/api/user/dashboard', headers={
            "Authorization": f"Bearer {user_token}"
        })
        self.assertEqual(dash_res.status_code, 200)
        dash_data = dash_res.get_json()
        self.assertEqual(dash_data['user']['career_goal'], 'Full Stack Developer')

if __name__ == '__main__':
    unittest.main()
