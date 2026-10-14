
const BASE_URL = "http://localhost:5000";

const CACHE_DURATION = 30000;
const REQUEST_TIMEOUT = 60000;

const responseCache = new Map();
const pendingRequests = new Map();

let activeToken = null;

function getToken() {
return localStorage.getItem("token");
}

function clearApiCache() {
responseCache.clear();
pendingRequests.clear();
}

export async function apiRequest(endpoint, options = {}) {
const token = getToken();

if (token !== activeToken) {
clearApiCache();
activeToken = token;
}

const method = (options.method || "GET").toUpperCase();
const isGet = method === "GET";
const cacheKey = `${token || "guest"}:${endpoint}`;

if (isGet && !options.forceRefresh) {
const cached = responseCache.get(cacheKey);

if (cached && Date.now() - cached.time < CACHE_DURATION) {
return cached.data;
}

if (pendingRequests.has(cacheKey)) {
return pendingRequests.get(cacheKey);
}
}

const controller = new AbortController();

const timeout = setTimeout(() => {
controller.abort();
}, REQUEST_TIMEOUT);

const requestPromise = (async () => {
try {
const response = await fetch(`${BASE_URL}${endpoint}`, {
...options,
method,
signal: controller.signal,
headers: {
"Content-Type": "application/json",
...(token ? { Authorization: `Bearer ${token}` } : {}),
...options.headers
}
});

const data = await response.json().catch(() => ({}));

if (!response.ok) {
throw new Error(
data.message ||
data.error ||
`Request failed: ${response.status}`
);
}

if (isGet) {
responseCache.set(cacheKey, {
data,
time: Date.now()
});
} else {
clearApiCache();
}

return data;

} catch (error) {
if (error.name === "AbortError") {
throw new Error(
"Server response is taking too long. Please try again."
);
}

if (error instanceof TypeError) {
throw new Error(
"Unable to connect to the server. Check your internet connection or backend status."
);
}

throw error;

} finally {
clearTimeout(timeout);

if (isGet) {
pendingRequests.delete(cacheKey);
}
}
})();

if (isGet) {
pendingRequests.set(cacheKey, requestPromise);
}

return requestPromise;
}

export const registerUser = data =>
apiRequest("/api/users/register", {
method: "POST",
body: JSON.stringify(data)
});

export const loginUser = data =>
apiRequest("/api/users/login", {
method: "POST",
body: JSON.stringify(data)
});

export const getProfile = () =>
apiRequest("/api/users/profile");

export const updateProfile = data =>
apiRequest("/api/users/profile", {
method: "PUT",
body: JSON.stringify(data)
});

export const deleteAccount = (email, password) =>
apiRequest("/api/users/delete-account", {
method: "DELETE",
body: JSON.stringify({
email: String(email || "").trim().toLowerCase(),
password
})
});

export const searchStudents = (filters = {}) => {
const query = new URLSearchParams(
Object.entries(filters).filter(
([, value]) =>
value !== "" &&
value !== undefined &&
value !== null
)
).toString();

return apiRequest(
`/api/users/search${query ? `?${query}` : ""}`
);
};

export const getTeams = () =>
apiRequest("/api/teams");

export const createTeam = data =>
apiRequest("/api/teams", {
method: "POST",
body: JSON.stringify(data)
});

export const getTeamDetails = id =>
apiRequest(`/api/teams/${id}`);

export const getMissingSkills = id =>
apiRequest(`/api/teams/${id}/missing-skills`);

export const getRecommendations = id =>
apiRequest(`/api/teams/${id}/recommendations`);

export const leaveTeam = id =>
apiRequest(`/api/teams/${id}/leave`, {
method: "PUT"
});

export const removeTeamMember = (teamId, memberId) =>
apiRequest(`/api/teams/${teamId}/members/${memberId}`, {
method: "DELETE"
});

export const getMyInvitations = () =>
apiRequest("/api/invitations/my");

export const sendInvitation = data =>
apiRequest("/api/invitations", {
method: "POST",
body: JSON.stringify(data)
});

export const acceptInvitation = id =>
apiRequest(`/api/invitations/${id}/accept`, {
method: "PUT"
});

export const rejectInvitation = id =>
apiRequest(`/api/invitations/${id}/reject`, {
method: "PUT"
});

export const forgotPassword = email =>
apiRequest("/api/users/forgot-password", {
method: "POST",
body: JSON.stringify({ email })
});

export const resetPassword = (token, newPassword) =>
apiRequest("/api/users/reset-password", {
method: "POST",
body: JSON.stringify({
token,
newPassword
})
});
