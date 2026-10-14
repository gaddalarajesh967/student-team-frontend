
import { useEffect, useMemo, useState } from "react";
import {
  Users, Plus, Search, RefreshCw, ArrowRight,
  FolderKanban, Code2, CheckCircle2, UserPlus,
  MessageCircle, Mail, Sparkles, ShieldCheck,
  UserRound, LogOut, Trash2, Send, Clock3,
  ChevronLeft, ClipboardList
} from "lucide-react";
import {
  getTeams,
  createTeam,
  getTeamDetails,
  getMissingSkills,
  getRecommendations,
  getMyInvitations,
  sendInvitation,
  acceptInvitation,
  rejectInvitation,
  apiRequest
} from "./api";
import TeamCollaboration from "./TeamCollaboration";
import "./ExploreTeams.css";

const getId = value => {
  if (value && typeof value === "object") {
    return String(value._id || value.id || "");
  }
  return value == null ? "" : String(value);
};

const getArray = (response, keys = []) => {
  if (Array.isArray(response)) return response;
  const data = response?.data || response;
  const values = [
    ...keys.map(key => response?.[key]),
    ...keys.map(key => data?.[key]),
    response?.results,
    data?.results,
    data?.data
  ];
  return values.find(Array.isArray) || [];
};

const getObject = (response, key) =>
  response?.[key] ||
  response?.data?.[key] ||
  response?.data ||
  response;

const studentName = student =>
  student?.name || student?.full_name || "Student";

const emptyTeamForm = {
  teamName: "",
  projectTitle: "",
  projectDescription: "",
  requiredSkills: "",
  maxMembers: 4
};

function Avatar({ person, size = 42 }) {
  const name = studentName(person);
  const photo = person?.profilePhoto || "";

  return (
    <div style={{
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: "50%",
      background: "#e0eaff",
      color: "#245bea",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
      overflow: "hidden"
    }}>
      {photo ? (
        <img
          src={photo}
          alt={name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
        />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

function Skills({ items = [] }) {
  return (
    <div className="explore-team-skills">
      {items.length ? items.map((skill, index) => (
        <span key={`${skill}-${index}`}>{skill}</span>
      )) : (
        <span>No skills listed</span>
      )}
    </div>
  );
}

function Panel({ title, children, action }) {
  return (
    <section style={{
      background: "#fff",
      border: "1px solid #e4eaf3",
      borderRadius: 18,
      padding: 24,
      marginBottom: 20
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 20
      }}>
        <h2 style={{ margin: 0, fontSize: 21 }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function StudentCard({ student, children }) {
  return (
    <div className="explore-team-card">
      <div className="explore-team-card-body">
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 15
        }}>
          <Avatar person={student} />
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0 }}>
              {studentName(student)}
            </h3>
            <p style={{
              margin: "5px 0 0",
              color: "#64748b",
              fontSize: 13
            }}>
              {student?.branch || "Branch not added"}
              {" · "}
              Year {student?.year || "N/A"}
            </p>
          </div>
        </div>

        {student?.email && (
          <p style={{
            fontSize: 13,
            color: "#64748b",
            overflowWrap: "anywhere"
          }}>
            {student.email}
          </p>
        )}

        <Skills items={student?.skills || []} />
        {children}
      </div>
    </div>
  );
}

export default function TeamWorkspace({ currentUser }) {
  const [section, setSection] = useState("teams");
  const [teams, setTeams] = useState([]);
  const [team, setTeam] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [missingSkills, setMissingSkills] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [participationRole, setParticipationRole] = useState("leader");
  const [memberOption, setMemberOption] = useState("available");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyTeamForm);

  const [memberForm, setMemberForm] = useState({
    name: currentUser?.name || "",
    branch: currentUser?.branch || "",
    year: currentUser?.year || "",
    skills: Array.isArray(currentUser?.skills)
      ? currentUser.skills.join(", ") : "",
    interests: Array.isArray(currentUser?.interests)
      ? currentUser.interests.join(", ") : "",
    experience: currentUser?.experience || "Beginner",
    availability: true
  });

  const userId = getId(currentUser);
  const leaderId = getId(team?.leader);
  const isLeader = Boolean(userId && leaderId === userId);
  const isMember = Boolean(
    userId &&
    team?.members?.some(member => getId(member) === userId)
  );

  const memberCount = team?.members?.length || 0;
  const availableSlots = Math.max(
    0,
    Number(team?.maxMembers || 0) - memberCount
  );
  const teamIsFull = Boolean(team && availableSlots === 0);

  const availableSkills = useMemo(() => {
    return [...new Set(
      teams.flatMap(t => t.requiredSkills || [])
    )].sort();
  }, [teams]);

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();

    return teams.filter(t => {
      const skills = t.requiredSkills || [];
      const count = t.members?.length || 0;
      const max = Number(t.maxMembers || 0);
      const full = max > 0 && count >= max;

      const text = [
        t.teamName,
        t.projectTitle,
        t.projectDescription,
        studentName(t.leader),
        ...skills
      ].join(" ").toLowerCase();

      return (
        (!query || text.includes(query)) &&
        (selectedSkill === "all" ||
          skills.some(s => String(s) === selectedSkill)) &&
        (selectedStatus === "all" ||
          (selectedStatus === "open" && !full) ||
          (selectedStatus === "full" && full))
      );
    });
  }, [teams, search, selectedSkill, selectedStatus]);

  const filteredStudents = students.filter(student => {
    const id = getId(student);
    if (!id || id === userId) return false;

    if (team?.members?.some(m => getId(m) === id)) {
      return false;
    }

    const text = [
      studentName(student),
      student.email,
      student.branch,
      student.year,
      ...(student.skills || [])
    ].join(" ").toLowerCase();

    return text.includes(studentSearch.toLowerCase());
  });

  async function loadTeams() {
    try {
      setError("");
      const response = await getTeams();
      setTeams(getArray(response, ["teams"]));
    } catch (err) {
      setError(err.message || "Unable to load teams");
    }
  }

  useEffect(() => {
    loadTeams();
  }, []);

  async function loadTeamDetails(id) {
    if (!id) return;
    setSelectedTeam(id);
    setSection("details");
    setLoading(true);
    setError("");

    try {
      const response = await getTeamDetails(id);
      setTeam(getObject(response, "team"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshTeamDetails(id) {
    if (!id) return;
    try {
      const response = await getTeamDetails(id);
      setTeam(getObject(response, "team"));
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadMissingSkills() {
    if (!selectedTeam) {
      alert("Select a team first");
      return;
    }

    setSection("missing");
    setLoading(true);
    setError("");

    try {
      const response = await getMissingSkills(selectedTeam);
      setMissingSkills(getArray(response, ["missingSkills"]));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecommendations() {
    if (!selectedTeam) {
      alert("Select a team first");
      return;
    }

    setSection("recommend");
    setLoading(true);
    setError("");

    try {
      const response = await getRecommendations(selectedTeam);
      setRecommendations(
        getArray(response, [
          "recommendedStudents",
          "recommendations"
        ])
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents(query = "") {
    if (!selectedTeam || !team) {
      alert("Select a team first");
      return;
    }

    if (!isLeader) {
      alert("Only the team leader can invite students");
      return;
    }

    setSection("select");
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest(
        `/api/members/students?search=${encodeURIComponent(query.trim())}`
      );
      setStudents(
        getArray(response, ["students", "users", "results"])
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadInvitations() {
    setSection("invitations");
    setLoading(true);
    setError("");

    try {
      const response = await getMyInvitations();
      setInvitations(getArray(response, ["invitations"]));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadJoinRequests() {
    setSection("joinRequests");
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest(
        "/api/members/join-requests/received"
      );
      setJoinRequests(getArray(response, ["requests"]));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMyJoinRequests() {
    setSection("myRequests");
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest(
        "/api/members/join-requests/my"
      );
      setMyRequests(getArray(response, ["requests"]));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openTab(id) {
    setError("");
    setSection(id);

    if (id === "teams") loadTeams();
    if (id === "invitations") loadInvitations();
    if (id === "missing") loadMissingSkills();
    if (id === "recommend") loadRecommendations();
    if (id === "select") loadStudents(studentSearch);
    if (id === "joinRequests") loadJoinRequests();
    if (id === "myRequests") loadMyJoinRequests();
  }

  async function handleCreateTeam(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await createTeam({
        teamName: form.teamName.trim(),
        projectTitle: form.projectTitle.trim(),
        projectDescription: form.projectDescription.trim(),
        requiredSkills: form.requiredSkills
          .split(",").map(s => s.trim()).filter(Boolean),
        maxMembers: Number(form.maxMembers),
        creationRole: participationRole
      });

      const created = getObject(response, "team");
      setForm(emptyTeamForm);
      await loadTeams();

      if (getId(created)) {
        await loadTeamDetails(getId(created));
      } else {
        setSection("teams");
      }

      alert("Team created successfully!");
    } catch (err) {
      setError(err.message);
      alert("Create Team Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveMemberProfile(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await apiRequest("/api/members/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: memberForm.name.trim(),
          branch: memberForm.branch.trim(),
          year: Number(memberForm.year),
          skills: memberForm.skills
            .split(",").map(s => s.trim()).filter(Boolean),
          interests: memberForm.interests
            .split(",").map(s => s.trim()).filter(Boolean),
          experience: memberForm.experience,
          availability: memberForm.availability
        })
      });

      alert("Member information saved successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(studentId) {
    if (!selectedTeam || !isLeader || !studentId) return;

    if (teamIsFull) {
      alert("Team is full");
      return;
    }

    setLoading(true);

    try {
      await sendInvitation({
        teamId: selectedTeam,
        receiverId: studentId
      });

      setSelectedStudents(previous =>
        previous.filter(id => id !== studentId)
      );

      alert("Invitation sent successfully!");
    } catch (err) {
      alert("Invitation Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleStudent(id) {
    setSelectedStudents(previous => {
      if (previous.includes(id)) {
        return previous.filter(item => item !== id);
      }

      if (previous.length >= availableSlots) {
        alert("Not enough team slots");
        return previous;
      }

      return [...previous, id];
    });
  }

  async function handleInviteSelected() {
    if (!isLeader || !selectedStudents.length) return;
    setLoading(true);

    const successful = [];
    const failed = [];

    for (const id of selectedStudents) {
      try {
        await sendInvitation({
          teamId: selectedTeam,
          receiverId: id
        });
        successful.push(id);
      } catch (err) {
        failed.push(err.message);
      }
    }

    setSelectedStudents(previous =>
      previous.filter(id => !successful.includes(id))
    );
    setLoading(false);

    alert(
      `${successful.length} invitation(s) sent.` +
      (failed.length ? "\nErrors:\n" + failed.join("\n") : "")
    );
  }

  async function handleRespond(id, accept) {
    setLoading(true);

    try {
      if (accept) {
        await acceptInvitation(id);
      } else {
        await rejectInvitation(id);
      }

      await loadInvitations();
      await loadTeams();

      if (selectedTeam) {
        await refreshTeamDetails(selectedTeam);
      }

      alert(accept ? "Invitation accepted!" : "Invitation rejected!");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestToJoin(id) {
    setLoading(true);

    try {
      const response = await apiRequest(
        "/api/members/join-requests",
        {
          method: "POST",
          body: JSON.stringify({ teamId: id })
        }
      );

      alert(response?.message || "Join request sent!");
      await loadMyJoinRequests();
    } catch (err) {
      alert("Join Request Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function respondToJoinRequest(id, action) {
    setLoading(true);

    try {
      const response = await apiRequest(
        `/api/members/join-requests/${id}/respond`,
        {
          method: "PUT",
          body: JSON.stringify({ action })
        }
      );

      alert(response?.message || "Request updated");
      await loadJoinRequests();
      await loadTeams();

      if (selectedTeam) {
        await refreshTeamDetails(selectedTeam);
      }
    } catch (err) {
      alert("Request Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLeaveTeam() {
    if (!selectedTeam || !isMember || isLeader) return;
    if (!window.confirm("Leave this team?")) return;

    setLoading(true);

    try {
      await apiRequest(`/api/teams/${selectedTeam}/leave`, {
        method: "PUT"
      });

      await loadTeams();
      await refreshTeamDetails(selectedTeam);
      alert("You left the team");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveMember(id) {
    if (!isLeader || !window.confirm("Remove this member?")) {
      return;
    }

    setLoading(true);

    try {
      await apiRequest(
        `/api/teams/${selectedTeam}/members/${id}`,
        { method: "DELETE" }
      );

      await refreshTeamDetails(selectedTeam);
      await loadTeams();
      alert("Member removed successfully!");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimLeadership() {
    if (!selectedTeam || team?.leader) return;
    if (!window.confirm("Become the leader of this team?")) return;

    setLoading(true);

    try {
      await apiRequest(
        `/api/teams/${selectedTeam}/claim-leadership`,
        { method: "PUT" }
      );

      await refreshTeamDetails(selectedTeam);
      await loadTeams();
      alert("You are now the team leader!");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  const primary = {
    background: "#2563eb",
    color: "#fff",
    border: 0,
    padding: "11px 17px",
    borderRadius: 10,
    fontWeight: 700,
    cursor: "pointer"
  };

  const secondary = {
    background: "#eff5ff",
    color: "#245bea",
    border: "1px solid #dbe7fa",
    padding: "10px 15px",
    borderRadius: 10,
    fontWeight: 700,
    cursor: "pointer"
  };

  const actions = {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18
  };

  const grid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 18
  };

  const formStyle = {
    display: "grid",
    gap: 12,
    maxWidth: 650
  };

  const fieldStyle = {
    width: "100%",
    padding: 12,
    border: "1px solid #dce5f3",
    borderRadius: 10,
    boxSizing: "border-box"
  };

  const TeamForm = (
    <form onSubmit={handleCreateTeam} style={formStyle}>
      <label>Team Name</label>
      <input
        style={fieldStyle}
        required
        value={form.teamName}
        onChange={e => setForm(p => ({
          ...p, teamName: e.target.value
        }))}
      />

      <label>Project Title</label>
      <input
        style={fieldStyle}
        required
        value={form.projectTitle}
        onChange={e => setForm(p => ({
          ...p, projectTitle: e.target.value
        }))}
      />

      <label>Project Description</label>
      <textarea
        style={fieldStyle}
        rows={4}
        value={form.projectDescription}
        onChange={e => setForm(p => ({
          ...p, projectDescription: e.target.value
        }))}
      />

      <label>Required Skills (comma separated)</label>
      <input
        style={fieldStyle}
        value={form.requiredSkills}
        onChange={e => setForm(p => ({
          ...p, requiredSkills: e.target.value
        }))}
      />

      <label>Maximum Members</label>
      <input
        style={fieldStyle}
        type="number"
        min="2"
        max="20"
        required
        value={form.maxMembers}
        onChange={e => setForm(p => ({
          ...p, maxMembers: e.target.value
        }))}
      />

      <button style={primary} type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Team"}
      </button>
    </form>
  );

  return (
    <div className="explore-teams-page">
      <section className="explore-teams-hero">
        <div className="explore-teams-hero-content">
          <p className="explore-teams-eyebrow">
            STUDENT TEAM FORMATION
          </p>

          <h1>
            My <span>Team Workspace</span>
          </h1>

          <p>
            Discover real student projects, manage your teams,
            collaborate with members and build together.
          </p>

          <div className="explore-teams-hero-features">
            <div>
              <Users size={22} />
              <strong>Connect</strong>
              <small>Find students</small>
            </div>
            <div>
              <Code2 size={22} />
              <strong>Collaborate</strong>
              <small>Work together</small>
            </div>
            <div>
              <FolderKanban size={22} />
              <strong>Build</strong>
              <small>Manage projects</small>
            </div>
          </div>
        </div>

        <div className="explore-teams-hero-art">
          <div className="explore-teams-hero-art-circle">
            <Users size={88} strokeWidth={1.2} />
          </div>
          <div className="explore-teams-hero-art-card">
            <Code2 size={25} />
            Team Collaboration
          </div>
        </div>
      </section>

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 25
      }}>
        {[
          ["teams", "All Teams", Users],
          ["create", "Create / Join", Plus],
          ["details", "Team Details", FolderKanban],
          ["chat", "Team Chat", MessageCircle],
          ["templates", "Project Images", Code2],
          ["select", "Find Students", Search],
          ["recommend", "Recommendations", Sparkles],
          ["missing", "Missing Skills", ShieldCheck],
          ["invitations", "Invitations", Mail],
          ["joinRequests", "Join Requests", UserPlus],
          ["myRequests", "My Requests", ClipboardList]
        ].map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => openTab(id)}
            style={{
              ...secondary,
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: section === id ? "#2563eb" : "#fff",
              color: section === id ? "#fff" : "#475569"
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <p style={{ color: "#64748b" }}>Loading data...</p>
      )}

      {error && (
        <div className="explore-teams-error">
          {error}
        </div>
      )}

      {section === "teams" && (
        <>
          <div className="explore-teams-section-header">
            <div>
              <h2><Users size={26} /> Explore Teams</h2>
              <p>Teams created by registered students</p>
            </div>

            <button
              className="explore-teams-create-button"
              onClick={() => openTab("create")}
            >
              <Plus size={19} />
              Create New Team
            </button>
          </div>

          <section className="explore-teams-filters">
            <div className="explore-teams-search">
              <Search size={20} />
              <input
                placeholder="Search teams, projects or skills..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="explore-teams-filter-row">
              <div className="explore-teams-select">
                <select
                  value={selectedSkill}
                  onChange={e => setSelectedSkill(e.target.value)}
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
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                >
                  <option value="all">All Teams</option>
                  <option value="open">Open Teams</option>
                  <option value="full">Full Teams</option>
                </select>
              </div>

              <button
                className="explore-teams-clear-button"
                onClick={() => {
                  setSearch("");
                  setSelectedSkill("all");
                  setSelectedStatus("all");
                }}
              >
                Clear Filters
              </button>

              <button
                className="explore-teams-refresh-button"
                onClick={loadTeams}
              >
                <RefreshCw size={17} />
                Refresh
              </button>
            </div>
          </section>

          {filteredTeams.length ? (
            <div className="explore-teams-grid">
              {filteredTeams.map((t, index) => {
                const id = getId(t);
                const count = t.members?.length || 0;
                const max = Number(t.maxMembers || 0);
                const full = max > 0 && count >= max;
                const ownTeam = getId(t.leader) === userId;
                const joined = (t.members || []).some(
                  member => getId(member) === userId
                );

                return (
                  <article
                    className="explore-team-card"
                    key={id || index}
                  >
                    <div className="explore-team-card-cover">
                      <div className="explore-team-card-cover-pattern">
                        <Code2 size={55} strokeWidth={1.4} />
                      </div>

                      <span className={
                        `explore-team-status ${full ? "full" : "open"}`
                      }>
                        {full ? <Clock3 size={14} /> :
                          <CheckCircle2 size={14} />}
                        {full ? "Team Full" : (t.status || "Open")}
                      </span>
                    </div>

                    <div className="explore-team-card-body">
                      <div className="explore-team-card-icon">
                        <FolderKanban size={25} />
                      </div>

                      <h3>{t.teamName}</h3>

                      <p className="explore-team-project-title">
                        {t.projectTitle}
                      </p>

                      <p className="explore-team-description">
                        {t.projectDescription ||
                          "No project description added."}
                      </p>

                      <Skills items={t.requiredSkills || []} />

                      <div className="explore-team-card-footer">
                        <div className="explore-team-leader">
                          <Avatar
                            person={t.leader || { name: "?" }}
                            size={36}
                          />
                          <div>
                            <small>Leader</small>
                            <strong>
                              {t.leader
                                ? studentName(t.leader)
                                : "Not assigned"}
                            </strong>
                          </div>
                        </div>

                        <div className="explore-team-member-count">
                          <Users size={18} />
                          {count}/{max}
                        </div>

                        <button
                          className="explore-team-view-button"
                          onClick={() => loadTeamDetails(id)}
                        >
                          View Team
                          <ArrowRight size={16} />
                        </button>

                        {!ownTeam && !joined &&
                          t.leader && !full && (
                          <button
                            style={{
                              ...secondary,
                              width: "100%"
                            }}
                            disabled={loading}
                            onClick={() => handleRequestToJoin(id)}
                          >
                            Request to Join
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="explore-teams-empty">
              <Users size={38} />
              <h3>
                {teams.length
                  ? "No matching teams found"
                  : "No teams created yet"}
              </h3>
              <p>
                {teams.length
                  ? "Try different filters."
                  : "Create your first team to get started."}
              </p>
            </div>
          )}
        </>
      )}

      {section === "create" && (
        <Panel title="Create or Join a Team">
          <div style={formStyle}>
            <label>Choose Your Role</label>
            <select
              style={fieldStyle}
              value={participationRole}
              onChange={e => setParticipationRole(e.target.value)}
            >
              <option value="leader">Team Leader</option>
              <option value="member">Team Member</option>
            </select>
          </div>

          {participationRole === "leader" ? (
            <>
              <h3>Create New Team</h3>
              {TeamForm}
            </>
          ) : (
            <>
              <div style={{ ...formStyle, marginTop: 18 }}>
                <label>Choose Your Option</label>
                <select
                  style={fieldStyle}
                  value={memberOption}
                  onChange={e => setMemberOption(e.target.value)}
                >
                  <option value="available">
                    Available to Join a Team
                  </option>
                  <option value="create">
                    Create as a Team Member
                  </option>
                </select>
              </div>

              {memberOption === "create" ? (
                <>
                  <h3>Create Team as Member</h3>
                  {TeamForm}
                </>
              ) : (
                <>
                  <h3>Member Information</h3>

                  <form
                    onSubmit={handleSaveMemberProfile}
                    style={formStyle}
                  >
                    {[
                      ["name", "Full Name"],
                      ["branch", "Branch"],
                      ["year", "Year"],
                      ["skills", "Technical Skills"],
                      ["interests", "Interests"]
                    ].map(([key, label]) => (
                      <div key={key}>
                        <label>{label}</label>
                        <input
                          style={fieldStyle}
                          required={["name", "branch", "year"].includes(key)}
                          type={key === "year" ? "number" : "text"}
                          min={key === "year" ? 1 : undefined}
                          max={key === "year" ? 4 : undefined}
                          value={memberForm[key]}
                          onChange={e => setMemberForm(p => ({
                            ...p, [key]: e.target.value
                          }))}
                        />
                      </div>
                    ))}

                    <label>Experience Level</label>
                    <select
                      style={fieldStyle}
                      value={memberForm.experience}
                      onChange={e => setMemberForm(p => ({
                        ...p, experience: e.target.value
                      }))}
                    >
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                    </select>

                    <label style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10
                    }}>
                      <input
                        type="checkbox"
                        checked={memberForm.availability}
                        onChange={e => setMemberForm(p => ({
                          ...p, availability: e.target.checked
                        }))}
                      />
                      Available to Join a Team
                    </label>

                    <button style={primary} disabled={loading}>
                      Save Member Information
                    </button>
                  </form>

                  <div style={actions}>
                    <button
                      style={secondary}
                      onClick={() => openTab("teams")}
                    >
                      Explore Existing Teams
                    </button>

                    <button
                      style={secondary}
                      onClick={loadInvitations}
                    >
                      My Invitations
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </Panel>
      )}

      {section === "details" && (
        <>
          {!team ? (
            <Panel title="Team Details">
              <p>Select a team from All Teams.</p>
              <button
                style={primary}
                onClick={() => openTab("teams")}
              >
                View Teams
              </button>
            </Panel>
          ) : (
            <>
              <Panel
                title={team.teamName}
                action={
                  <button
                    style={secondary}
                    onClick={() => openTab("teams")}
                  >
                    <ChevronLeft size={16} />
                    Back
                  </button>
                }
              >
                <h3>{team.projectTitle}</h3>
                <p>{team.projectDescription}</p>

                <p>
                  <strong>Leader:</strong>{" "}
                  {team.leader
                    ? studentName(team.leader)
                    : "Not assigned"}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  {team.status || "Open"}
                </p>

                <p style={{ color: "#64748b" }}>
                  {isLeader
                    ? "You are the Team Leader"
                    : isMember
                    ? "You are a Team Member"
                    : "Viewing Team Details"}
                </p>

                <Skills items={team.requiredSkills || []} />
              </Panel>

              <Panel
                title={`Team Members (${memberCount}/${team.maxMembers})`}
              >
                <div style={grid}>
                  {(team.members || []).map(member => (
                    <StudentCard
                      key={getId(member)}
                      student={member}
                    >
                      <p>
                        {getId(member) === leaderId
                          ? "Team Leader"
                          : "Team Member"}
                      </p>

                      {isLeader &&
                        getId(member) !== userId && (
                        <button
                          style={secondary}
                          disabled={loading}
                          onClick={() =>
                            handleRemoveMember(getId(member))
                          }
                        >
                          <Trash2 size={15} />
                          Remove Member
                        </button>
                      )}
                    </StudentCard>
                  ))}
                </div>
              </Panel>

              <Panel title="Team Actions">
                <div style={actions}>
                  {(isMember || isLeader) && (
                    <>
                      <button
                        style={primary}
                        onClick={() => openTab("chat")}
                      >
                        Team Chat
                      </button>

                      <button
                        style={secondary}
                        onClick={() => openTab("templates")}
                      >
                        Project Images
                      </button>
                    </>
                  )}

                  {isLeader && (
                    <>
                      <button
                        style={primary}
                        disabled={teamIsFull}
                        onClick={() => loadStudents()}
                      >
                        Find Students
                      </button>

                      <button
                        style={secondary}
                        onClick={loadJoinRequests}
                      >
                        Join Requests
                      </button>
                    </>
                  )}

                  {!team.leader && !teamIsFull && (
                    <button
                      style={primary}
                      disabled={loading}
                      onClick={handleClaimLeadership}
                    >
                      Become Team Leader
                    </button>
                  )}

                  {!isLeader && !isMember &&
                    team.leader && !teamIsFull && (
                    <button
                      style={primary}
                      disabled={loading}
                      onClick={() =>
                        handleRequestToJoin(selectedTeam)
                      }
                    >
                      Request to Join
                    </button>
                  )}

                  <button
                    style={secondary}
                    onClick={loadRecommendations}
                  >
                    Skill Recommendations
                  </button>

                  <button
                    style={secondary}
                    onClick={loadMissingSkills}
                  >
                    Missing Skills
                  </button>

                  {isMember && !isLeader && (
                    <button
                      style={secondary}
                      disabled={loading}
                      onClick={handleLeaveTeam}
                    >
                      Leave Team
                    </button>
                  )}
                </div>
              </Panel>
            </>
          )}
        </>
      )}

      {(section === "chat" || section === "templates") && (
        <Panel title={
          section === "chat" ? "Team Chat" : "Project Images"
        }>
          {team && selectedTeam && (isMember || isLeader) ? (
            <TeamCollaboration
              key={`${selectedTeam}-${section}`}
              teamId={selectedTeam}
              teamName={team.teamName}
              initialTab={
                section === "chat" ? "chat" : "templates"
              }
            />
          ) : (
            <>
              <p>
                Select a team you belong to before opening
                the private workspace.
              </p>
              <button
                style={primary}
                onClick={() => openTab("teams")}
              >
                View Teams
              </button>
            </>
          )}
        </Panel>
      )}

      {section === "select" && (
        <Panel title="Find Students">
          {!team ? (
            <p>Select a team first.</p>
          ) : !isLeader ? (
            <p>Only the team leader can invite students.</p>
          ) : (
            <>
              <h3>{team.teamName}</h3>
              <p>Available Slots: {availableSlots}</p>

              <div style={{
                display: "flex",
                gap: 10,
                marginBottom: 20
              }}>
                <input
                  style={fieldStyle}
                  placeholder="Search by name, branch, year or skill"
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                />

                <button
                  style={primary}
                  disabled={loading}
                  onClick={() => loadStudents(studentSearch)}
                >
                  Search
                </button>
              </div>

              <div style={grid}>
                {filteredStudents.map(student => {
                  const id = getId(student);

                  return (
                    <StudentCard key={id} student={student}>
                      <label style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(id)}
                          disabled={loading || teamIsFull}
                          onChange={() => toggleStudent(id)}
                        />
                        Select Student
                      </label>

                      <button
                        style={primary}
                        disabled={loading || teamIsFull}
                        onClick={() => handleInvite(id)}
                      >
                        Invite Student
                      </button>
                    </StudentCard>
                  );
                })}
              </div>

              {!loading && !filteredStudents.length && (
                <p>No students found.</p>
              )}

              {selectedStudents.length > 0 && (
                <div style={actions}>
                  <button
                    style={primary}
                    disabled={loading || teamIsFull}
                    onClick={handleInviteSelected}
                  >
                    Send Invitations ({selectedStudents.length})
                  </button>

                  <button
                    style={secondary}
                    onClick={() => setSelectedStudents([])}
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </>
          )}
        </Panel>
      )}

      {section === "missing" && (
        <Panel title="Skill Gap Analysis">
          <p>Skills your team still needs.</p>

          <Skills
            items={missingSkills.map(skill =>
              typeof skill === "string"
                ? skill
                : skill.name || skill.skill || "Unknown Skill"
            )}
          />

          {!missingSkills.length && (
            <p>No missing skills found.</p>
          )}

          <button
            style={primary}
            onClick={loadRecommendations}
          >
            Find Matching Students
          </button>
        </Panel>
      )}

      {section === "recommend" && (
        <Panel title="Skill Recommendations">
          <div style={grid}>
            {recommendations.map((item, index) => {
              const student = item.student || item.user || item;
              const id = getId(student);

              return (
                <StudentCard
                  key={id || index}
                  student={student}
                >
                  <p>
                    Match Score:{" "}
                    {item.compatibilityScore ??
                      item.score ??
                      item.matchScore ??
                      "N/A"}
                  </p>

                  {item.reason && <p>{item.reason}</p>}

                  {isLeader && (
                    <button
                      style={primary}
                      disabled={loading || !id || teamIsFull}
                      onClick={() => handleInvite(id)}
                    >
                      Invite to Team
                    </button>
                  )}
                </StudentCard>
              );
            })}
          </div>

          {!loading && !recommendations.length && (
            <p>No matching students found.</p>
          )}

          {isLeader && (
            <button
              style={secondary}
              onClick={() => loadStudents()}
            >
              Select Students Manually
            </button>
          )}
        </Panel>
      )}

      {section === "invitations" && (
        <Panel
          title="My Invitations"
          action={
            <button
              style={secondary}
              onClick={loadInvitations}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          }
        >
          <div style={grid}>
            {invitations.map(invitation => (
              <div
                className="explore-team-card"
                key={getId(invitation)}
              >
                <div className="explore-team-card-body">
                  <h3>
                    {invitation.teamId?.teamName ||
                      invitation.team?.teamName ||
                      "Team Invitation"}
                  </h3>

                  <p>
                    From: {studentName(invitation.sender)}
                  </p>

                  <p>Status: {invitation.status}</p>

                  {String(invitation.status).toLowerCase() ===
                    "pending" && (
                    <div style={actions}>
                      <button
                        style={primary}
                        disabled={loading}
                        onClick={() =>
                          handleRespond(getId(invitation), true)
                        }
                      >
                        Accept
                      </button>

                      <button
                        style={secondary}
                        disabled={loading}
                        onClick={() =>
                          handleRespond(getId(invitation), false)
                        }
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!loading && !invitations.length && (
            <p>No invitations found.</p>
          )}
        </Panel>
      )}

      {section === "joinRequests" && (
        <Panel
          title="Student Join Requests"
          action={
            <button
              style={secondary}
              onClick={loadJoinRequests}
            >
              Refresh
            </button>
          }
        >
          <div style={grid}>
            {joinRequests.map(request => (
              <StudentCard
                key={getId(request)}
                student={request.student}
              >
                <p>
                  Team: {request.team?.teamName || "Team"}
                </p>

                <p>Status: {request.status}</p>

                {String(request.status).toLowerCase() ===
                  "pending" && (
                  <div style={actions}>
                    <button
                      style={primary}
                      disabled={loading}
                      onClick={() =>
                        respondToJoinRequest(
                          getId(request), "accept"
                        )
                      }
                    >
                      Accept
                    </button>

                    <button
                      style={secondary}
                      disabled={loading}
                      onClick={() =>
                        respondToJoinRequest(
                          getId(request), "reject"
                        )
                      }
                    >
                      Reject
                    </button>
                  </div>
                )}
              </StudentCard>
            ))}
          </div>

          {!loading && !joinRequests.length && (
            <p>No join requests found.</p>
          )}
        </Panel>
      )}

      {section === "myRequests" && (
        <Panel
          title="My Join Requests"
          action={
            <button
              style={secondary}
              onClick={loadMyJoinRequests}
            >
              Refresh
            </button>
          }
        >
          <div style={grid}>
            {myRequests.map(request => (
              <div
                className="explore-team-card"
                key={getId(request)}
              >
                <div className="explore-team-card-body">
                  <h3>
                    {request.team?.teamName || "Team"}
                  </h3>

                  <p>{request.team?.projectTitle}</p>
                  <p>Status: {request.status}</p>
                </div>
              </div>
            ))}
          </div>

          {!loading && !myRequests.length && (
            <p>You have not sent any join requests yet.</p>
          )}
        </Panel>
      )}
    </div>
  );
}
