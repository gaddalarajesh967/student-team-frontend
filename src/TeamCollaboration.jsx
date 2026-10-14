
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "./api";

const buttonStyle = {
background: "#2563eb",
color: "#ffffff",
border: "none",
padding: "11px 18px",
borderRadius: "9px",
cursor: "pointer",
fontWeight: "600"
};

const inputStyle = {
width: "100%",
padding: "11px",
border: "1px solid #cbd5e1",
borderRadius: "8px",
boxSizing: "border-box"
};

const cardStyle = {
background: "#ffffff",
padding: "20px",
borderRadius: "14px",
border: "1px solid #e2e8f0",
marginBottom: "16px"
};

const allowedTypes = [
"image/jpeg",
"image/png",
"image/webp",
"image/gif"
];

const maxImageSize = 2 * 1024 * 1024;

function readImage(file) {
return new Promise((resolve, reject) => {
const reader = new FileReader();

reader.onload = () => {
resolve(String(reader.result || ""));
};

reader.onerror = () => {
reject(new Error("Unable to read selected image"));
};

reader.readAsDataURL(file);
});
}

export default function TeamCollaboration({
teamId,
teamName,
initialTab = "chat"
}) {
const [tab, setTab] = useState(initialTab);
const [messages, setMessages] = useState([]);
const [images, setImages] = useState([]);
const [messageText, setMessageText] = useState("");
const [selectedFile, setSelectedFile] = useState(null);
const [preview, setPreview] = useState("");
const [caption, setCaption] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");

const fileInputRef = useRef(null);

useEffect(() => {
setTab(initialTab);
setError("");
setSuccess("");
setSelectedFile(null);
setPreview("");
setCaption("");
}, [initialTab, teamId]);

useEffect(() => {
if (!teamId || tab !== "chat") return;

let active = true;

async function fetchMessages() {
try {
const response = await apiRequest(
`/api/teams/${teamId}/messages`
);

if (active) {
setMessages(
response?.messages ||
response?.data?.messages ||
[]
);
}
} catch (err) {
if (active) {
setError(err.message || "Unable to load messages");
}
}
}

fetchMessages();

const interval = setInterval(fetchMessages, 3000);

return () => {
active = false;
clearInterval(interval);
};
}, [teamId, tab]);

async function loadImages() {
if (!teamId) return;

try {
setLoading(true);
setError("");

const response = await apiRequest(
`/api/teams/${teamId}/images`
);

setImages(
response?.images ||
response?.data?.images ||
[]
);
} catch (err) {
setError(err.message || "Unable to load images");
} finally {
setLoading(false);
}
}

useEffect(() => {
if (!teamId || tab !== "templates") return;

let active = true;

async function fetchImages() {
try {
const response = await apiRequest(
`/api/teams/${teamId}/images`
);

if (active) {
setImages(
response?.images ||
response?.data?.images ||
[]
);
}
} catch (err) {
if (active) {
setError(err.message || "Unable to load images");
}
}
}

fetchImages();

return () => {
active = false;
};
}, [teamId, tab]);

async function sendMessage(e) {
e.preventDefault();

if (!messageText.trim() || loading) return;

try {
setLoading(true);
setError("");
setSuccess("");

await apiRequest(
`/api/teams/${teamId}/messages`,
{
method: "POST",
body: JSON.stringify({
text: messageText.trim()
})
}
);

setMessageText("");

const response = await apiRequest(
`/api/teams/${teamId}/messages`
);

setMessages(
response?.messages ||
response?.data?.messages ||
[]
);
} catch (err) {
setError(err.message || "Unable to send message");
} finally {
setLoading(false);
}
}

function openFileExplorer() {
setError("");
setSuccess("");

if (fileInputRef.current) {
fileInputRef.current.value = "";
fileInputRef.current.click();
}
}

async function selectImage(e) {
const file = e.target.files?.[0];

if (!file) return;

if (!allowedTypes.includes(file.type)) {
setError("Only JPG, PNG, WebP and GIF images are allowed");
setSelectedFile(null);
setPreview("");
return;
}

if (file.size > maxImageSize) {
setError("Image size must be 2 MB or smaller");
setSelectedFile(null);
setPreview("");
return;
}

try {
setError("");
setSuccess("");

const imageData = await readImage(file);

setSelectedFile(file);
setPreview(imageData);
} catch (err) {
setError(err.message || "Unable to preview image");
setSelectedFile(null);
setPreview("");
}
}

function removeSelectedImage() {
setSelectedFile(null);
setPreview("");
setCaption("");

if (fileInputRef.current) {
fileInputRef.current.value = "";
}
}

async function uploadImage(e) {
e.preventDefault();

if (!selectedFile || loading || !teamId) return;

try {
setLoading(true);
setError("");
setSuccess("");

const imageData = await readImage(selectedFile);

await apiRequest(
`/api/teams/${teamId}/images`,
{
method: "POST",
body: JSON.stringify({
fileName: selectedFile.name,
mimeType: selectedFile.type,
imageData,
caption: caption.trim()
})
}
);

removeSelectedImage();

const response = await apiRequest(
`/api/teams/${teamId}/images`
);

setImages(
response?.images ||
response?.data?.images ||
[]
);

setSuccess("Image shared successfully!");
} catch (err) {
setError(err.message || "Image upload failed");
} finally {
setLoading(false);
}
}

// DELETE SHARED IMAGE

async function deleteImage(imageId) {
if (!window.confirm("Are you sure you want to delete this image?")) {
return;
}

try {
setLoading(true);
setError("");
setSuccess("");

await apiRequest(
`/api/teams/${teamId}/images/${imageId}`,
{
method: "DELETE"
}
);

setImages(previous =>
previous.filter(image => image._id !== imageId)
);

setSuccess("Image deleted successfully!");

} catch (err) {
setError(err.message || "Unable to delete image");
} finally {
setLoading(false);
}
}

return (
<div style={{ padding: "12px 0" }}>
<h2>{teamName || "Team"} — Collaboration</h2>

<p style={{ color: "#64748b" }}>
Private workspace for team members
</p>

<div
style={{
display: "flex",
gap: "10px",
flexWrap: "wrap",
marginBottom: "20px"
}}
>
<button
type="button"
style={{
...buttonStyle,
opacity: tab === "chat" ? 1 : 0.65
}}
onClick={() => {
setTab("chat");
setError("");
setSuccess("");
}}
>
💬 Team Chat
</button>

<button
type="button"
style={{
...buttonStyle,
opacity: tab === "templates" ? 1 : 0.65
}}
onClick={() => {
setTab("templates");
setError("");
setSuccess("");
}}
>
🖼️ Project Images
</button>
</div>

{error && (
<div
role="alert"
style={{
background: "#fee2e2",
color: "#991b1b",
padding: "12px",
borderRadius: "8px",
marginBottom: "15px"
}}
>
{error}
</div>
)}

{success && (
<div
role="status"
style={{
background: "#dcfce7",
color: "#166534",
padding: "12px",
borderRadius: "8px",
marginBottom: "15px"
}}
>
{success}
</div>
)}

{tab === "chat" && (
<div style={cardStyle}>
<h3>Private Team Chat</h3>

<div
style={{
height: "340px",
overflowY: "auto",
background: "#f8fafc",
padding: "14px",
borderRadius: "10px",
marginBottom: "14px"
}}
>
{messages.length === 0 && (
<p>No messages yet. Start chatting!</p>
)}

{messages.map(message => (
<div
key={message._id}
style={{
background: "#ffffff",
padding: "12px",
borderRadius: "9px",
marginBottom: "10px",
border: "1px solid #e2e8f0"
}}
>
<strong style={{ color: "#2563eb" }}>
{message.sender?.name || "Team Member"}
</strong>

<p
style={{
whiteSpace: "pre-wrap",
overflowWrap: "anywhere"
}}
>
{message.text}
</p>

<small style={{ color: "#64748b" }}>
{message.createdAt
? new Date(message.createdAt).toLocaleString()
: ""}
</small>
</div>
))}
</div>

<form
onSubmit={sendMessage}
style={{
display: "flex",
gap: "10px"
}}
>
<input
style={{
...inputStyle,
flex: 1,
minWidth: 0
}}
value={messageText}
onChange={e => setMessageText(e.target.value)}
maxLength={2000}
placeholder="Type your message..."
required
/>

<button
type="submit"
style={buttonStyle}
disabled={loading || !messageText.trim()}
>
{loading ? "Sending..." : "Send"}
</button>
</form>
</div>
)}

{tab === "templates" && (
<>
<div style={cardStyle}>
<h3>Share Project Images</h3>

<p style={{ color: "#64748b" }}>
Click Upload Image to open File Explorer.
Select an image, preview it, then share it with your team.
</p>

<input
ref={fileInputRef}
type="file"
accept="image/jpeg,image/png,image/webp,image/gif"
onChange={selectImage}
style={{ display: "none" }}
/>

{!selectedFile && (
<button
type="button"
style={buttonStyle}
onClick={openFileExplorer}
disabled={loading}
>
Upload Image
</button>
)}

{selectedFile && (
<form onSubmit={uploadImage}>
<div
style={{
border: "1px solid #e2e8f0",
borderRadius: "12px",
padding: "14px",
marginBottom: "14px"
}}
>
<p>
<strong>Selected File:</strong> {selectedFile.name}
</p>

{preview && (
<img
src={preview}
alt="Selected image preview"
style={{
maxWidth: "100%",
maxHeight: "300px",
objectFit: "contain",
borderRadius: "10px",
marginBottom: "12px"
}}
/>
)}

<input
style={inputStyle}
placeholder="Image caption (optional)"
value={caption}
maxLength={200}
onChange={e => setCaption(e.target.value)}
/>

<p style={{
fontSize: "12px",
color: "#64748b"
}}>
Maximum image size: 2 MB
</p>
</div>

<div
style={{
display: "flex",
gap: "10px",
flexWrap: "wrap"
}}
>
<button
type="submit"
style={buttonStyle}
disabled={loading}
>
{loading ? "Uploading..." : "Share Selected Image"}
</button>

<button
type="button"
style={{
...buttonStyle,
background: "#64748b"
}}
onClick={openFileExplorer}
disabled={loading}
>
Change Image
</button>

<button
type="button"
style={{
...buttonStyle,
background: "#dc2626"
}}
onClick={removeSelectedImage}
disabled={loading}
>
Cancel
</button>
</div>
</form>
)}
</div>

<div style={cardStyle}>
<div
style={{
display: "flex",
justifyContent: "space-between",
alignItems: "center",
gap: "10px",
flexWrap: "wrap"
}}
>
<h3>Shared Images Gallery</h3>

<button
type="button"
style={buttonStyle}
onClick={loadImages}
disabled={loading}
>
Refresh
</button>
</div>

{images.length === 0 && (
<p style={{ color: "#64748b" }}>
No images shared yet.
</p>
)}

<div
style={{
display: "grid",
gridTemplateColumns:
"repeat(auto-fit, minmax(220px, 1fr))",
gap: "16px"
}}
>
{images.map(image => (
<div
key={image._id}
style={{
border: "1px solid #e2e8f0",
borderRadius: "12px",
padding: "12px",
overflow: "hidden"
}}
>
<img
src={image.imageData}
alt={image.caption || image.fileName}
style={{
width: "100%",
height: "190px",
objectFit: "contain",
background: "#f8fafc",
borderRadius: "8px"
}}
/>

<p style={{ overflowWrap: "anywhere" }}>
<strong>{image.fileName}</strong>
</p>

{image.caption && <p>{image.caption}</p>}

<small style={{ color: "#64748b" }}>
Shared by: {image.uploadedBy?.name || "Team Member"}
</small>

<p
style={{
fontSize: "12px",
color: "#64748b"
}}
>
{image.createdAt
? new Date(image.createdAt).toLocaleString()
: ""}
</p>

<button
type="button"
onClick={() => deleteImage(image._id)}
disabled={loading}
style={{
background: "#dc2626",
color: "#ffffff",
border: "none",
padding: "10px 16px",
borderRadius: "8px",
cursor: "pointer",
marginTop: "12px",
fontWeight: "600"
}}
>
Delete Image
</button>
</div>
))}
</div>
</div>
</>
)}
</div>
);
}
