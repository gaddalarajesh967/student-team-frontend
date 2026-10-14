
import { useEffect, useRef, useState } from "react";
import { getProfile, updateProfile, deleteAccount } from "./api";

const cardStyle = {
background: "#ffffff",
border: "1px solid #e5eaf3",
borderRadius: 16,
padding: 22,
boxShadow: "0 5px 20px rgba(15,35,75,0.04)"
};

const inputStyle = {
width: "100%",
padding: "12px 14px",
border: "1px solid #d8e2ef",
borderRadius: 9,
fontSize: 14,
boxSizing: "border-box",
background: "#ffffff"
};

const buttonStyle = {
background: "#2563eb",
color: "#ffffff",
border: 0,
borderRadius: 9,
padding: "11px 17px",
fontWeight: 700,
cursor: "pointer"
};

function readLocal(key) {
try {
return localStorage.getItem(key) || "";
} catch {
return "";
}
}

function splitValues(value) {
if (Array.isArray(value)) return value;
return String(value || "")
.split(",")
.map(item => item.trim())
.filter(Boolean);
}

function getUserId(user) {
return user?._id || user?.id || user?.email || "student";
}

function compressImage(file, maxWidth, maxHeight, quality) {
return new Promise((resolve, reject) => {
const reader = new FileReader();

reader.onerror = () => reject(new Error("Unable to read image."));

reader.onload = () => {
const img = new Image();

img.onerror = () => reject(new Error("Invalid image."));

img.onload = () => {
const scale = Math.min(
1,
maxWidth / img.width,
maxHeight / img.height
);

const canvas = document.createElement("canvas");
canvas.width = Math.max(1, Math.round(img.width * scale));
canvas.height = Math.max(1, Math.round(img.height * scale));

const ctx = canvas.getContext("2d");

if (!ctx) {
reject(new Error("Unable to process image."));
return;
}

ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
resolve(canvas.toDataURL("image/jpeg", quality));
};

img.src = String(reader.result || "");
};

reader.readAsDataURL(file);
});
}

export default function EditProfile({ user, onSave }) {
const userId = getUserId(user);
const coverKey = `stf-cover-${userId}`;
const activityKey = `stf-activity-${userId}`;

const profileInputRef = useRef(null);
const coverInputRef = useRef(null);

const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || "");
const [coverPhoto, setCoverPhoto] = useState("");
const [editing, setEditing] = useState(false);
const [saving, setSaving] = useState(false);
const [uploading, setUploading] = useState(false);
const [notice, setNotice] = useState("");
const [noticeError, setNoticeError] = useState(false);

const [showDelete, setShowDelete] = useState(false);
const [deleteEmail, setDeleteEmail] = useState("");
const [deletePassword, setDeletePassword] = useState("");
const [deleteConfirm, setDeleteConfirm] = useState(false);
const [deleting, setDeleting] = useState(false);
const [deleteError, setDeleteError] = useState("");

const [form, setForm] = useState({
name: "",
email: "",
branch: "",
year: "",
skills: "",
interests: "",
experience: "Beginner",
availability: true,
currentActivity: ""
});

useEffect(() => {
let cancelled = false;

function fillProfile(data) {
setForm(previous => ({
...previous,
name: data?.name || "",
email: data?.email || "",
branch: data?.branch || "",
year: String(data?.year || ""),
skills: splitValues(data?.skills).join(", "),
interests: splitValues(data?.interests).join(", "),
experience: data?.experience || "Beginner",
availability: data?.availability !== false
}));

setProfilePhoto(data?.profilePhoto || "");
}

fillProfile(user);

setForm(previous => ({
...previous,
currentActivity: readLocal(activityKey)
}));

setCoverPhoto(readLocal(coverKey));

async function loadProfile() {
try {
const response = await getProfile();

if (!cancelled) {
fillProfile(response.user || response);
}
} catch (error) {
if (!cancelled) {
console.error("Profile loading error:", error);
}
}
}

loadProfile();

return () => {
cancelled = true;
};
}, [userId]);

function updateField(event) {
const { name, value } = event.target;

setForm(previous => ({
...previous,
[name]: value
}));
}

function showNotice(message, isError = false) {
setNotice(message);
setNoticeError(isError);
}

async function uploadPhoto(event, type) {
const file = event.target.files?.[0];

if (!file) return;

if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
showNotice("Only JPG, PNG and WebP images are supported.", true);
event.target.value = "";
return;
}

if (file.size > 5 * 1024 * 1024) {
showNotice("Please select an image smaller than 5 MB.", true);
event.target.value = "";
return;
}

try {
setUploading(true);
setNotice("");

const imageData = type === "profile"
? await compressImage(file, 400, 400, 0.8)
: await compressImage(file, 1200, 500, 0.75);

if (type === "profile") {
const response = await updateProfile({
profilePhoto: imageData
});

const updatedUser = response.user || {
...user,
profilePhoto: imageData
};

setProfilePhoto(updatedUser.profilePhoto || imageData);

window.dispatchEvent(
new Event("stf-profile-photo-updated")
);

showNotice("Profile photo saved to MongoDB successfully!");
} else {
localStorage.setItem(coverKey, imageData);
setCoverPhoto(imageData);
showNotice("Cover photo updated successfully!");
}
} catch (error) {
showNotice(
error.message || "Unable to upload photo.",
true
);
} finally {
setUploading(false);
event.target.value = "";
}
}

async function saveProfile(event) {
event.preventDefault();

if (!form.name.trim()) {
showNotice("Please enter your full name.", true);
return;
}

if (!form.branch || !form.year) {
showNotice("Please select your branch and year.", true);
return;
}

try {
setSaving(true);
setNotice("");

const updatedUser = {
...user,
name: form.name.trim(),
branch: form.branch.trim(),
year: Number(form.year),
skills: splitValues(form.skills),
interests: splitValues(form.interests),
experience: form.experience,
availability: form.availability
};

if (typeof onSave === "function") {
await onSave(updatedUser);
} else {
await updateProfile(updatedUser);
}

localStorage.setItem(
activityKey,
form.currentActivity.trim()
);

setEditing(false);
showNotice("Profile saved successfully!");
} catch (error) {
showNotice(error.message || "Unable to save profile.", true);
} finally {
setSaving(false);
}
}

function openDeleteDialog() {
setDeleteEmail("");
setDeletePassword("");
setDeleteConfirm(false);
setDeleteError("");
setShowDelete(true);
}

function closeDeleteDialog() {
if (deleting) return;

setShowDelete(false);
setDeleteEmail("");
setDeletePassword("");
setDeleteConfirm(false);
setDeleteError("");
}

async function handleDeleteAccount(event) {
event.preventDefault();
setDeleteError("");

if (
deleteEmail.trim().toLowerCase() !==
form.email.trim().toLowerCase()
) {
setDeleteError("Please enter your registered email address.");
return;
}

if (!deletePassword) {
setDeleteError("Please enter your account password.");
return;
}

if (!deleteConfirm) {
setDeleteError("Please confirm permanent account deletion.");
return;
}

try {
setDeleting(true);

await deleteAccount(deleteEmail, deletePassword);

localStorage.removeItem("token");
localStorage.removeItem("user");
localStorage.removeItem(coverKey);
localStorage.removeItem(activityKey);

window.location.replace("/");
} catch (error) {
setDeleteError(
error.message || "Unable to delete account. Please try again."
);
} finally {
setDeleting(false);
}
}

const skillList = splitValues(form.skills);
const interestList = splitValues(form.interests);

return (
<div className="student-profile-page">
<style>{`
.student-profile-page {
width: 100%;
max-width: 1250px;
margin: 0 auto;
padding: 18px 0 40px;
font-family: Inter, "Segoe UI", Arial, sans-serif;
color: #172b4d;
}

.student-profile-page * {
box-sizing: border-box;
}

.student-profile-heading {
margin-bottom: 25px;
}

.student-profile-heading h1 {
font-size: 30px;
font-weight: 800;
margin: 0 0 8px;
color: #172b4d;
}

.student-profile-heading p {
font-size: 14px;
color: #64748b;
margin: 0;
}

.student-profile-grid {
display: grid;
grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
gap: 22px;
align-items: start;
}

.student-profile-column {
display: grid;
gap: 20px;
min-width: 0;
}

.student-profile-card-title {
display: flex;
align-items: center;
gap: 10px;
font-size: 17px;
font-weight: 800;
margin: 0 0 20px;
}

.student-profile-info-row {
display: flex;
align-items: center;
justify-content: space-between;
gap: 14px;
padding: 13px 0;
border-bottom: 1px solid #edf2f7;
}

.student-profile-info-row:last-child {
border-bottom: 0;
}

.student-profile-info-label {
font-size: 13px;
color: #64748b;
}

.student-profile-info-value {
font-size: 14px;
font-weight: 700;
color: #172b4d;
text-align: right;
}

.student-profile-tag {
display: inline-block;
padding: 8px 12px;
background: #eaf2ff;
color: #155eef;
border-radius: 9px;
font-size: 12px;
font-weight: 700;
margin: 0 7px 8px 0;
}

.student-profile-edit-field {
margin-bottom: 16px;
}

.student-profile-edit-field label {
display: block;
font-size: 13px;
font-weight: 700;
margin-bottom: 7px;
}

.student-profile-avatar {
height: 120px;
width: 120px;
border-radius: 50%;
border: 5px solid #fff;
background: #dbeafe;
display: flex;
align-items: center;
justify-content: center;
color: #2563eb;
font-size: 45px;
font-weight: 800;
overflow: hidden;
margin: -60px auto 12px;
position: relative;
box-shadow: 0 4px 15px rgba(0,0,0,0.12);
}

.student-profile-avatar img {
height: 100%;
width: 100%;
object-fit: cover;
}

.student-profile-cover {
height: 220px;
position: relative;
background: linear-gradient(120deg, #0754e8, #3b82f6, #9fc4ff);
background-size: cover;
background-position: center;
}

.student-profile-cover-button {
position: absolute;
right: 16px;
top: 16px;
border: 0;
border-radius: 9px;
background: #fff;
color: #155eef;
padding: 10px 14px;
font-weight: 700;
cursor: pointer;
}

.student-profile-identity {
padding: 0 25px 28px;
text-align: center;
}

.student-profile-identity h2 {
font-size: 24px;
margin: 12px 0 7px;
}

.student-profile-identity p {
font-size: 14px;
color: #64748b;
margin: 6px 0;
overflow-wrap: anywhere;
}

.student-profile-actions {
display: flex;
justify-content: center;
gap: 10px;
flex-wrap: wrap;
margin-top: 18px;
}

.student-profile-notice {
padding: 13px 16px;
border-radius: 10px;
font-size: 13px;
margin-bottom: 18px;
}

.student-profile-empty {
font-size: 14px;
color: #64748b;
}

.student-profile-danger {
border: 1px solid #fecaca;
background: #fffafa;
border-radius: 16px;
padding: 22px;
}

.student-profile-danger h3 {
color: #991b1b;
margin: 0 0 10px;
font-size: 17px;
}

.student-profile-danger p {
font-size: 13px;
line-height: 1.7;
color: #64748b;
margin: 0 0 18px;
}

.student-profile-delete-button {
background: #dc2626;
color: white;
border: none;
border-radius: 9px;
padding: 12px 18px;
font-size: 14px;
font-weight: 700;
cursor: pointer;
}

.student-profile-delete-button:hover {
background: #b91c1c;
}

.student-profile-delete-overlay {
position: fixed;
inset: 0;
background: rgba(15,23,42,0.65);
display: flex;
align-items: center;
justify-content: center;
z-index: 9999;
padding: 20px;
}

.student-profile-delete-modal {
background: white;
border-radius: 18px;
width: 100%;
max-width: 460px;
padding: 28px;
box-shadow: 0 20px 60px rgba(0,0,0,0.2);
max-height: 90vh;
overflow-y: auto;
}

.student-profile-delete-modal h2 {
color: #991b1b;
font-size: 23px;
margin: 0 0 10px;
}

.student-profile-delete-modal p {
color: #64748b;
font-size: 13px;
line-height: 1.7;
}

.student-profile-delete-actions {
display: flex;
gap: 12px;
margin-top: 22px;
}

.student-profile-delete-actions button {
flex: 1;
padding: 12px;
border-radius: 9px;
font-weight: 700;
cursor: pointer;
}

@media (max-width: 850px) {
.student-profile-grid {
grid-template-columns: 1fr;
}

.student-profile-heading h1 {
font-size: 25px;
}

.student-profile-cover {
height: 180px;
}
}

@media (max-width: 480px) {
.student-profile-delete-actions {
flex-direction: column;
}
}
`}</style>

<div className="student-profile-heading">
<h1>My Profile</h1>
<p>Manage your academic information, skills and profile photos.</p>
</div>

{notice && (
<div
className="student-profile-notice"
role={noticeError ? "alert" : "status"}
style={{
background: noticeError ? "#fee2e2" : "#eaf2ff",
color: noticeError ? "#991b1b" : "#155eef"
}}
>
{notice}
</div>
)}

<div className="student-profile-grid">
<div className="student-profile-column">

<div style={cardStyle}>
<h3 className="student-profile-card-title">
🎓 Academic Information
</h3>

<div className="student-profile-info-row">
<span className="student-profile-info-label">Branch</span>
<span className="student-profile-info-value">
{form.branch || "Not added"}
</span>
</div>

<div className="student-profile-info-row">
<span className="student-profile-info-label">Current Year</span>
<span className="student-profile-info-value">
{form.year ? `Year ${form.year}` : "Not added"}
</span>
</div>

<div className="student-profile-info-row">
<span className="student-profile-info-label">Experience</span>
<span className="student-profile-info-value">
{form.experience}
</span>
</div>

<div className="student-profile-info-row">
<span className="student-profile-info-label">Availability</span>
<span
className="student-profile-info-value"
style={{
color: form.availability ? "#16a34a" : "#dc2626"
}}
>
{form.availability ? "● Available" : "● Not Available"}
</span>
</div>
</div>

<div style={cardStyle}>
<h3 className="student-profile-card-title">
💻 Technical Skills
</h3>

{skillList.length ? (
skillList.map((skill, index) => (
<span className="student-profile-tag" key={`${skill}-${index}`}>
{skill}
</span>
))
) : (
<p className="student-profile-empty">No skills added yet.</p>
)}
</div>

<div style={cardStyle}>
<h3 className="student-profile-card-title">
🎯 Interests
</h3>

{interestList.length ? (
interestList.map((interest, index) => (
<span className="student-profile-tag" key={`${interest}-${index}`}>
{interest}
</span>
))
) : (
<p className="student-profile-empty">No interests added yet.</p>
)}
</div>

<div style={cardStyle}>
<h3 className="student-profile-card-title">
🚀 Currently Working On
</h3>

<p style={{
color: "#475569",
fontSize: 14,
lineHeight: 1.8,
whiteSpace: "pre-wrap",
overflowWrap: "anywhere"
}}>
{form.currentActivity || "No current project added yet."}
</p>
</div>

<div className="student-profile-danger">
<h3>Delete Account</h3>
<p>
Permanently delete your student account. You must verify your
registered email and password before continuing. This action
cannot be undone.
</p>

<button
type="button"
className="student-profile-delete-button"
onClick={openDeleteDialog}
>
Delete My Account
</button>
</div>

</div>

<div className="student-profile-column">
<div style={{
...cardStyle,
padding: 0,
overflow: "hidden"
}}>

<div
className="student-profile-cover"
style={
coverPhoto
? { backgroundImage: `url("${coverPhoto}")` }
: {}
}
>
<input
ref={coverInputRef}
type="file"
accept="image/jpeg,image/png,image/webp"
style={{ display: "none" }}
onChange={event => uploadPhoto(event, "cover")}
/>

<button
type="button"
className="student-profile-cover-button"
disabled={uploading}
onClick={() => coverInputRef.current?.click()}
>
📷 Change Cover
</button>
</div>

<div className="student-profile-identity">
<div className="student-profile-avatar">
{profilePhoto ? (
<img src={profilePhoto} alt="Student profile" />
) : (
(form.name || "S").charAt(0).toUpperCase()
)}
</div>

<input
ref={profileInputRef}
type="file"
accept="image/jpeg,image/png,image/webp"
style={{ display: "none" }}
onChange={event => uploadPhoto(event, "profile")}
/>

<button
type="button"
style={{
...buttonStyle,
background: "#eaf2ff",
color: "#155eef"
}}
disabled={uploading}
onClick={() => profileInputRef.current?.click()}
>
{uploading ? "Uploading..." : "📷 Change Profile Photo"}
</button>

<h2>{form.name || "Student"}</h2>
<p>{form.email}</p>

<p>
{form.branch || "Branch"}
{" | "}
{form.year ? `Year ${form.year}` : "Year not added"}
</p>

<div className="student-profile-actions">
<button
type="button"
style={buttonStyle}
onClick={() => setEditing(previous => !previous)}
>
✏️ {editing ? "Close Editor" : "Edit Profile"}
</button>
</div>
</div>
</div>

{editing && (
<form onSubmit={saveProfile} style={cardStyle}>
<h3 className="student-profile-card-title">
✏️ Edit Student Information
</h3>

<div className="student-profile-edit-field">
<label htmlFor="student-name">Full Name</label>
<input
id="student-name"
style={inputStyle}
name="name"
value={form.name}
onChange={updateField}
required
/>
</div>

<div className="student-profile-edit-field">
<label htmlFor="student-email">Email Address</label>
<input
id="student-email"
style={{
...inputStyle,
background: "#f1f5f9",
color: "#64748b"
}}
value={form.email}
disabled
/>
</div>

<div className="student-profile-edit-field">
<label htmlFor="student-branch">Branch</label>
<select
id="student-branch"
style={inputStyle}
name="branch"
value={form.branch}
onChange={updateField}
required
>
<option value="">Select Branch</option>
{["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "OTHER"].map(item => (
<option key={item} value={item}>
{item}
</option>
))}
</select>
</div>

<div className="student-profile-edit-field">
<label htmlFor="student-year">Year</label>
<select
id="student-year"
style={inputStyle}
name="year"
value={form.year}
onChange={updateField}
required
>
<option value="">Select Year</option>
{[1, 2, 3, 4].map(item => (
<option key={item} value={String(item)}>
Year {item}
</option>
))}
</select>
</div>

<div className="student-profile-edit-field">
<label htmlFor="student-skills">Technical Skills</label>
<input
id="student-skills"
style={inputStyle}
name="skills"
value={form.skills}
onChange={updateField}
placeholder="React, Java, Python"
/>
</div>

<div className="student-profile-edit-field">
<label htmlFor="student-interests">Interests</label>
<input
id="student-interests"
style={inputStyle}
name="interests"
value={form.interests}
onChange={updateField}
placeholder="AI, Web Development, Hackathons"
/>
</div>

<div className="student-profile-edit-field">
<label htmlFor="student-experience">Experience</label>
<select
id="student-experience"
style={inputStyle}
name="experience"
value={form.experience}
onChange={updateField}
>
<option>Beginner</option>
<option>Intermediate</option>
<option>Advanced</option>
</select>
</div>

<div className="student-profile-edit-field">
<label htmlFor="student-activity">Currently Working On</label>
<textarea
id="student-activity"
style={{
...inputStyle,
minHeight: 100,
resize: "vertical"
}}
name="currentActivity"
value={form.currentActivity}
onChange={updateField}
placeholder="Describe your current project..."
/>
</div>

<div className="student-profile-edit-field">
<label style={{
display: "flex",
alignItems: "center",
gap: 9
}}>
<input
type="checkbox"
checked={form.availability}
onChange={event =>
setForm(previous => ({
...previous,
availability: event.target.checked
}))
}
/>
Available for Teams
</label>
</div>

<button
type="submit"
style={{
...buttonStyle,
width: "100%"
}}
disabled={saving}
>
{saving ? "Saving..." : "Save Profile"}
</button>
</form>
)}
</div>
</div>

{showDelete && (
<div
className="student-profile-delete-overlay"
onMouseDown={event => {
if (event.target === event.currentTarget) {
closeDeleteDialog();
}
}}
>
<div
className="student-profile-delete-modal"
role="dialog"
aria-modal="true"
aria-labelledby="delete-account-heading"
>
<h2 id="delete-account-heading">
Delete Account
</h2>

<p>
This action permanently deletes your student account.
Enter your registered email and password to confirm.
</p>

<form onSubmit={handleDeleteAccount}>
<div className="student-profile-edit-field">
<label htmlFor="delete-email">
Registered Email
</label>
<input
id="delete-email"
type="email"
style={inputStyle}
value={deleteEmail}
onChange={event => setDeleteEmail(event.target.value)}
placeholder="Enter registered email"
autoComplete="email"
required
disabled={deleting}
/>
</div>

<div className="student-profile-edit-field">
<label htmlFor="delete-password">
Current Password
</label>
<input
id="delete-password"
type="password"
style={inputStyle}
value={deletePassword}
onChange={event => setDeletePassword(event.target.value)}
placeholder="Enter your password"
autoComplete="current-password"
required
disabled={deleting}
/>
</div>

<label style={{
display: "flex",
alignItems: "flex-start",
gap: 10,
fontSize: 13,
color: "#475569",
lineHeight: 1.6,
marginTop: 15
}}>
<input
type="checkbox"
checked={deleteConfirm}
onChange={event => setDeleteConfirm(event.target.checked)}
disabled={deleting}
style={{ marginTop: 4 }}
/>
I understand that deleting my account is permanent
and cannot be undone.
</label>

{deleteError && (
<div
role="alert"
style={{
background: "#fee2e2",
color: "#991b1b",
padding: 12,
borderRadius: 9,
fontSize: 13,
marginTop: 15
}}
>
{deleteError}
</div>
)}

<div className="student-profile-delete-actions">
<button
type="button"
onClick={closeDeleteDialog}
disabled={deleting}
style={{
border: "1px solid #d8e2ef",
background: "#f8fafc",
color: "#334155"
}}
>
Cancel
</button>

<button
type="submit"
disabled={
deleting ||
!deleteEmail.trim() ||
!deletePassword ||
!deleteConfirm
}
style={{
border: 0,
background: "#dc2626",
color: "white",
opacity: deleting ? 0.7 : 1
}}
>
{deleting ? "Deleting..." : "Delete Permanently"}
</button>
</div>
</form>
</div>
</div>
)}
</div>
);
}
