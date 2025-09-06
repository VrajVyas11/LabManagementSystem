// src/api.js
const BASE_HOST = "http://localhost:5036";
// const BASE_HOST = ""

const base = ""; // keep empty so full URLs are used

async function request(path, opts = {}) {
  const headers = opts.headers || {};
  if (!(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const token = localStorage.getItem("token");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(path.startsWith("http") ? path : base + path, {
    ...opts,
    headers,
  });
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message = data?.message || res.statusText;
    throw new Error(message);
  }
  return data;
}

// Helper: fetch blob with auth and correct header
async function fetchBlobWithAuth(url) {
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}`, Accept: "application/pdf, image/*, application/octet-stream, */*" } : { Accept: "application/pdf, image/*, application/octet-stream, */*" };

  // Normalize url to absolute
  const fullUrl = url.startsWith("http") ? url : url.startsWith("/") ? `${BASE_HOST}${url}` : `${BASE_HOST}/${url}`;

  const res = await fetch(fullUrl, {
    method: "GET",
    headers,
  });

  // If unauthorized, forward meaningful message
  if (res.status === 401 || res.status === 403) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    const message = data?.message || res.statusText;
    throw new Error(message);
  }

  const blob = await res.blob();
  return blob;
}

// Return a blob URL for embedding (also returns blob)
async function getBlobUrlForSubmission(submissionId) {
  if (!submissionId) throw new Error("submissionId required");
  const url = `/api/submissions/${encodeURIComponent(submissionId)}/download`;
  const blob = await fetchBlobWithAuth(url);
  const blobUrl = window.URL.createObjectURL(blob);
  return { blobUrl, blob };
}

// Force-download a submission file (saves)
async function downloadSubmissionFile(submissionId, suggestedFilename) {
  if (!submissionId) throw new Error("submissionId required");
  const url = `${BASE_HOST}/api/submissions/${encodeURIComponent(submissionId)}/download`;
  const blob = await fetchBlobWithAuth(url);
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = suggestedFilename || "submission";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
  return true;
}

export const api = {
  // Auth
  register: (payload) =>
    request(`${BASE_HOST}/api/auth/register`, { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) =>
    request(`${BASE_HOST}/api/auth/login`, { method: "POST", body: JSON.stringify(payload) }),

  // Users
  me: () => request(`${BASE_HOST}/api/users/me`),
  users: () => request(`${BASE_HOST}/api/users`),
  updateProfile: (payload) =>
    request(`${BASE_HOST}/api/users/me`, { method: "PUT", body: JSON.stringify(payload) }),
  getUserStats: () => request(`${BASE_HOST}/api/users/me/stats`),

  // Labs
  createLab: (payload) =>
    request(`${BASE_HOST}/api/labs`, { method: "POST", body: JSON.stringify(payload) }),
  getLab: (id) => request(`${BASE_HOST}/api/labs/${id}`),
  listLabs: () => request(`${BASE_HOST}/api/labs`),
  updateLab: (id, payload) =>
    request(`${BASE_HOST}/api/labs/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteLab: (id) =>
    request(`${BASE_HOST}/api/labs/${id}`, { method: "DELETE" }),

  // Attendance
  clockIn: ({ labId, lateReason }) =>
    request(`${BASE_HOST}/api/attendance/clockin`, { method: "POST", body: JSON.stringify({ labId, lateReason }) }),
  clockOut: (labId) =>
    request(`${BASE_HOST}/api/attendance/clockout`, { method: "POST", body: JSON.stringify({ labId }) }),
  getMyAttendance: (labId) => request(`${BASE_HOST}/api/attendance/my/${labId}`),
  getLabAttendanceReport: (labId) => request(`${BASE_HOST}/api/attendance/report/${labId}`),

  // File downloads / previews
  downloadFileWithAuth: async (url, fileName) => {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}`, Accept: "*/*" } : { Accept: "*/*" };
    const fullUrl = url.startsWith("http") ? url : url.startsWith("/") ? `${BASE_HOST}${url}` : `${BASE_HOST}/${url}`;
    const res = await fetch(fullUrl, {
      method: "GET",
      headers,
    });
    console.log({token:token.slice(10),headers,fullUrl,res})
    if (!res.ok) {
      const text = await res.text();
      let data;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      const message = data?.message || res.statusText;
      throw new Error(message);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
    return true;
  },

  // Submissions
  submit: (labId, file) => {
    const form = new FormData();
    form.append("file", file);
    form.append("labId", labId);
    return request(`${BASE_HOST}/api/submissions`, { method: "POST", body: form });
  },
  getMySubmission: (labId) => {
    if (!labId) return Promise.reject(new Error("labId required"));
    return request(`${BASE_HOST}/api/submissions/my?labId=${encodeURIComponent(labId)}`);
  },
  getSubmissions: (labId) => {
    if (!labId) {
      return Promise.reject(new Error("labId is required for getSubmissions"));
    }
    return request(`${BASE_HOST}/api/submissions/lab/${labId}`);
  },
  getStudentSubmissions: (studentId) => request(`${BASE_HOST}/api/submissions/student/${studentId}`),
  gradeSubmission: (submissionId, payload) =>
    request(`${BASE_HOST}/api/submissions/${submissionId}/grade`, { method: "POST", body: JSON.stringify(payload) }),

  // New: get blob URL for inline preview and forced download
  getSubmissionBlobUrl: (submissionId) => getBlobUrlForSubmission(submissionId),
  downloadSubmissionFile: (submissionId, suggestedFilename) => downloadSubmissionFile(submissionId, suggestedFilename),

  // Notifications
  getNotifications: () => request(`${BASE_HOST}/api/notifications`),
  markNotificationRead: (notificationId) =>
    request(`${BASE_HOST}/api/notifications/${notificationId}/read`, { method: "POST" }),
  markAllNotificationsRead: () =>
    request(`${BASE_HOST}/api/notifications/read-all`, { method: "POST" }),
  deleteNotification: (notificationId) =>
    request(`${BASE_HOST}/api/notifications/${notificationId}`, { method: "DELETE" }),
  getNotificationsPaged: (page = 1, pageSize = 20) =>
    request(`${BASE_HOST}/api/notifications/all?page=${page}&pageSize=${pageSize}`),
  getNotificationPreferences: () => request(`${BASE_HOST}/api/notification-preferences`),
  updateNotificationPreferences: (payload) =>
    request(`${BASE_HOST}/api/notification-preferences`, { method: "PUT", body: JSON.stringify(payload) }),

  // Reports
  getLabReport: (labId) => request(`${BASE_HOST}/api/reports/lab/${labId}`),
  getStudentAnalytics: (studentId) => request(`${BASE_HOST}/api/reports/student/${studentId}`),
  getTeacherDashboard: () => request(`${BASE_HOST}/api/reports/teacher/dashboard`),

  // Settings
  updateSettings: (payload) =>
    request(`${BASE_HOST}/api/settings`, { method: "PUT", body: JSON.stringify(payload) }),
  getSettings: () => request(`${BASE_HOST}/api/settings`),

  // Subjects
  getSubjects: () => request(`${BASE_HOST}/api/subjects`),
};