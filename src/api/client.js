const BASE = '/api';

function getToken() {
  const saved = localStorage.getItem('mode_mentor_token');
  return saved || '';
}

export async function fetchWithAuth(url, options = {}) {
  const token = getToken();
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  
  return fetch(url, { ...options, headers });
}

export async function fetchPoints(userId) {
  const res = await fetchWithAuth(`${BASE}/points/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch points');
  return res.json();
}

export async function fetchAdminAnalytics() {
  const res = await fetchWithAuth(`${BASE}/admin/analytics`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function fetchAdminTrends() {
  const res = await fetchWithAuth(`${BASE}/admin/analytics/trends`);
  if (!res.ok) throw new Error('Failed to fetch admin trends');
  return res.json();
}

export async function fetchAdminAlerts() {
  const res = await fetchWithAuth(`${BASE}/admin/alerts`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function submitRecommendation(userId, data) {
  const res = await fetchWithAuth(`${BASE}/recommendations/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to submit recommendation');
  return res.json();
}

export async function submitAdminIssue(data) {
  const res = await fetchWithAuth(`${BASE}/issues/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to submit issue report');
  return res.json();
}

export async function joinChallenge(challengeId, userId) {
  const res = await fetchWithAuth(`${BASE}/challenges/${challengeId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  if (!res.ok) throw new Error('Failed to join challenge');
  return res.json();
}

export async function completeChallenge(challengeId, userId) {
  const res = await fetchWithAuth(`${BASE}/challenges/${challengeId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  if (!res.ok) throw new Error('Failed to complete challenge');
  return res.json();
}

export async function loginUser(employeeId, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId, password })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to login');
  }
  return res.json(); // Returns { token, user }
}

export async function signupUser(employeeId, department, role, password) {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId, department, role, password })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to signup');
  }
  return res.json(); // Returns { token, user }
}

export async function adminLogin(employeeId, password) {
  const res = await fetch(`${BASE}/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId, password })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to authenticate admin');
  }
  return res.json(); // Returns { token, user }
}

export async function redeemReward(userId, rewardId) {
  const res = await fetchWithAuth(`${BASE}/points/${userId}/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rewardId })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to redeem reward');
  }
  return res.json();
}
