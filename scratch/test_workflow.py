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

print("=================================================================")
print("TESTING FULL WORKFLOW: AI-BASED SKILL RECOMMENDATION SYSTEM")
print("=================================================================")

# -------------------------------------------------------------
# 1. ENTER KNOWN SKILLS & AUTOCOMPLETE CHECK
# -------------------------------------------------------------
print("\n--- 1. Testing Autocomplete Skill Catalog ---")
status, all_skills = request_json('GET', '/api/all-skills')
assert status == 200
assert all_skills['count'] >= 50, f"Expected 50+ canonical skills, got {all_skills['count']}"
print(f"Verified {all_skills['count']} skills available for instant autocomplete.")

# -------------------------------------------------------------
# 2. RECOMMEND BEST 3 DOMAINS (SKILLS ONLY, NO DOMAIN SELECTED)
# -------------------------------------------------------------
print("\n--- 2. Testing Top 3 Domains Recommendation (Skills Only) ---")
test_skills = ['Python', 'NumPy', 'Pandas']
status, res_domains = request_json('POST', '/api/recommend', {
    'career_goal': None,
    'existing_skills': test_skills
})
assert status == 200, f"Recommendation failed: {res_domains}"
assert res_domains['is_skills_only'] is True

top_3 = res_domains.get('top_3_domains') or res_domains.get('courses', [])[:3]
assert len(top_3) == 3, f"Expected exactly 3 domains, got {len(top_3)}"

print("Top 3 Domains Ranked by Skill Match %:")
prev_pct = 100.0
for idx, domain in enumerate(top_3, 1):
    d_name = domain['domain_name']
    pct = domain['match_percentage']
    known = domain['matching_skills']
    missing = domain['missing_skills']
    total = domain['total_required']
    
    print(f"  {idx}. {d_name}: {pct}% Match ({len(known)}/{total} skills acquired)")
    print(f"     - Matching Known Skills: {known}")
    print(f"     - Missing Skills to Learn: {missing[:3]}...")
    
    # Verify formula: (acquired / total) * 100
    expected_pct = round((len(known) / total) * 100, 1)
    assert pct == expected_pct, f"Formula mismatch for {d_name}: got {pct}, expected {expected_pct}"
    # Verify descending rank
    assert pct <= prev_pct, f"Domains not ranked descending: {pct} > {prev_pct}"
    prev_pct = pct

# -------------------------------------------------------------
# 3. SELECT A DOMAIN (AI Engineer)
# -------------------------------------------------------------
print("\n--- 3. Testing Domain Selection & Personalized Dashboard ---")
selected_domain = "AI Engineer"
status, res_selected = request_json('POST', '/api/recommend', {
    'career_goal': selected_domain,
    'existing_skills': test_skills
})
assert status == 200
assert res_selected['career_goal'] == selected_domain
assert res_selected['match_percentage'] == 27.3, f"Expected 27.3%, got {res_selected['match_percentage']}%"
assert res_selected['recommended_next_skill'] == "Statistics and Probability"
assert res_selected['recommended_next_skill'] not in test_skills, "Recommended a skill user already knows!"
assert len(res_selected['learning_roadmap']) > 0
for step in res_selected['learning_roadmap']:
    assert 'priority' in step, f"Roadmap step missing priority: {step}"
    assert step['skill'] not in test_skills, f"Roadmap contains acquired skill: {step['skill']}"

print(f"Selected Domain: {res_selected['career_goal']}")
print(f"Known Skills: {res_selected['acquired_skills']}")
print(f"Skills to Learn: {len(res_selected['missing_skills'])} missing")
print(f"Skill Match: {res_selected['match_percentage']}%")
print(f"Next Recommended Skill: {res_selected['recommended_next_skill']}")
print(f"Curriculum Roadmap: {len(res_selected['learning_roadmap'])} steps with priority levels")

# -------------------------------------------------------------
# 4. DYNAMIC PROGRESS UPDATES & MONGODB RESTORATION
# -------------------------------------------------------------
print("\n--- 4. Testing Dynamic Progress Updates & Persistence ---")
ts = int(time.time() * 1000)
user_email = f"learner_{ts}@skillsai.com"

# Signup new user
status, signup_res = request_json('POST', '/api/auth/signup', {
    'full_name': 'Dynamic Learner',
    'email': user_email,
    'password': 'Password123!',
    'confirm_password': 'Password123!',
    'career_goal': selected_domain
})
assert status == 201
user_token = signup_res['token']
user_id = signup_res['user']['id']
print(f"Learner signed up: ID {user_id}")

# Initial recommendation with skills
status, rec_init = request_json('POST', '/api/recommend', {
    'career_goal': selected_domain,
    'existing_skills': test_skills
}, token=user_token)
assert status == 200
assert rec_init['match_percentage'] == 27.3
assert rec_init['recommended_next_skill'] == "Statistics and Probability"

# Fetch user dashboard
status, dash_init = request_json('GET', '/api/user/dashboard', token=user_token)
assert status == 200
assert len(dash_init['progress']) > 0
stat_milestone = [p for p in dash_init['progress'] if p['skill_name'] == 'Statistics and Probability'][0]
print(f"Target Uncompleted Milestone: {stat_milestone['skill_name']} (ID: {stat_milestone['id']})")

# USER COMPLETES LEARNING SKILL: Statistics and Probability
print("\nMarking 'Statistics and Probability' as completed...")
status, progress_update = request_json('PATCH', f'/api/user/progress/{stat_milestone["id"]}', {
    'status': 'completed',
    'project_completed': True
}, token=user_token)
assert status == 200, f"Progress update failed: {progress_update}"

# Verify skill moved to known skills
updated_skills = [s['skill_name'] for s in progress_update['skills']]
print(f"Updated Known Skills: {updated_skills}")
assert "Statistics and Probability" in updated_skills, "Completed skill not moved to known skills!"
assert len(updated_skills) == 4, f"Expected 4 known skills, got {len(updated_skills)}"

# Verify recalculated skill match percentage: 4 / 11 * 100 = 36.4%
new_match_pct = progress_update['match_percentage']
print(f"Recalculated Skill Match (%): {new_match_pct}%")
expected_new_pct = round((4 / 11) * 100, 1) # 36.4%
assert new_match_pct == expected_new_pct, f"Expected {expected_new_pct}%, got {new_match_pct}%"

# Verify updated remaining skills & next recommendation
new_rec = progress_update['recommendation']
assert "Statistics and Probability" not in new_rec['missing_skills'], "Completed skill still in missing skills!"
assert len(new_rec['missing_skills']) == 7, f"Expected 7 missing skills, got {len(new_rec['missing_skills'])}"
print(f"Updated Missing Skills count: {len(new_rec['missing_skills'])}")
print(f"Updated Next Recommended Skill: {new_rec['recommended_next_skill']}")
assert new_rec['recommended_next_skill'] == "Data Visualization"
assert new_rec['recommended_next_skill'] not in updated_skills

# -------------------------------------------------------------
# 5. RESTORE ON NEXT LOGIN
# -------------------------------------------------------------
print("\n--- 5. Testing Restore on Next Login ---")
status, login_res = request_json('POST', '/api/auth/login', {
    'email': user_email,
    'password': 'Password123!'
})
assert status == 200
restored_token = login_res['token']

status, dash_restored = request_json('GET', '/api/user/dashboard', token=restored_token)
assert status == 200
restored_skills = [s['skill_name'] for s in dash_restored['skills']]
assert "Statistics and Probability" in restored_skills
assert dash_restored['recommendation']['match_percentage'] == expected_new_pct
assert dash_restored['recommendation']['recommended_next_skill'] == "Data Visualization"
assert len(dash_restored['recommendation']['missing_skills']) == 7
print(f"Login Restore Verified:")
print(f"  - Restored Skills Count: {len(restored_skills)}")
print(f"  - Restored Match Percentage: {dash_restored['recommendation']['match_percentage']}%")
print(f"  - Restored Next Recommendation: {dash_restored['recommendation']['recommended_next_skill']}")

print("\n=================================================================")
print("ALL WORKFLOW REQUIREMENTS (1, 2, 3, 4, 5) SUCCESSFULLY VERIFIED!")
print("=================================================================")
