
import { useEffect, useMemo, useState } from "react";
import {
Search,
Plus,
Users,
ArrowRight,
RefreshCw,
FolderKanban,
Code2,
CheckCircle2,
Clock3,
SlidersHorizontal
} from "lucide-react";

import { getTeams } from "./api";
import "./ExploreTeams.css";

function extractTeams(response) {
if (Array.isArray(response)) return response;

if (Array.isArray(response?.teams)) {
return response.teams;
}

if (Array.isArray(response?.data?.teams)) {
return response.data.teams;
}

if (Array.isArray(response?.data)) {
return response.data;
}

return [];
}

function getId(value) {
if (!value) return "";

if (typeof value === "string") return value;

return String(value._id || value.id || "");
}

function getLeaderName(team) {
if (typeof team.leader === "string") {
return "Team Leader";
}

return (
team.leader?.name ||
team.leader?.fullName ||
"Team Leader"
);
}

function getSkills(team) {
if (Array.isArray(team.requiredSkills)) {
return team.requiredSkills;
}

return [];
}

function getStatus(team) {
return String(team.status || "Open");
}

function TeamCard({ team, onViewTeam }) {
const skills = getSkills(team);
const memberCount = Array.isArray(team.members)
? team.members.length
: 0;

const maxMembers = Number(team.maxMembers) || 0;
const status = getStatus(team);

const isFull =
maxMembers > 0 && memberCount >= maxMembers;

return (
<article className="explore-team-card">
<div className="explore-team-card-cover">
<div className="explore-team-card-cover-pattern">
<Code2 size={55} strokeWidth={1.4} />
</div>

<span
className={
`explore-team-status ${
isFull ? "full" : "open"
}`
}
>
{isFull ? (
<Clock3 size={14} />
) : (
<CheckCircle2 size={14} />
)}
{isFull ? "Team Full" : status}
</span>
</div>

<div className="explore-team-card-body">
<div className="explore-team-card-icon">
<FolderKanban size={25} />
</div>

<h3>{team.teamName || "Untitled Team"}</h3>

<p className="explore-team-project-title">
{team.projectTitle || "Project title not provided"}
</p>

<p className="explore-team-description">
{team.projectDescription ||
"No project description has been added yet."}
</p>

<div className="explore-team-skills">
{skills.length > 0 ? (
skills.slice(0, 5).map((skill, index) => (
<span key={`${skill}-${index}`}>
{skill}
</span>
))
) : (
<span>No required skills listed</span>
)}
</div>

<div className="explore-team-card-footer">
<div className="explore-team-leader">
<div className="explore-team-leader-avatar">
{getLeaderName(team).charAt(0).toUpperCase()}
</div>

<div>
<small>Leader</small>
<strong>{getLeaderName(team)}</strong>
</div>
</div>

<div className="explore-team-member-count">
<Users size={18} />

<span>
{memberCount}
{maxMembers > 0 ? `/${maxMembers}` : ""}
</span>
</div>

<button
type="button"
className="explore-team-view-button"
onClick={() => onViewTeam(team)}
>
View Team
<ArrowRight size={16} />
</button>
</div>
</div>
</article>
);
}

export default function ExploreTeams({
onNavigate,
onViewTeam
}) {
const [teams, setTeams] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

const [search, setSearch] = useState("");
const [selectedSkill, setSelectedSkill] = useState("all");
const [selectedStatus, setSelectedStatus] = useState("all");

async function loadTeams() {
try {
setLoading(true);
setError("");

const response = await getTeams();
setTeams(extractTeams(response));
} catch (err) {
setError(
err.message || "Unable to fetch teams from MongoDB."
);
} finally {
setLoading(false);
}
}

useEffect(() => {
loadTeams();
}, []);

const availableSkills = useMemo(() => {
const values = teams.flatMap(team => getSkills(team));

return [...new Set(values.map(String))]
.filter(Boolean)
.sort((a, b) => a.localeCompare(b));
}, [teams]);

const filteredTeams = useMemo(() => {
const keyword = search.trim().toLowerCase();

return teams.filter(team => {
const skills = getSkills(team);

const searchableText = [
team.teamName,
team.projectTitle,
team.projectDescription,
getLeaderName(team),
...skills
]
.filter(Boolean)
.join(" ")
.toLowerCase();

const matchesSearch =
!keyword || searchableText.includes(keyword);

const matchesSkill =
selectedSkill === "all" ||
skills.some(
skill =>
String(skill).toLowerCase() ===
selectedSkill.toLowerCase()
);

const memberCount = Array.isArray(team.members)
? team.members.length
: 0;

const maxMembers = Number(team.maxMembers) || 0;

const full =
maxMembers > 0 && memberCount >= maxMembers;

const matchesStatus =
selectedStatus === "all" ||
(selectedStatus === "open" && !full) ||
(selectedStatus === "full" && full);

return matchesSearch && matchesSkill && matchesStatus;
});
}, [teams, search, selectedSkill, selectedStatus]);

function clearFilters() {
setSearch("");
setSelectedSkill("all");
setSelectedStatus("all");
}

function handleViewTeam(team) {
if (typeof onViewTeam === "function") {
onViewTeam(team);
return;
}

if (typeof onNavigate === "function") {
onNavigate("teams");
}
}

return (
<div className="explore-teams-page">
<section className="explore-teams-hero">
<div className="explore-teams-hero-content">
<p className="explore-teams-eyebrow">
STUDENT TEAM FORMATION
</p>

<h1>
Welcome to Your
<span> Team Workspace</span>
</h1>

<p>
Discover teammates, manage projects and
build something amazing together.
</p>

<div className="explore-teams-hero-features">
<div>
<Users size={21} />
<strong>Connect</strong>
<small>Find talented students</small>
</div>

<div>
<Code2 size={21} />
<strong>Collaborate</strong>
<small>Share innovative ideas</small>
</div>

<div>
<FolderKanban size={21} />
<strong>Build</strong>
<small>Work on real projects</small>
</div>
</div>
</div>

<div className="explore-teams-hero-art">
<div className="explore-teams-hero-art-circle">
<Users size={88} strokeWidth={1.2} />
</div>
<div className="explore-teams-hero-art-card">
<Code2 size={26} />
<span>Team Collaboration</span>
</div>
</div>
</section>

<div className="explore-teams-section-header">
<div>
<h2>
<Users size={26} />
Explore Teams
</h2>

<p>
Discover projects created by registered students.
</p>
</div>

<button
type="button"
className="explore-teams-create-button"
onClick={() => onNavigate?.("teams")}
>
<Plus size={19} />
Create New Team
</button>
</div>

<section className="explore-teams-filters">
<div className="explore-teams-search">
<Search size={20} />

<input
type="text"
value={search}
onChange={event => setSearch(event.target.value)}
placeholder="Search team name, project or skills..."
/>
</div>

<div className="explore-teams-filter-row">
<div className="explore-teams-select">
<SlidersHorizontal size={17} />

<select
value={selectedSkill}
onChange={event =>
setSelectedSkill(event.target.value)
}
>
<option value="all">All Skills</option>

{availableSkills.map(skill => (
<option key={skill} value={skill}>
{skill}
</option>
))}
</select>
</div>

<div className="explore-teams-select">
<CheckCircle2 size={17} />

<select
value={selectedStatus}
onChange={event =>
setSelectedStatus(event.target.value)
}
>
<option value="all">All Teams</option>
<option value="open">Open Teams</option>
<option value="full">Full Teams</option>
</select>
</div>

<button
type="button"
className="explore-teams-clear-button"
onClick={clearFilters}
>
Clear Filters
</button>

<button
type="button"
className="explore-teams-refresh-button"
onClick={loadTeams}
disabled={loading}
>
<RefreshCw size={17} />
Refresh
</button>
</div>
</section>

{error && (
<div className="explore-teams-error">
{error}
</div>
)}

{loading ? (
<div className="explore-teams-empty">
<RefreshCw size={30} />
<h3>Loading teams...</h3>
<p>Fetching team information from the backend.</p>
</div>
) : filteredTeams.length === 0 ? (
<div className="explore-teams-empty">
<Users size={38} />

<h3>
{teams.length === 0
? "No teams created yet"
: "No matching teams found"}
</h3>

<p>
{teams.length === 0
? "Teams created by students will appear here."
: "Try changing your search or filters."}
</p>
</div>
) : (
<div className="explore-teams-grid">
{filteredTeams.map((team, index) => (
<TeamCard
key={getId(team) || index}
team={team}
onViewTeam={handleViewTeam}
/>
))}
</div>
)}
</div>
);
}
