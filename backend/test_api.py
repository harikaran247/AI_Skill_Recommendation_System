import unittest
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import app

class TestSkillRecommendationAPI(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_health(self):
        res = self.client.get('/api/health')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['status'], 'healthy')
        self.assertEqual(data['dataset_verified_rows'], 1640)

    def test_careers(self):
        res = self.client.get('/api/careers')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['count'], 11)

    def test_recommend_known_career(self):
        payload = {
            "career_goal": "Full Stack Developer",
            "existing_skills": ["HTML", "CSS", "JavaScript"]
        }
        res = self.client.post('/api/recommend', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['career_goal'], "Full Stack Developer")
        self.assertIn("Git and GitHub", data['missing_skills'])
        self.assertNotIn("HTML", data['missing_skills'])
        self.assertEqual(data['recommended_next_skill'], "Git and GitHub")
        self.assertGreater(data['match_percentage'], 0)
        self.assertGreater(len(data['learning_roadmap']), 0)

    def test_recommend_empty_skills(self):
        payload = {
            "career_goal": "AI Engineer",
            "existing_skills": []
        }
        res = self.client.post('/api/recommend', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['match_percentage'], 0.0)
        self.assertEqual(data['recommended_next_skill'], "Python")

    def test_recommend_unknown_career(self):
        payload = {
            "career_goal": "Quantum Web Architect",
            "existing_skills": ["HTML", "Python"]
        }
        res = self.client.post('/api/recommend', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertTrue(data['unknown_career'])
        self.assertGreater(len(data['suggested_alternative_careers']), 0)

    def test_model_info(self):
        res = self.client.get('/api/model-info')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['dataset_verification']['row_count'], 1640)
        self.assertAlmostEqual(data['metrics']['accuracy'], 0.9573, places=2)

    def test_profile_save_and_progress(self):
        # Save profile
        payload = {
            "name": "Jane Doe Tester",
            "career_goal": "Data Analyst",
            "existing_skills": ["Excel", "SQL"],
            "match_percentage": 20.0,
            "recommended_next_skill": "Data Cleaning",
            "roadmap": {
                "learning_roadmap": [
                    {"skill": "Data Cleaning", "priority": "High", "suggested_project": "Clean a Messy Dataset"},
                    {"skill": "Python", "priority": "High", "suggested_project": "Python Data Analysis Script"}
                ]
            }
        }
        res = self.client.post('/api/profiles/save', json=payload)
        self.assertEqual(res.status_code, 200)
        save_data = res.get_json()
        profile_id = save_data['profile_id']

        # Get progress
        res_prog = self.client.get(f'/api/profiles/{profile_id}/progress')
        self.assertEqual(res_prog.status_code, 200)
        prog_data = res_prog.get_json()
        self.assertEqual(prog_data['profile']['name'], "Jane Doe Tester")
        self.assertEqual(prog_data['metrics']['total_skills_tracked'], 2)

        # Update one skill
        item_id = prog_data['skills_progress'][0]['id']
        res_patch = self.client.patch(f'/api/progress/{item_id}', json={"status": "completed", "project_completed": True})
        self.assertEqual(res_patch.status_code, 200)

        # Check updated progress
        res_prog2 = self.client.get(f'/api/profiles/{profile_id}/progress')
        prog_data2 = res_prog2.get_json()
        self.assertEqual(prog_data2['metrics']['completed'], 1)
        self.assertEqual(prog_data2['metrics']['progress_percentage'], 50.0)

        # Cleanup
        self.client.delete(f'/api/profiles/{profile_id}')

if __name__ == '__main__':
    unittest.main()
