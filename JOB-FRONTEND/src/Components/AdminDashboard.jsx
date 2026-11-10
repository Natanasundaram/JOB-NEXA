import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    FiGrid,
    FiUsers,
    FiBriefcase,
    FiFileText,
    FiUserCheck,
    FiUser,
    FiSearch,
    FiRefreshCw,
    FiTrash2,
    FiEye,
    FiPower,
    FiMenu,
    FiX,
    FiCheckCircle,
    FiAlertCircle,
    FiActivity,
    FiShield
} from "react-icons/fi";
import "./AdminDashboard.css";

const API_URL = "http://localhost:4000";

const AdminDashboard = () => {
    const [activeSection, setActiveSection] = useState("Dashboard");
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [summary, setSummary] = useState({
        totalUsers: 0,
        totalCandidates: 0,
        totalRecruiters: 0,
        totalJobs: 0,
        totalApplications: 0
    });

    const [users, setUsers] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [recruiters, setRecruiters] = useState([]);
    const [candidates, setCandidates] = useState([]);

    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const token = localStorage.getItem("token");

    const api = axios.create({
        baseURL: API_URL,
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const showSuccess = (message) => {
        setSuccess(message);
        setError("");

        setTimeout(() => {
            setSuccess("");
        }, 3500);
    };

    const getErrorMessage = (err) => {
        return err.response?.data?.message || "Something went wrong. Please try again.";
    };

    const handleRequestError = (err) => {
        setError(getErrorMessage(err));
        setSuccess("");
    };

    const resetMessages = () => {
        setError("");
        setSuccess("");
    };

    const loadSummary = async () => {
        try {
            const response = await api.get("/admin/dashboard/summary");
            setSummary(response.data);
        } catch (err) {
            handleRequestError(err);
        }
    };

    const loadUsers = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/admin/users");
            setUsers(response.data.users || []);
        } catch (err) {
            if (err.response?.status === 404) {
                setUsers([]);
            } else {
                handleRequestError(err);
            }
        } finally {
            setLoading(false);
        }
    };

    const loadJobs = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/admin/jobs");
            setJobs(response.data.jobs || []);
        } catch (err) {
            if (err.response?.status === 404) {
                setJobs([]);
            } else {
                handleRequestError(err);
            }
        } finally {
            setLoading(false);
        }
    };

    const loadApplications = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/admin/applications");
            setApplications(response.data.applications || []);
        } catch (err) {
            if (err.response?.status === 404) {
                setApplications([]);
            } else {
                handleRequestError(err);
            }
        } finally {
            setLoading(false);
        }
    };

    const loadRecruiters = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/admin/recruiters");
            setRecruiters(response.data.recruiters || []);
        } catch (err) {
            if (err.response?.status === 404) {
                setRecruiters([]);
            } else {
                handleRequestError(err);
            }
        } finally {
            setLoading(false);
        }
    };

    const loadCandidates = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/admin/candidates");
            setCandidates(response.data.candidates || []);
        } catch (err) {
            if (err.response?.status === 404) {
                setCandidates([]);
            } else {
                handleRequestError(err);
            }
        } finally {
            setLoading(false);
        }
    };

    const loadSectionData = async (section) => {
        resetMessages();
        setSearchTerm("");
        setSelectedUser(null);

        if (section === "Dashboard") {
            await loadSummary();
        } else if (section === "Users") {
            await loadUsers();
        } else if (section === "Jobs") {
            await loadJobs();
        } else if (section === "Applications") {
            await loadApplications();
        } else if (section === "Recruiters") {
            await loadRecruiters();
        } else if (section === "Candidates") {
            await loadCandidates();
        }
    };

    useEffect(() => {
        loadSummary();
    }, []);

    const handleSectionChange = (section) => {
        setActiveSection(section);
        setSidebarOpen(false);
        loadSectionData(section);
    };

    const refreshCurrentSection = () => {
        loadSectionData(activeSection);
    };

    const viewUserDetails = async (userId) => {
        setLoading(true);
        resetMessages();

        try {
            const response = await api.get(`/admin/users/${userId}`);
            setSelectedUser(response.data.user);
        } catch (err) {
            handleRequestError(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleUserStatus = async (user) => {
        const newStatus = !Boolean(user.IsActive);

        const actionText = newStatus ? "activate" : "deactivate";

        const confirmed = window.confirm(
            `Are you sure you want to ${actionText} ${user.Name}?`
        );

        if (!confirmed) return;

        resetMessages();

        try {
            await api.put(`/admin/users/${user.UserID}/status`, {
                isActive: newStatus
            });

            setUsers((previousUsers) =>
                previousUsers.map((item) =>
                    item.UserID === user.UserID
                        ? { ...item, IsActive: newStatus }
                        : item
                )
            );

            showSuccess(`User ${newStatus ? "activated" : "deactivated"} successfully.`);
            loadSummary();
        } catch (err) {
            handleRequestError(err);
        }
    };

    const deleteUser = async (user) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete ${user.Name}? This action cannot be undone.`
        );

        if (!confirmed) return;

        resetMessages();

        try {
            await api.delete(`/admin/users/${user.UserID}`);

            setUsers((previousUsers) =>
                previousUsers.filter((item) => item.UserID !== user.UserID)
            );

            setSelectedUser(null);
            showSuccess("User deleted successfully.");
            loadSummary();
        } catch (err) {
            handleRequestError(err);
        }
    };

    const deleteJob = async (job) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${job.JobTitle}"?`
        );

        if (!confirmed) return;

        resetMessages();

        try {
            await api.delete(`/admin/jobs/${job.JobID}`);

            setJobs((previousJobs) =>
                previousJobs.filter((item) => item.JobID !== job.JobID)
            );

            showSuccess("Job deleted successfully.");
            loadSummary();
        } catch (err) {
            handleRequestError(err);
        }
    };

    const filterData = (data, fields) => {
        const search = searchTerm.toLowerCase().trim();

        if (!search) return data;

        return data.filter((item) =>
            fields.some((field) =>
                String(item[field] ?? "").toLowerCase().includes(search)
            )
        );
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return "—";

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    const renderStatus = (isActive) => (
        <span className={`admin-status ${Boolean(isActive) ? "active" : "inactive"}`}>
            {Boolean(isActive) ? "Active" : "Inactive"}
        </span>
    );

    const renderApplicationStatus = (status) => {
        const normalizedStatus = String(status || "Pending")
            .toLowerCase()
            .replace(/\s+/g, "-");

        return (
            <span className={`admin-status application-status ${normalizedStatus}`}>
                {status || "Pending"}
            </span>
        );
    };

    const renderDashboard = () => {
        const cards = [
            {
                title: "Total Users",
                value: summary.totalUsers,
                icon: <FiUsers />,
                color: "blue"
            },
            {
                title: "Candidates",
                value: summary.totalCandidates,
                icon: <FiUser />,
                color: "purple"
            },
            {
                title: "Recruiters",
                value: summary.totalRecruiters,
                icon: <FiUserCheck />,
                color: "green"
            },
            {
                title: "Total Jobs",
                value: summary.totalJobs,
                icon: <FiBriefcase />,
                color: "orange"
            },
            {
                title: "Applications",
                value: summary.totalApplications,
                icon: <FiFileText />,
                color: "pink"
            }
        ];

        return (
            <>
                <div className="admin-section-heading">
                    <div>
                        <h2>Dashboard Overview</h2>
                        <p>Monitor and manage your JOB NEXA platform.</p>
                    </div>

                    <button className="admin-refresh-btn" onClick={loadSummary}>
                        <FiRefreshCw />
                        Refresh
                    </button>
                </div>

                <div className="admin-stats-grid">
                    {cards.map((card) => (
                        <div className="admin-stat-card" key={card.title}>
                            <div className={`admin-stat-icon ${card.color}`}>
                                {card.icon}
                            </div>

                            <div>
                                <p>{card.title}</p>
                                <h3>{card.value}</h3>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="admin-welcome-card">
                    <div className="admin-welcome-icon">
                        <FiShield />
                    </div>

                    <div>
                        <h3>Welcome to Admin Control Center</h3>
                        <p>
                            Manage platform users, job listings, applications,
                            recruiters, and candidates from one place.
                        </p>
                    </div>
                </div>
            </>
        );
    };

    const renderUsers = () => {
        const filteredUsers = filterData(users, [
            "Name",
            "Email",
            "Role",
            "UserID"
        ]);

        return (
            <>
                <div className="admin-section-heading">
                    <div>
                        <h2>User Management</h2>
                        <p>View, manage, activate, deactivate, or remove users.</p>
                    </div>

                    <button className="admin-refresh-btn" onClick={loadUsers}>
                        <FiRefreshCw />
                        Refresh
                    </button>
                </div>

                <div className="admin-toolbar">
                    <div className="admin-search-box">
                        <FiSearch />
                        <input
                            type="text"
                            placeholder="Search by name, email, role, or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <span className="admin-record-count">
                        {filteredUsers.length} users
                    </span>
                </div>

                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>User ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.UserID}>
                                    <td>#{user.UserID}</td>
                                    <td className="admin-primary-cell">{user.Name}</td>
                                    <td>{user.Email}</td>
                                    <td>
                                        <span className="admin-role-badge">{user.Role}</span>
                                    </td>
                                    <td>{renderStatus(user.IsActive)}</td>
                                    <td>
                                        <div className="admin-action-buttons">
                                            <button
                                                className="admin-icon-btn view"
                                                title="View details"
                                                onClick={() => viewUserDetails(user.UserID)}
                                            >
                                                <FiEye />
                                            </button>

                                            <button
                                                className={`admin-icon-btn ${
                                                    Boolean(user.IsActive) ? "deactivate" : "activate"
                                                }`}
                                                title={Boolean(user.IsActive) ? "Deactivate" : "Activate"}
                                                onClick={() => toggleUserStatus(user)}
                                            >
                                                <FiPower />
                                            </button>

                                            <button
                                                className="admin-icon-btn delete"
                                                title="Delete user"
                                                onClick={() => deleteUser(user)}
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredUsers.length === 0 && !loading && (
                        <div className="admin-empty-state">
                            <FiUsers />
                            <p>No users found.</p>
                        </div>
                    )}
                </div>

                {selectedUser && (
                    <div className="admin-modal-overlay" onClick={() => setSelectedUser(null)}>
                        <div
                            className="admin-modal"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="admin-modal-header">
                                <div>
                                    <h3>User Details</h3>
                                    <p>User information and account status</p>
                                </div>

                                <button
                                    className="admin-modal-close"
                                    onClick={() => setSelectedUser(null)}
                                >
                                    <FiX />
                                </button>
                            </div>

                            <div className="admin-user-details">
                                <div className="admin-user-avatar">
                                    {selectedUser.Name?.charAt(0)?.toUpperCase() || "U"}
                                </div>

                                <h3>{selectedUser.Name}</h3>
                                <p>{selectedUser.Email}</p>
                            </div>

                            <div className="admin-detail-row">
                                <span>User ID</span>
                                <strong>#{selectedUser.UserID}</strong>
                            </div>

                            <div className="admin-detail-row">
                                <span>Role</span>
                                <strong>{selectedUser.Role}</strong>
                            </div>

                            <div className="admin-detail-row">
                                <span>Account Status</span>
                                {renderStatus(selectedUser.IsActive)}
                            </div>

                            <div className="admin-modal-actions">
                                <button
                                    className="admin-secondary-btn"
                                    onClick={() => setSelectedUser(null)}
                                >
                                    Close
                                </button>

                                <button
                                    className="admin-danger-btn"
                                    onClick={() => deleteUser(selectedUser)}
                                >
                                    <FiTrash2 />
                                    Delete User
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

    const renderJobs = () => {
        const filteredJobs = filterData(jobs, [
            "JobID",
            "JobTitle",
            "CompanyName",
            "Location",
            "RecruiterID"
        ]);

        return (
            <>
                <div className="admin-section-heading">
                    <div>
                        <h2>Job Management</h2>
                        <p>Review job listings posted on the platform.</p>
                    </div>

                    <button className="admin-refresh-btn" onClick={loadJobs}>
                        <FiRefreshCw />
                        Refresh
                    </button>
                </div>

                <div className="admin-toolbar">
                    <div className="admin-search-box">
                        <FiSearch />
                        <input
                            type="text"
                            placeholder="Search jobs, companies, locations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <span className="admin-record-count">
                        {filteredJobs.length} jobs
                    </span>
                </div>

                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Job ID</th>
                                <th>Job Title</th>
                                <th>Company</th>
                                <th>Location</th>
                                <th>Recruiter ID</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredJobs.map((job) => (
                                <tr key={job.JobID}>
                                    <td>#{job.JobID}</td>
                                    <td className="admin-primary-cell">{job.JobTitle}</td>
                                    <td>{job.CompanyName}</td>
                                    <td>{job.Location}</td>
                                    <td>#{job.RecruiterID}</td>
                                    <td>
                                        <button
                                            className="admin-icon-btn delete"
                                            title="Delete job"
                                            onClick={() => deleteJob(job)}
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredJobs.length === 0 && !loading && (
                        <div className="admin-empty-state">
                            <FiBriefcase />
                            <p>No jobs found.</p>
                        </div>
                    )}
                </div>
            </>
        );
    };

    const renderApplications = () => {
        const filteredApplications = filterData(applications, [
            "ApplicationID",
            "JobID",
            "JobTitle",
            "CandidateID",
            "Name",
            "Email",
            "Status"
        ]);

        return (
            <>
                <div className="admin-section-heading">
                    <div>
                        <h2>Application Management</h2>
                        <p>Monitor candidate applications and their statuses.</p>
                    </div>

                    <button className="admin-refresh-btn" onClick={loadApplications}>
                        <FiRefreshCw />
                        Refresh
                    </button>
                </div>

                <div className="admin-toolbar">
                    <div className="admin-search-box">
                        <FiSearch />
                        <input
                            type="text"
                            placeholder="Search candidate, job, status, or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <span className="admin-record-count">
                        {filteredApplications.length} applications
                    </span>
                </div>

                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Application ID</th>
                                <th>Candidate</th>
                                <th>Email</th>
                                <th>Job Title</th>
                                <th>Applied Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredApplications.map((application) => (
                                <tr key={application.ApplicationID}>
                                    <td>#{application.ApplicationID}</td>
                                    <td className="admin-primary-cell">
                                        {application.Name}
                                    </td>
                                    <td>{application.Email}</td>
                                    <td>{application.JobTitle}</td>
                                    <td>{formatDate(application.ApplicationDate)}</td>
                                    <td>{renderApplicationStatus(application.Status)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredApplications.length === 0 && !loading && (
                        <div className="admin-empty-state">
                            <FiFileText />
                            <p>No applications found.</p>
                        </div>
                    )}
                </div>
            </>
        );
    };

    const renderRecruiters = () => {
        const filteredRecruiters = filterData(recruiters, [
            "RecruiterID",
            "UserID",
            "Name",
            "Email",
            "CompanyName",
            "CompanyDescription"
        ]);

        return (
            <>
                <div className="admin-section-heading">
                    <div>
                        <h2>Recruiter Management</h2>
                        <p>View recruiter accounts and company information.</p>
                    </div>

                    <button className="admin-refresh-btn" onClick={loadRecruiters}>
                        <FiRefreshCw />
                        Refresh
                    </button>
                </div>

                <div className="admin-toolbar">
                    <div className="admin-search-box">
                        <FiSearch />
                        <input
                            type="text"
                            placeholder="Search recruiter or company..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <span className="admin-record-count">
                        {filteredRecruiters.length} recruiters
                    </span>
                </div>

                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Recruiter ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Company</th>
                                <th>User ID</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredRecruiters.map((recruiter) => (
                                <tr key={recruiter.RecruiterID}>
                                    <td>#{recruiter.RecruiterID}</td>
                                    <td className="admin-primary-cell">{recruiter.Name}</td>
                                    <td>{recruiter.Email}</td>
                                    <td>{recruiter.CompanyName}</td>
                                    <td>#{recruiter.UserID}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredRecruiters.length === 0 && !loading && (
                        <div className="admin-empty-state">
                            <FiUserCheck />
                            <p>No recruiters found.</p>
                        </div>
                    )}
                </div>
            </>
        );
    };

    const renderCandidates = () => {
        const filteredCandidates = filterData(candidates, [
            "CandidateID",
            "UserID",
            "Name",
            "Email",
            "Phone",
            "ResumePath"
        ]);

        return (
            <>
                <div className="admin-section-heading">
                    <div>
                        <h2>Candidate Management</h2>
                        <p>View candidate accounts and profile information.</p>
                    </div>

                    <button className="admin-refresh-btn" onClick={loadCandidates}>
                        <FiRefreshCw />
                        Refresh
                    </button>
                </div>

                <div className="admin-toolbar">
                    <div className="admin-search-box">
                        <FiSearch />
                        <input
                            type="text"
                            placeholder="Search candidate, email, phone, or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <span className="admin-record-count">
                        {filteredCandidates.length} candidates
                    </span>
                </div>

                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Candidate ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>User ID</th>
                                <th>Resume</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredCandidates.map((candidate) => (
                                <tr key={candidate.CandidateID}>
                                    <td>#{candidate.CandidateID}</td>
                                    <td className="admin-primary-cell">{candidate.Name}</td>
                                    <td>{candidate.Email}</td>
                                    <td>{candidate.Phone || "—"}</td>
                                    <td>#{candidate.UserID}</td>
                                    <td>
                                        {candidate.ResumePath ? (
                                            <span className="admin-resume-label">
                                                <FiFileText />
                                                Available
                                            </span>
                                        ) : (
                                            <span className="admin-muted">Not uploaded</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredCandidates.length === 0 && !loading && (
                        <div className="admin-empty-state">
                            <FiUser />
                            <p>No candidates found.</p>
                        </div>
                    )}
                </div>
            </>
        );
    };

    const menuItems = [
        { name: "Dashboard", icon: <FiGrid /> },
        { name: "Users", icon: <FiUsers /> },
        { name: "Jobs", icon: <FiBriefcase /> },
        { name: "Applications", icon: <FiFileText /> },
        { name: "Recruiters", icon: <FiUserCheck /> },
        { name: "Candidates", icon: <FiUser /> }
    ];

    return (
        <div className="admin-dashboard">
            <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
                <div className="admin-sidebar-brand">
                    <div className="admin-brand-icon">J</div>

                    <span>
                        JOB <strong>NEXA</strong>
                    </span>

                    <button
                        className="admin-mobile-close"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <FiX />
                    </button>
                </div>

                <div className="admin-sidebar-label">ADMIN PANEL</div>

                <nav className="admin-sidebar-nav">
                    {menuItems.map((item) => (
                        <button
                            key={item.name}
                            className={`admin-nav-item ${
                                activeSection === item.name ? "active" : ""
                            }`}
                            onClick={() => handleSectionChange(item.name)}
                        >
                            {item.icon}
                            <span>{item.name}</span>
                        </button>
                    ))}
                </nav>

                <div className="admin-sidebar-footer">
                    <div className="admin-sidebar-footer-icon">
                        <FiShield />
                    </div>

                    <div>
                        <strong>Admin Access</strong>
                        <span>Platform Management</span>
                    </div>
                </div>
            </aside>

            {sidebarOpen && (
                <div
                    className="admin-sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <main className="admin-main">
                <header className="admin-topbar">
                    <button
                        className="admin-menu-toggle"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <FiMenu />
                    </button>

                    <div className="admin-topbar-title">
                        <span>JOB NEXA</span>
                        <strong>{activeSection}</strong>
                    </div>

                    <div className="admin-topbar-profile">
                        <div className="admin-profile-avatar">
                            <FiShield />
                        </div>

                        <div>
                            <strong>Administrator</strong>
                            <span>Admin</span>
                        </div>
                    </div>
                </header>

                <div className="admin-content">
                    {error && (
                        <div className="admin-alert error">
                            <FiAlertCircle />
                            <span>{error}</span>
                            <button onClick={() => setError("")}>
                                <FiX />
                            </button>
                        </div>
                    )}

                    {success && (
                        <div className="admin-alert success">
                            <FiCheckCircle />
                            <span>{success}</span>
                            <button onClick={() => setSuccess("")}>
                                <FiX />
                            </button>
                        </div>
                    )}

                    {loading && (
                        <div className="admin-loading">
                            <div className="admin-spinner"></div>
                            <span>Loading data...</span>
                        </div>
                    )}

                    {!loading && activeSection === "Dashboard" && renderDashboard()}
                    {!loading && activeSection === "Users" && renderUsers()}
                    {!loading && activeSection === "Jobs" && renderJobs()}
                    {!loading && activeSection === "Applications" && renderApplications()}
                    {!loading && activeSection === "Recruiters" && renderRecruiters()}
                    {!loading && activeSection === "Candidates" && renderCandidates()}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;