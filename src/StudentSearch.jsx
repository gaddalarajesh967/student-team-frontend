
import { useEffect, useState } from "react";
import { searchStudents } from "./api";
import "./StudentSearch.css";

export default function StudentSearch() {
const [students, setStudents] = useState([]);
const [search, setSearch] = useState("");
const [branch, setBranch] = useState("");
const [year, setYear] = useState("");
const [experience, setExperience] = useState("");
const [availableOnly, setAvailableOnly] = useState(false);
const [selectedStudent, setSelectedStudent] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
let cancelled = false;

async function loadStudents() {
setLoading(true);
setError("");

try {
const filters = {};

if (branch) filters.branch = branch;
if (year) filters.year = year;
if (experience) filters.experience = experience;
if (availableOnly) filters.availability = "true";

const response = await searchStudents(filters);

const result = Array.isArray(response)
? response
: response.students ||
response.data?.students ||
response.data ||
response.users ||
[];

if (!cancelled) {
setStudents(Array.isArray(result) ? result : []);
}
} catch (err) {
if (!cancelled) {
setError(err.message || "Failed to load students");
setStudents([]);
}
} finally {
if (!cancelled) setLoading(false);
}
}

const timer = setTimeout(loadStudents, 300);

return () => {
cancelled = true;
clearTimeout(timer);
};
}, [search, branch, year, experience, availableOnly]);

const visibleStudents = students.filter(student => {
if (!search.trim()) return true;

const query = search.trim().toLowerCase();

return (
student.name?.toLowerCase().includes(query) ||
student.skills?.some(skill =>
String(skill).toLowerCase().includes(query)
)
);
});

const availableCount = visibleStudents.filter(
student => student.availability === true
).length;

const activeFilters = [
search.trim(),
branch,
year,
experience,
availableOnly ? "available" : ""
].filter(Boolean).length;

function clearFilters() {
setSearch("");
setBranch("");
setYear("");
setExperience("");
setAvailableOnly(false);
}

return (
<div className="fs-page">

{/* HERO SECTION */}
<section className="fs-hero">
<div className="fs-hero-content">
<span className="fs-eyebrow">
STUDENT NETWORK
</span>

<h1>
Find Your Perfect
<br />
<span>Teammates.</span>
</h1>

<p>
Discover talented students, explore technical skills,
and connect with the right people for your next project.
</p>

<div className="fs-hero-points">
<span>✓ Skill-Based Discovery</span>
<span>✓ Smart Filters</span>
<span>✓ Student Profiles</span>
</div>
</div>

<div className="fs-hero-visual">
<div className="fs-visual-circle">
<span>👨‍💻</span>
<span>👩‍💻</span>
<span>🤝</span>
</div>
<div className="fs-floating-label">
✦ Build Better Teams Together
</div>
</div>
</section>

{/* STATISTICS */}
<section className="fs-stats">
<div className="fs-stat-card">
<div className="fs-stat-icon blue">👥</div>
<div>
<h2>{loading ? "—" : visibleStudents.length}</h2>
<p>Students Found</p>
</div>
</div>

<div className="fs-stat-card">
<div className="fs-stat-icon green">✓</div>
<div>
<h2>{loading ? "—" : availableCount}</h2>
<p>Available Students</p>
</div>
</div>

<div className="fs-stat-card">
<div className="fs-stat-icon purple">⚙</div>
<div>
<h2>{activeFilters}</h2>
<p>Active Filters</p>
</div>
</div>
</section>

{/* FILTERS */}
<section className="fs-filter-panel">
<div className="fs-filter-heading">
<div>
<h2>Search & Filter Students</h2>
<p>Find students based on skills, branch, year and experience.</p>
</div>

<button
type="button"
className="fs-clear-btn"
onClick={clearFilters}
>
↻ Clear Filters
</button>
</div>

<div className="fs-search-box">
<span className="fs-search-icon">⌕</span>
<input
type="text"
placeholder="Search students by name or technical skill..."
value={search}
onChange={e => setSearch(e.target.value)}
/>
</div>

<div className="fs-filter-grid">
<div className="fs-filter-field">
<label>Branch</label>
<select
value={branch}
onChange={e => setBranch(e.target.value)}
>
<option value="">All Branches</option>
{["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"].map(b => (
<option key={b} value={b}>{b}</option>
))}
</select>
</div>

<div className="fs-filter-field">
<label>Academic Year</label>
<select
value={year}
onChange={e => setYear(e.target.value)}
>
<option value="">All Years</option>
{[1, 2, 3, 4].map(y => (
<option key={y} value={y}>Year {y}</option>
))}
</select>
</div>

<div className="fs-filter-field">
<label>Experience</label>
<select
value={experience}
onChange={e => setExperience(e.target.value)}
>
<option value="">All Experience Levels</option>
{["Beginner", "Intermediate", "Advanced"].map(level => (
<option key={level} value={level}>{level}</option>
))}
</select>
</div>

<div className="fs-filter-field fs-availability-field">
<label>Availability</label>
<label className="fs-checkbox-label">
<input
type="checkbox"
checked={availableOnly}
onChange={e => setAvailableOnly(e.target.checked)}
/>
<span>Available Students Only</span>
</label>
</div>
</div>
</section>

{/* STUDENT RESULTS */}
<section className="fs-results">
<div className="fs-results-header">
<div>
<h2>Discover Students</h2>
<p>
{loading
? "Searching student database..."
: `${visibleStudents.length} students found`}
</p>
</div>

<div className="fs-results-badge">
● Live Student Directory
</div>
</div>

{loading && (
<div className="fs-state-card">
<div className="fs-spinner"></div>
<h3>Finding Students...</h3>
<p>Loading profiles from the database.</p>
</div>
)}

{error && (
<div className="fs-state-card fs-error">
<h3>Unable to Load Students</h3>
<p>{error}</p>
</div>
)}

{!loading && !error && (
<>
<div className="fs-student-grid">
{visibleStudents.map(student => (
<article
className="fs-student-card"
key={student._id || student.id}
>
<div className="fs-card-banner">
<div className="fs-card-decoration">✦</div>
</div>

<div className="fs-card-content">
<div className="fs-avatar">
{student.profilePhoto ? (
<img
src={student.profilePhoto}
alt={student.name || "Student"}
/>
) : (
(student.name || "S").charAt(0).toUpperCase()
)}
</div>

<div className="fs-student-heading">
<h3>{student.name || "Student"}</h3>
<span className="fs-student-course">
{student.branch || "Branch N/A"}
{" • "}
Year {student.year || "N/A"}
</span>
</div>

<div className={
student.availability
? "fs-status available"
: "fs-status unavailable"
}>
<span className="fs-status-dot"></span>
{student.availability ? "Available" : "Not Available"}
</div>

<div className="fs-card-divider"></div>

<div className="fs-skills-section">
<h4>TECHNICAL SKILLS</h4>

<div className="fs-skill-list">
{student.skills?.length ? (
student.skills.map((skill, index) => (
<span key={`${skill}-${index}`}>
{skill}
</span>
))
) : (
<span className="fs-no-skills">
No skills added yet
</span>
)}
</div>
</div>

<div className="fs-card-details">
<div>
<span>Experience</span>
<strong>{student.experience || "Beginner"}</strong>
</div>

<div>
<span>Academic Year</span>
<strong>Year {student.year || "N/A"}</strong>
</div>
</div>

<button
type="button"
className="fs-view-btn"
onClick={() => setSelectedStudent(student)}
>
View Full Profile
<span>→</span>
</button>
</div>
</article>
))}
</div>

{visibleStudents.length === 0 && (
<div className="fs-state-card">
<div className="fs-empty-icon">⌕</div>
<h3>No Students Found</h3>
<p>
No students match your selected filters.
Try changing the search criteria.
</p>
<button
className="fs-clear-btn"
onClick={clearFilters}
>
Clear All Filters
</button>
</div>
)}
</>
)}
</section>

{/* STUDENT PROFILE MODAL */}
{selectedStudent && (
<div
className="fs-modal-backdrop"
onClick={() => setSelectedStudent(null)}
>
<div
className="fs-modal"
role="dialog"
aria-modal="true"
aria-label="Student profile"
onClick={e => e.stopPropagation()}
>
<div className="fs-modal-banner">
<button
type="button"
className="fs-modal-close"
onClick={() => setSelectedStudent(null)}
>
✕
</button>
</div>

<div className="fs-modal-content">
<div className="fs-modal-avatar">
{selectedStudent.profilePhoto ? (
<img
src={selectedStudent.profilePhoto}
alt={selectedStudent.name || "Student"}
/>
) : (
(selectedStudent.name || "S")
.charAt(0)
.toUpperCase()
)}
</div>

<h2>{selectedStudent.name || "Student"}</h2>
<p className="fs-modal-course">
{selectedStudent.branch || "N/A"}
{" • "}
Year {selectedStudent.year || "N/A"}
</p>

<div className={
selectedStudent.availability
? "fs-status available"
: "fs-status unavailable"
}>
<span className="fs-status-dot"></span>
{selectedStudent.availability
? "Available to Join Teams"
: "Currently Not Available"}
</div>

<div className="fs-modal-section">
<h3>Technical Skills</h3>
<div className="fs-skill-list">
{selectedStudent.skills?.length ? (
selectedStudent.skills.map((skill, index) => (
<span key={`${skill}-${index}`}>{skill}</span>
))
) : (
<p>No skills added.</p>
)}
</div>
</div>

<div className="fs-modal-section">
<h3>Interests</h3>
<div className="fs-skill-list">
{selectedStudent.interests?.length ? (
selectedStudent.interests.map((interest, index) => (
<span key={`${interest}-${index}`}>
{interest}
</span>
))
) : (
<p>No interests added.</p>
)}
</div>
</div>

<div className="fs-modal-section">
<h3>Student Information</h3>

<div className="fs-modal-info">
<div>
<span>Branch</span>
<strong>{selectedStudent.branch || "N/A"}</strong>
</div>

<div>
<span>Year</span>
<strong>{selectedStudent.year || "N/A"}</strong>
</div>

<div>
<span>Experience</span>
<strong>
{selectedStudent.experience || "Beginner"}
</strong>
</div>
</div>
</div>

<button
type="button"
className="fs-modal-action"
onClick={() => setSelectedStudent(null)}
>
Close Profile
</button>
</div>
</div>
</div>
)}
</div>
);
}
