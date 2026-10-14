
import { useEffect, useState } from "react";
import "./App.css";

import Dashboard from "./Dashboard";
import TeamWorkspace from "./TeamWorkspace";
import StudentSearch from "./StudentSearch";
import EditProfile from "./EditProfile";

import {
loginUser,
registerUser,
getProfile,
updateProfile,
forgotPassword,
resetPassword
} from "./api";

const PRIVATE_PAGES = ["dashboard", "students", "teams", "profile"];

function extractProfile(response) {
return (
response?.user ||
response?.profile ||
response?.data?.user ||
response?.data?.profile ||
response?.data ||
response
);
}

function readSavedUser() {
try {
const token = localStorage.getItem("token");
const savedUser = localStorage.getItem("user");

if (!token || !savedUser) return null;

const parsed = JSON.parse(savedUser);

return parsed && typeof parsed === "object" && parsed.email
? parsed
: null;
} catch {
return null;
}
}

function readSavedPage() {
const savedPage = sessionStorage.getItem("currentPage");

return PRIVATE_PAGES.includes(savedPage)
? savedPage
: "dashboard";
}

function App() {
const params = new URLSearchParams(window.location.search);

const [verificationResult] = useState(
params.get("verification") || ""
);

const [resetToken] = useState(
params.get("resetToken") || ""
);

const [user, setUser] = useState(readSavedUser);

const [page, setPage] = useState(() => {
if (params.has("resetToken")) return "reset-password";
if (params.has("verification")) return "verification-result";

return localStorage.getItem("token")
? readSavedPage()
: "login";
});

const [checkingSession, setCheckingSession] = useState(() =>
Boolean(localStorage.getItem("token")) &&
!params.has("resetToken") &&
!params.has("verification")
);

const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);
const [branch, setBranch] = useState("CSE");
const [year, setYear] = useState("3");
const [loading, setLoading] = useState(false);
const [verificationEmail, setVerificationEmail] = useState("");
const [newPassword, setNewPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [headerPhoto, setHeaderPhoto] = useState("");

useEffect(() => {
if (params.has("resetToken") || params.has("verification")) {
return;
}

let cancelled = false;

async function restoreSession() {
const token = localStorage.getItem("token");

if (!token) {
if (!cancelled) {
setUser(null);
setPage("login");
setCheckingSession(false);
}
return;
}

try {
const response = await getProfile();
const profile = extractProfile(response);

if (!profile || typeof profile !== "object" || !profile.email) {
throw new Error("Invalid user session");
}

if (cancelled) return;

localStorage.setItem("user", JSON.stringify(profile));
setUser(profile);
setPage(readSavedPage());
} catch (error) {
if (cancelled) return;

const message = String(error.message || "").toLowerCase();

if (
message.includes("unauthorized") ||
message.includes("invalid token") ||
message.includes("expired") ||
message.includes("jwt") ||
message.includes("user not found") ||
message.includes("not authorized")
) {
localStorage.removeItem("token");
localStorage.removeItem("user");
sessionStorage.removeItem("currentPage");
setUser(null);
setPage("login");
} else {
const savedUser = readSavedUser();

if (savedUser) {
setUser(savedUser);
setPage(readSavedPage());
} else {
setPage("login");
}
}
} finally {
if (!cancelled) {
setCheckingSession(false);
}
}
}

restoreSession();

return () => {
cancelled = true;
};
}, []);

useEffect(() => {
if (user && PRIVATE_PAGES.includes(page)) {
sessionStorage.setItem("currentPage", page);
}
}, [page, user]);

useEffect(() => {
if (!user) {
setHeaderPhoto("");
return;
}

const id = user._id || user.id || user.email || "student";
const key = `stf-profile-${id}`;

async function refreshPhoto() {
try {
const response = await getProfile();
const latestUser = extractProfile(response);

if (latestUser?.email) {
setUser(previous => {
const merged = {
...previous,
...latestUser
};

localStorage.setItem("user", JSON.stringify(merged));

return merged;
});
}

setHeaderPhoto(
latestUser?.profilePhoto ||
localStorage.getItem(key) ||
""
);
} catch {
setHeaderPhoto(
user.profilePhoto ||
localStorage.getItem(key) ||
""
);
}
}

refreshPhoto();

window.addEventListener(
"stf-profile-photo-updated",
refreshPhoto
);

return () => {
window.removeEventListener(
"stf-profile-photo-updated",
refreshPhoto
);
};
}, [user?._id, user?.id, user?.email]);

function goToLogin() {
window.history.replaceState({}, "", "/");
setPassword("");
setNewPassword("");
setConfirmPassword("");
setShowPassword(false);
setPage("login");
}

async function handleLogin(event) {
event.preventDefault();

if (!email.trim() || !password) {
alert("Enter email and password");
return;
}

setLoading(true);

try {
const data = await loginUser({
email: email.trim().toLowerCase(),
password
});

const token = data?.token || data?.data?.token;

if (!token) {
throw new Error("Login response does not contain a token");
}

localStorage.setItem("token", token);

const profileResponse = await getProfile();
const profile = extractProfile(profileResponse);

if (
!profile ||
typeof profile !== "object" ||
!profile.email
) {
throw new Error("Unable to load user profile");
}

localStorage.setItem("user", JSON.stringify(profile));
sessionStorage.setItem("currentPage", "dashboard");

setUser(profile);
setPassword("");
setPage("dashboard");
} catch (error) {
localStorage.removeItem("token");
localStorage.removeItem("user");
alert(error.message || "Login failed");
} finally {
setLoading(false);
}
}

async function handleRegister(event) {
event.preventDefault();

if (!name.trim() || !email.trim() || !password) {
alert("Fill all required fields");
return;
}

if (password.length < 8) {
alert("Password must contain at least 8 characters");
return;
}

setLoading(true);

try {
const studentEmail = email.trim().toLowerCase();

await registerUser({
name: name.trim(),
email: studentEmail,
password,
branch,
year: Number(year),
skills: [],
interests: [],
availability: true,
experience: "Beginner"
});

setVerificationEmail(studentEmail);
setPassword("");
setPage("check-email");
} catch (error) {
alert(error.message || "Registration failed");
} finally {
setLoading(false);
}
}

async function handleForgotPassword(event) {
event.preventDefault();

if (!email.trim()) {
alert("Enter your registered email");
return;
}

setLoading(true);

try {
await forgotPassword(email.trim().toLowerCase());
setPage("reset-email-sent");
} catch (error) {
alert(error.message || "Unable to send reset link");
} finally {
setLoading(false);
}
}

async function handleResetPassword(event) {
event.preventDefault();

if (!resetToken) {
alert("Invalid password reset link");
return;
}

if (newPassword.length < 8) {
alert("New password must contain at least 8 characters");
return;
}

if (newPassword !== confirmPassword) {
alert("Passwords do not match");
return;
}

setLoading(true);

try {
await resetPassword(resetToken, newPassword);
alert("Password changed successfully. Please login.");
goToLogin();
} catch (error) {
alert(error.message || "Unable to reset password");
} finally {
setLoading(false);
}
}

async function handleProfileSave(updatedUser) {
const profileData = {
name: updatedUser.name,
branch: updatedUser.branch,
year: Number(updatedUser.year),
skills: updatedUser.skills,
interests: updatedUser.interests,
experience: updatedUser.experience,
availability: updatedUser.availability
};

const response = await updateProfile(profileData);
const savedProfile = extractProfile(response);

const merged = {
...user,
...profileData,
...(savedProfile &&
typeof savedProfile === "object" &&
savedProfile.email
? savedProfile
: {})
};

setUser(merged);
localStorage.setItem("user", JSON.stringify(merged));

return response;
}

function logout() {
localStorage.removeItem("token");
localStorage.removeItem("user");
sessionStorage.removeItem("currentPage");

setUser(null);
setHeaderPhoto("");
setName("");
setEmail("");
setPassword("");
setVerificationEmail("");
setNewPassword("");
setConfirmPassword("");
goToLogin();
}

const authPages = [
"login",
"register",
"check-email",
"verification-result",
"forgot-password",
"reset-email-sent",
"reset-password"
];

if (checkingSession) {
return (
<div
style={{
minHeight: "100vh",
display: "flex",
alignItems: "center",
justifyContent: "center",
fontFamily: "Arial, sans-serif",
fontSize: 18,
color: "#2563eb",
background: "#f8fafc"
}}
>
Loading your account...
</div>
);
}

if (!user && !authPages.includes(page)) {
return (
<div
style={{
minHeight: "100vh",
display: "flex",
alignItems: "center",
justifyContent: "center"
}}
>
<button
className="primary-btn"
onClick={goToLogin}
>
Go to Login
</button>
</div>
);
}

if (authPages.includes(page)) {
return (
<div className="auth-page">
<div className="auth-brand">
<div className="brand-icon">ST</div>

<h1>Student Team Formation</h1>

<p>
Find your teammates. Build something amazing.
</p>

<div className="brand-feature">
✓ Skill-Based Team Formation
</div>

<div className="brand-feature">
✓ Smart Student Recommendations
</div>

<div className="brand-feature">
✓ Collaborate on Projects
</div>
</div>

<div className="auth-card">
<h2>
{page === "login" && "Welcome Back!"}
{page === "register" && "Create Account"}
{page === "check-email" && "Check Your Email"}

{page === "verification-result" &&
(verificationResult === "success"
? "Your Email Is Verified Successfully!"
: "Email Verification Status")}

{page === "forgot-password" && "Forgot Password"}
{page === "reset-email-sent" && "Check Your Email"}
{page === "reset-password" && "Reset Password"}
</h2>

<p className="muted">
{page === "login" &&
"Sign in to your student account"}

{page === "register" &&
"Join the student collaboration platform"}

{page === "forgot-password" &&
"Enter your registered email to receive a password reset link"}

{page === "reset-password" &&
"Enter your new password"}
</p>

{(page === "login" || page === "register") && (
<form
onSubmit={
page === "login"
? handleLogin
: handleRegister
}
>
{page === "register" && (
<>
<label>Full Name</label>

<input
type="text"
placeholder="Enter full name"
value={name}
onChange={event =>
setName(event.target.value)
}
required
/>
</>
)}

<label>Email Address</label>

<input
type="email"
placeholder="Enter email address"
value={email}
onChange={event =>
setEmail(event.target.value)
}
required
/>

<label>Password</label>

<input
type={showPassword ? "text" : "password"}
placeholder="Enter password"
value={password}
onChange={event =>
setPassword(event.target.value)
}
minLength={
page === "register" ? 8 : undefined
}
required
/>

<label
style={{
display: "flex",
alignItems: "center",
gap: 8,
marginTop: 10,
cursor: "pointer"
}}
>
<input
type="checkbox"
checked={showPassword}
onChange={event =>
setShowPassword(event.target.checked)
}
style={{
width: "auto",
margin: 0
}}
/>

Show Password
</label>

{page === "register" && (
<>
<label>Branch</label>

<select
value={branch}
onChange={event =>
setBranch(event.target.value)
}
>
{[
"CSE",
"IT",
"ECE",
"EEE",
"MECH",
"CIVIL"
].map(item => (
<option key={item} value={item}>
{item}
</option>
))}
</select>

<label>Year</label>

<select
value={year}
onChange={event =>
setYear(event.target.value)
}
>
{[1, 2, 3, 4].map(item => (
<option
key={item}
value={String(item)}
>
{item} Year
</option>
))}
</select>
</>
)}

<button
className="primary-btn"
type="submit"
disabled={loading}
>
{loading
? "Please wait..."
: page === "login"
? "Sign In"
: "Create Account"}
</button>
</form>
)}

{page === "check-email" && (
<div style={{ textAlign: "center" }}>
<div style={{ fontSize: 48 }}>✉️</div>

<p>
We have sent a verification link to:
</p>

<p>
<strong>{verificationEmail}</strong>
</p>

<p>
Open your email and click{" "}
<strong>Verify Your Email Address</strong>{" "}
to complete your registration.
</p>

<p className="muted">
This link expires in 15 minutes.
</p>

<button
type="button"
className="primary-btn"
onClick={goToLogin}
>
Back to Login
</button>
</div>
)}

{page === "verification-result" && (
<div style={{ textAlign: "center" }}>
<div style={{ fontSize: 48 }}>
{verificationResult === "success"
? "✅"
: "⚠️"}
</div>

<p>
{verificationResult === "success"
? "Your account has been created successfully. You can now login."
: verificationResult === "already"
? "This email is already registered. Please login."
: "Verification link is invalid, expired, or could not be processed."}
</p>

<button
className="primary-btn"
type="button"
onClick={() => {
goToLogin();

if (
verificationResult !== "success" &&
verificationResult !== "already"
) {
setPage("register");
}
}}
>
{verificationResult === "success" ||
verificationResult === "already"
? "Go to Login"
: "Back to Registration"}
</button>
</div>
)}

{page === "forgot-password" && (
<form onSubmit={handleForgotPassword}>
<label>Registered Email Address</label>

<input
type="email"
placeholder="Enter registered email"
value={email}
onChange={event =>
setEmail(event.target.value)
}
required
/>

<button
className="primary-btn"
type="submit"
disabled={loading}
>
{loading
? "Sending..."
: "Send Reset Link"}
</button>
</form>
)}

{page === "reset-email-sent" && (
<div style={{ textAlign: "center" }}>
<div style={{ fontSize: 48 }}>✉️</div>

<p>
If this email is registered, a password
reset link has been sent.
</p>

<p className="muted">
Check your inbox or spam folder.
</p>

<button
type="button"
className="primary-btn"
onClick={goToLogin}
>
Back to Login
</button>
</div>
)}

{page === "reset-password" && (
<form onSubmit={handleResetPassword}>
<label>New Password</label>

<input
type="password"
placeholder="Enter new password"
value={newPassword}
onChange={event =>
setNewPassword(event.target.value)
}
minLength={8}
required
/>

<label>Confirm New Password</label>

<input
type="password"
placeholder="Confirm new password"
value={confirmPassword}
onChange={event =>
setConfirmPassword(event.target.value)
}
minLength={8}
required
/>

<button
className="primary-btn"
type="submit"
disabled={loading}
>
{loading
? "Please wait..."
: "Reset Password"}
</button>
</form>
)}

{page === "login" && (
<p className="auth-switch">
<button
type="button"
onClick={() => {
setPassword("");
setShowPassword(false);
setPage("forgot-password");
}}
>
Forgot Password?
</button>
</p>
)}

{(page === "login" ||
page === "register") && (
<p className="auth-switch">
{page === "login"
? "Don't have an account?"
: "Already have an account?"}

<button
type="button"
onClick={() => {
setPassword("");
setShowPassword(false);

setPage(
page === "login"
? "register"
: "login"
);
}}
>
{page === "login"
? "Sign Up"
: "Sign In"}
</button>
</p>
)}

{(page === "forgot-password" ||
page === "reset-password") && (
<p className="auth-switch">
<button
type="button"
onClick={goToLogin}
>
Back to Login
</button>
</p>
)}

<p className="demo-note">
Connected to Student Team Formation Backend
</p>
</div>
</div>
);
}

return (
<div className="app-layout">
<aside className="sidebar">
<div className="sidebar-brand">
<span>ST</span> Team Formation
</div>

<nav>
{[
["dashboard", "⌂", "Dashboard"],
["students", "♙", "Find Students"],
["teams", "▦", "My Teams"],
["profile", "◉", "My Profile"]
].map(([id, symbol, label]) => (
<button
key={id}
type="button"
className={
page === id
? "nav-item active"
: "nav-item"
}
onClick={() => setPage(id)}
>
<span>{symbol}</span>
{label}
</button>
))}
</nav>

<button
className="logout-btn"
type="button"
onClick={logout}
>
↪ Logout
</button>
</aside>

<main className="main-content">
<header className="topbar">
<div>
<strong>Student Team Formation</strong>

<p className="muted">
Connect. Collaborate. Create.
</p>
</div>

<button
type="button"
className="user-chip"
onClick={() => setPage("profile")}
title="Open My Profile"
style={{
cursor: "pointer",
border: 0,
display: "flex",
alignItems: "center",
gap: 10,
background: "transparent",
color: "inherit"
}}
>
<span
className="avatar"
style={{
display: "inline-flex",
alignItems: "center",
justifyContent: "center",
overflow: "hidden",
borderRadius: "50%",
width: 40,
height: 40,
flexShrink: 0
}}
>
{headerPhoto ? (
<img
src={headerPhoto}
alt="My Profile"
style={{
width: "100%",
height: "100%",
objectFit: "cover",
borderRadius: "50%"
}}
/>
) : (
user?.name
?.charAt(0)
?.toUpperCase() || "U"
)}
</span>

<span>
{user?.name || "Student"}
</span>
</button>
</header>

{page === "dashboard" && (
<Dashboard
user={user}
onNavigate={setPage}
/>
)}

{page === "students" && (
<StudentSearch />
)}

{page === "teams" && (
<TeamWorkspace currentUser={user} />
)}

{page === "profile" && (
<EditProfile
user={user}
onSave={handleProfileSave}
/>
)}
</main>
</div>
);
}

export default App;
