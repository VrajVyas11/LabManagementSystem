// simple API client that sends JWT from localStorage and handles JSON/form
const base = "";

async function request(path, opts = {}) {
  const headers = opts.headers || {};
  if (!(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const token = localStorage.getItem("token");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(base + path, {
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

export const api = {
  register: (payload) =>
    request("http://localhost:5036/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) =>
    request("http://localhost:5036/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),

  me: () => request("http://localhost:5036/api/users/me"),
  users: () => request("http://localhost:5036/api/users"),

  createLab: (payload) =>
    request("http://localhost:5036/api/labs", { method: "POST", body: JSON.stringify(payload) }),
  getLab: (id) => request(`http://localhost:5036/api/labs/${id}`),
  listLabs: () => request(`http://localhost:5036/api/labs`),

  clockIn: (labId) =>
    request("http://localhost:5036/api/attendance/clockin", { method: "POST", body: JSON.stringify({ labId }) }),
  clockOut: (labId) =>
    request("http://localhost:5036/api/attendance/clockout", { method: "POST", body: JSON.stringify({ labId }) }),

  submit: (labId, file) => {
    const form = new FormData();
    form.append("file", file);
    form.append("labId", labId);
    return request("http://localhost:5036/api/submissions", { method: "POST", body: form });
  },
};