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

export async function signupUser(employeeId, department, role, password, email = null) {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId, department, role, password, email })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to signup');
  }
  return res.json(); // Returns { message, user }
}

export async function forgotPassword(identifier) {
  const res = await fetch(`${BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to process password reset request');
  }
  return data;
}

export async function resetPassword(token, newPassword) {
  const res = await fetch(`${BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to reset password');
  }
  return data;
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

export async function broadcastAdminSuggestion(message, department) {
  const res = await fetchWithAuth(`${BASE}/admin/broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, department })
  });
  if (!res.ok) {
    let errMsg = 'Failed to broadcast suggestion';
    try {
      const errJson = await res.json();
      if (errJson.error) errMsg = errJson.error;
    } catch (_) {}
    throw new Error(errMsg);
  }
  return res.json();
}

export async function fetchAdminReflections(limit = 20) {
  const res = await fetchWithAuth(`${BASE}/admin/reflections?limit=${limit}`);
  if (!res.ok) {
    let errMsg = 'Failed to fetch reflections';
    try {
      const errJson = await res.json();
      if (errJson.error) errMsg = errJson.error;
    } catch (_) {}
    throw new Error(errMsg);
  }
  return res.json();
}

// ── Mentor Notes (Interactive) ──────────────────────────────────────────────

export async function submitMentorPost(message) {
  const res = await fetchWithAuth(`${BASE}/admin/mentor-posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit message');
  }
  return res.json();
}

export async function fetchMyMentorPosts() {
  const res = await fetchWithAuth(`${BASE}/admin/mentor-posts/my`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch mentor posts');
  }
  return res.json();
}

export async function fetchAllMentorPosts() {
  const res = await fetchWithAuth(`${BASE}/admin/mentor-posts`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch all mentor posts');
  }
  return res.json();
}

export async function replyToMentorPost(postId, message) {
  const res = await fetchWithAuth(`${BASE}/admin/mentor-posts/${postId}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send reply');
  }
  return res.json();
}
