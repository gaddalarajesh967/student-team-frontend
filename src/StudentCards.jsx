
const students = [
{ id: 1, name: "Priya Sharma", branch: "CSE", year: 3, skills: ["Python", "Machine Learning"], experience: "Advanced", available: true },
{ id: 2, name: "Rahul Kumar", branch: "CSE", year: 3, skills: ["React", "UI/UX"], experience: "Intermediate", available: true },
{ id: 3, name: "Ananya Rao", branch: "IT", year: 2, skills: ["Node.js", "MongoDB"], experience: "Intermediate", available: true },
{ id: 4, name: "Karthik Reddy", branch: "ECE", year: 3, skills: ["Java", "Flutter"], experience: "Beginner", available: false },
{ id: 5, name: "Sneha Patel", branch: "CSE", year: 4, skills: ["React", "Node.js", "MongoDB"], experience: "Advanced", available: true },
{ id: 6, name: "Vikram Singh", branch: "EEE", year: 2, skills: ["Python", "Java"], experience: "Beginner", available: true }
];

export default function StudentCards() {
return (
<div>
<h1>Find Students</h1>
<p className="muted">Discover talented students and explore their technical skills.</p>

<div className="student-grid">
{students.map(student => (
<div className="student-card" key={student.id}>
<div className="student-avatar">{student.name.charAt(0)}</div>

<h3>{student.name}</h3>
<p>{student.branch} • Year {student.year}</p>

<div className="skill-list">
{student.skills.map(skill => (
<span key={skill}>{skill}</span>
))}
</div>

<p>Experience: {student.experience}</p>

<p className={student.available ? "available" : "unavailable"}>
{student.available ? "● Available" : "● Not Available"}
</p>

<button
className="outline-btn"
onClick={() => alert(`${student.name}\nSkills: ${student.skills.join(", ")}\nExperience: ${student.experience}`)}
>
View Profile
</button>
</div>
))}
</div>
</div>
);
}
