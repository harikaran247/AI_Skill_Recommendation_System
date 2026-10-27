// Frontend API Service
const API_BASE = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Health & System
export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchCareers() {
  const res = await fetch(`${API_BASE}/careers`);
  return res.json();
}

export async function fetchAllSkills() {
  const res = await fetch(`${API_BASE}/all-skills`);
  return res.json();
}

export async function fetchSampleProfiles() {
  const res = await fetch(`${API_BASE}/sample-profiles`);
  return res.json();
}

export async function fetchModelInfo() {
  const res = await fetch(`${API_BASE}/model-info`);
  return res.json();
}

// ML Recommendation
export async function getRecommendations(careerGoal, existingSkills) {
  const res = await fetch(`${API_BASE}/recommend`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({
      career_goal: careerGoal,
      existing_skills: existingSkills
    })
  });
  return res.json();
}

// Resume Parser
export async function uploadResume(file) {
  const formData = new FormData();
  formData.append('resume', file);

  const res = await fetch(`${API_BASE}/upload-resume`, {
    method: 'POST',
    headers: {
      ...getAuthHeader()
    },
    body: formData
  });
  return res.json();
}

// Authentication APIs
export async function apiSignUp(payload) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function apiLogin(payload) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function apiLogout() {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeader()
    }
  });
  return res.json();
}

export async function apiGetMe() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      ...getAuthHeader()
    }
  });
  return res.json();
}

// User Dashboard APIs
export async function apiGetUserDashboard() {
  const res = await fetch(`${API_BASE}/user/dashboard`, {
    headers: {
      ...getAuthHeader()
    }
  });
  return res.json();
}

export async function apiUpdateUserProgress(progressId, payload) {
  const res = await fetch(`${API_BASE}/user/progress/${progressId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function apiToggleProgressTopic(payload) {
  const res = await fetch(`${API_BASE}/user/toggle-progress-topic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function apiSaveUserRoadmap(payload) {
  const res = await fetch(`${API_BASE}/user/save-roadmap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function apiUpdateUserSkills(payload) {
  const res = await fetch(`${API_BASE}/user/skills`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function apiUpdateUserCareerGoal(payload) {
  const res = await fetch(`${API_BASE}/user/career-goal`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(payload)
  });
  return res.json();
}

// Admin APIs (Protected with Admin Token)
export async function apiGetAdminStats() {
  const res = await fetch(`${API_BASE}/admin/stats`, {
    headers: {
      ...getAuthHeader()
    }
  });
  return res.json();
}

export async function apiGetAdminUsers(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/admin/users?${query}`, {
    headers: {
      ...getAuthHeader()
    }
  });
  return res.json();
}

export async function apiGetAdminUserDetail(userId) {
  const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
    headers: {
      ...getAuthHeader()
    }
  });
  return res.json();
}

export async function apiUpdateUserStatus(userId, status) {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ status })
  });
  return res.json();
}

// Legacy Profiles APIs
export async function saveUserProfile(payload) {
  const res = await fetch(`${API_BASE}/profiles/save`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function fetchProfiles() {
  const res = await fetch(`${API_BASE}/profiles`, {
    headers: {
      ...getAuthHeader()
    }
  });
  return res.json();
}

export async function fetchProfileProgress(profileId) {
  const res = await fetch(`${API_BASE}/profiles/${profileId}/progress`, {
    headers: {
      ...getAuthHeader()
    }
  });
  return res.json();
}

export async function updateSkillProgress(progressId, payload) {
  const res = await fetch(`${API_BASE}/progress/${progressId}`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function deleteProfile(profileId) {
  const res = await fetch(`${API_BASE}/profiles/${profileId}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeader()
    }
  });
  return res.json();
}
