
import { useEffect, useState } from "react";
import {
Search,
Users,
Lightbulb,
UserRound,
ArrowRight,
Mail,
ClipboardCheck,
Plus,
Brain,
GraduationCap,
UserPlus,
RefreshCw
} from "lucide-react";

import {
getProfile,
getTeams,
getMyInvitations,
searchStudents
} from "./api";

import "./Dashboard.css";

function extractArray(data, keys = []) {
if (Array.isArray(data)) return data;

if (!data || typeof data !== "object") return [];

for (const key of keys) {
if (Array.isArray(data[key])) return data[key];
}

if (data.data && typeof data.data === "object") {
return extractArray(data.data, keys);
}

return [];
}

function extractProfile(data) {
if (!data || typeof data !== "object") return {};

return (
data.user ||
data.profile ||
data.data?.user ||
data.data?.profile ||
data.data ||
data
);
}

function toArray(value) {
if (Array.isArray(value)) return value;

if (typeof value === "string") {
return value
.split(",")
.map(item => item.trim())
.filter(Boolean);
}

return [];
}

function getId(value) {
if (!value) return "";

if (typeof value === "string") return value;

return String(value._id || value.id || "");
}

function getName(person) {
return (
person?.name ||
person?.fullName ||
person?.full_name ||
"Student"
);
}

function readPhoto(person) {
if (person?.profilePhoto) {
return person.profilePhoto;
}

if (person?.avatar) {
return person.avatar;
}

const id = getId(person) || person?.email || "student";

try {
return localStorage.getItem(`stf-profile-${id}`) || "";
} catch {
return "";
}
}

function Avatar({ person, color = "#dbeafe" }) {
const name = getName(person);
const photo = readPhoto(person);
const [imageError, setImageError] = useState(false);

useEffect(() => {
setImageError(false);
}, [photo]);

return (
<div
className="stf-avatar"
style={{
background: color,
overflow: "hidden",
borderRadius: "50%"
}}
>
{photo && !imageError ? (
<img
src={photo}
alt={name}
onError={() => setImageError(true)}
style={{
width: "100%",
height: "100%",
objectFit: "cover",
borderRadius: "50%"
}}
/>
) : (
<span>{name.charAt(0).toUpperCase()}</span>
)}
</div>
);
}

function SectionHeading({ title, action, onClick }) {
return (
<div className="stf-section-heading">
<h2>{title}</h2>

{action && (
<button type="button" onClick={onClick}>
{action}
<ArrowRight size={15} />
</button>
)}
</div>
);
}

function Tag({ children, index = 0 }) {
return (
<span className={`stf-tag stf-tag-${index % 5}`}>
{children}
</span>
);
}

export default function Dashboard({ user, onNavigate }) {
const [profile, setProfile] = useState(user || {});
const [students, setStudents] = useState([]);
const [teams, setTeams] = useState([]);
const [invitations, setInvitations] = useState([]);
const [loading, setLoading] = useState(true);
const [errors, setErrors] = useState([]);
const [totalStudents, setTotalStudents] = useState(null);

const navigate = page => {
if (typeof onNavigate === "function") {
onNavigate(page);
}
};

async function loadDashboard() {
setLoading(true);
setErrors([]);

const results = await Promise.allSettled([
getProfile(),
searchStudents(),
getTeams(),
getMyInvitations()
]);

const messages = [];

if (results[0].status === "fulfilled") {
setProfile(extractProfile(results[0].value));
} else {
messages.push(
"Profile: " +
(results[0].reason?.message || "Unable to load profile")
);
}

if (results[1].status === "fulfilled") {
const data = results[1].value;

const list = extractArray(data, [
"students",
"users",
"results"
]);

setStudents(list);

const count =
data?.totalStudents ??
data?.total ??
data?.totalCount ??
data?.pagination?.total ??
data?.data?.total ??
data?.count ??
null;

setTotalStudents(
typeof count === "number" ? count : list.length
);
} else {
messages.push(
"Students: " +
(results[1].reason?.message || "Unable to load students")
);
}

if (results[2].status === "fulfilled") {
setTeams(
extractArray(results[2].value, [
"teams",
"results"
])
);
} else {
messages.push(
"Teams: " +
(results[2].reason?.message || "Unable to load teams")
);
}

if (results[3].status === "fulfilled") {
setInvitations(
extractArray(results[3].value, [
"invitations",
"results"
])
);
} else {
messages.push(
"Invitations: " +
(results[3].reason?.message || "Unable to load invitations")
);
}

setErrors(messages);
setLoading(false);
}

useEffect(() => {
loadDashboard();

const handlePhotoUpdate = () => {
loadDashboard();
};

window.addEventListener(
"stf-profile-photo-updated",
handlePhotoUpdate
);

return () => {
window.removeEventListener(
"stf-profile-photo-updated",
handlePhotoUpdate
);
};
}, []);

const currentUserId = getId(profile) || getId(user);

const myTeams = teams.filter(team => {
const leaderId = getId(team.leader);

const memberIds = Array.isArray(team.members)
? team.members.map(getId)
: [];

return (
leaderId === currentUserId ||
memberIds.includes(currentUserId)
);
});

const myInvitations = invitations.filter(invitation => {
const receiverId = getId(
invitation.receiver || invitation.student
);

return !receiverId || receiverId === currentUserId;
});

const pendingInvitations = myInvitations.filter(
invitation =>
String(invitation.status || "Pending").toLowerCase() ===
"pending"
);

const joinedProjects = myTeams.filter(team => {
const leaderId = getId(team.leader);

return (
leaderId !== currentUserId &&
Array.isArray(team.members) &&
team.members.some(
member => getId(member) === currentUserId
)
);
});

const recommendedStudents = students
.filter(student => getId(student) !== currentUserId)
.slice(0, 4);

const skills = toArray(profile.skills);
const interests = toArray(profile.interests);

const firstName = getName(profile).split(" ")[0];

const topActions = [
{
title: "Find Students",
description: "Search by skills, branch or interests",
icon: Search,
theme: "blue",
page: "students"
},
{
title: "Create / View Teams",
description: "Manage your teams and projects",
icon: Users,
theme: "green",
page: "teams"
},
{
title: "Explore Projects",
description: "Find ongoing projects and join",
icon: Lightbulb,
theme: "yellow",
page: "teams"
},
{
title: "My Profile",
description: "Update your skills and information",
icon: UserRound,
theme: "purple",
page: "profile"
}
];

const statistics = [
{
title: "Total Students",
value: totalStudents ?? "—",
icon: Users,
theme: "blue"
},
{
title: "My Teams",
value: myTeams.length,
icon: Users,
theme: "green"
},
{
title: "Invitations",
value: pendingInvitations.length,
icon: Mail,
theme: "purple"
},
{
title: "Projects Joined",
value: joinedProjects.length,
icon: ClipboardCheck,
theme: "orange"
}
];

return (
<div className="stf-dashboard">
<div className="stf-welcome">
<div
style={{
display: "flex",
justifyContent: "space-between",
alignItems: "center",
gap: 12
}}
>
<div>
<h1>Welcome back, {firstName}! 👋</h1>
<p>
Let's find teammates and build amazing projects together.
</p>
</div>

<button
type="button"
onClick={loadDashboard}
disabled={loading}
title="Refresh dashboard"
style={{
display: "flex",
alignItems: "center",
gap: 7,
padding: "10px 14px",
background: "#e8f1ff",
border: 0,
borderRadius: 10,
color: "#075cf0",
cursor: loading ? "not-allowed" : "pointer"
}}
>
<RefreshCw size={17} />
Refresh
</button>
</div>
</div>

{errors.length > 0 && (
<div
style={{
background: "#fff1f2",
color: "#9f1239",
padding: 14,
borderRadius: 12,
marginBottom: 15
}}
>
<strong>
Some dashboard data could not be loaded.
</strong>

{errors.map((message, index) => (
<p key={index} style={{ margin: "6px 0" }}>
{message}
</p>
))}
</div>
)}

<div className="stf-top-actions">
{topActions.map(action => {
const Icon = action.icon;

return (
<button
key={action.title}
type="button"
className={`stf-action-card stf-${action.theme}`}
onClick={() => navigate(action.page)}
>
<div className="stf-action-icon">
<Icon size={32} />
</div>

<div className="stf-action-text">
<h3>{action.title}</h3>
<p>{action.description}</p>
</div>

<div className="stf-action-arrow">
<ArrowRight size={22} />
</div>
</button>
);
})}
</div>

<div className="stf-stats-grid">
{statistics.map(stat => {
const Icon = stat.icon;

return (
<div className="stf-stat-card" key={stat.title}>
<div className={`stf-stat-icon stf-${stat.theme}`}>
<Icon size={27} />
</div>

<div>
<p>{stat.title}</p>
<h2>{loading ? "..." : stat.value}</h2>
</div>
</div>
);
})}
</div>

<div className="stf-middle-grid">
<section className="stf-panel">
<SectionHeading
title="Recommended Students"
action="View All"
onClick={() => navigate("students")}
/>

<div className="stf-student-list">
{loading ? (
<p>Loading students...</p>
) : recommendedStudents.length === 0 ? (
<p className="stf-empty">
No students available.
</p>
) : (
recommendedStudents.map((student, index) => (
<div
className="stf-student-row"
key={getId(student) || index}
>
<Avatar
person={student}
color={
["#fce7f3", "#dcfce7", "#ffe4e6", "#dbeafe"][
index % 4
]
}
/>

<div className="stf-student-info">
<strong>{getName(student)}</strong>
<p>
{student.branch || "Branch not added"}
{" | "}
Year {student.year || "N/A"}
</p>
</div>

<div className="stf-student-skills">
{toArray(student.skills)
.slice(0, 3)
.map((skill, skillIndex) => (
<Tag
key={skillIndex}
index={skillIndex}
>
{skill}
</Tag>
))}
</div>

<button
type="button"
className="stf-connect-btn"
onClick={() => navigate("students")}
>
<UserPlus size={16} />
Connect
</button>
</div>
))
)}
</div>
</section>

<section className="stf-panel">
<SectionHeading
title="My Teams"
action="View All"
onClick={() => navigate("teams")}
/>

<div className="stf-team-list">
{loading ? (
<p>Loading teams...</p>
) : myTeams.length === 0 ? (
<p className="stf-empty">
You haven't joined or created any teams yet.
</p>
) : (
myTeams.slice(0, 4).map((team, index) => {
const Icon = index % 2 === 0
? Brain
: GraduationCap;

const status = String(
team.status || "Active"
);

return (
<div
className="stf-team-row"
key={getId(team) || index}
>
<div
className="stf-team-icon"
style={{
background: "#dbeafe",
color: "#2563eb"
}}
>
<Icon size={27} />
</div>

<div className="stf-team-info">
<strong>
{team.teamName ||
team.name ||
"Unnamed Team"}
</strong>

<p>
{team.projectTitle ||
team.projectDescription ||
"No project description"}
</p>
</div>

<div className="stf-team-members">
<small>
{Array.isArray(team.members)
? team.members.length
: 0}
</small>
</div>

<span
className={`stf-status stf-status-${status.toLowerCase()}`}
>
{status}
</span>

<button
type="button"
className="stf-view-btn"
onClick={() => navigate("teams")}
>
View
</button>
</div>
);
})
)}
</div>
</section>
</div>

<div className="stf-bottom-grid">
<section className="stf-panel">
<SectionHeading title="Recent Activities" />

<div className="stf-activity-list">
<p className="stf-empty">
Recent activity history is not available from
the current backend APIs.
</p>
</div>
</section>

<div className="stf-profile-panels">
<section className="stf-panel">
<SectionHeading
title="My Skills"
action="Edit"
onClick={() => navigate("profile")}
/>

<div className="stf-tags">
{skills.length ? (
skills.map((skill, index) => (
<Tag key={index} index={index}>
{skill}
</Tag>
))
) : (
<p className="stf-empty">
Add your skills in My Profile.
</p>
)}
</div>
</section>

<section className="stf-panel">
<SectionHeading
title="My Interests"
action="Edit"
onClick={() => navigate("profile")}
/>

<div className="stf-tags">
{interests.length ? (
interests.map((interest, index) => (
<Tag key={index} index={index}>
{interest}
</Tag>
))
) : (
<p className="stf-empty">
Add your interests in My Profile.
</p>
)}
</div>
</section>
</div>

<section className="stf-panel">
<SectionHeading title="Quick Actions" />

<div className="stf-quick-grid">
<button
className="stf-quick stf-quick-green"
onClick={() => navigate("teams")}
type="button"
>
<Plus size={30} />
<strong>Create New Team</strong>
</button>

<button
className="stf-quick stf-quick-blue"
onClick={() => navigate("students")}
type="button"
>
<Search size={30} />
<strong>Find Students</strong>
</button>

<button
className="stf-quick stf-quick-orange"
onClick={() => navigate("teams")}
type="button"
>
<Lightbulb size={30} />
<strong>Explore Projects</strong>
</button>

<button
className="stf-quick stf-quick-purple"
onClick={() => navigate("teams")}
type="button"
>
<Users size={30} />
<strong>View Invitations</strong>
</button>
</div>
</section>
</div>
</div>
);
}
