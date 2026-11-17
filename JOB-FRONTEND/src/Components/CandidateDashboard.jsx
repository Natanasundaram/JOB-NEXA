import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './CandidateDashboard.css'
import {
    FaUser,
    FaFileAlt,
    FaBriefcase,
    FaTools,
    FaCode,
    FaCalendarAlt
} from "react-icons/fa";

const CandidateDashboard = () => {

    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [applications, setApplications] = useState([])
    const [applicationError, setApplicationError] = useState("")
    const [applicationLoading, setApplicationLoading] = useState(true)
    const [statusHistory, setStatusHistory] = useState([])
    const [statusLoading, setStatusLoading] = useState(false)
    const [statusError, setStatusError] = useState('')
    const [selectedApplicationId, setSelectedApplicationId] = useState(null)
    const [resumeFile, setResumeFile] = useState(null)
    const [resumeSuccess, setResumeSuccess] = useState("")
    const [resumeError, setResumeError] = useState("")
    const [candidateSkills, setCandidateSkills] = useState([])
    const [candidateSkillError, setCandidateSkillError] = useState('')
    const [candidateSkillLoading, setCandidateSkillLoading] = useState(true)
    const [availableSkills, setAvailableSkills] = useState([])
    const [availableSkillsError, setAvailableSkillsError] = useState('')
    const [availableSkillLoading, setAvailableSkillLoading] = useState(true)
    const [selectedSkillId, setSelectedSkillId] = useState('')
    const [skillPost, setSkillPost] = useState('')
    const [skillPostError, setSkillPostError] = useState('')
    const [interviews, setInterviews] = useState([])
    const [interviewsLoading, setInterviewsLoading] = useState(true)
    const [interviewsError, setInterviewsError] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    const [editPhone, setEditPhone] = useState('')
    const [editLocation, setEditLocation] = useState('')
    const [profileUpdateMessage, setProfileUpdateMessage] = useState('')
    const [profileUpdateError, setProfileUpdateError] = useState('')
    const [selectedDetailsApplicationId, setSelectedDetailsApplicationId] = useState(null)
    const [activeSection, setActiveSection] = useState("profile");
    const [showSkillSelector, setShowSkillSelector] = useState(false);




    const profileFields = [
        profile?.Name,
        profile?.Email,
        profile?.Phone,
        profile?.Location,
        profile?.ResumePath
    ]

    const completedFields = profileFields.filter(field => Boolean(field))

    const profilePercentage = (completedFields.length / 5) * 100

    /*FETCHING PROFILE*/

    useEffect(() => {

        fetchProfile()
    }, [])




    const fetchProfile = async () => {
        try {

            const token = localStorage.getItem('token')
            const response = await axios.get('http://localhost:4000/candidates/profile',
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )

            setProfile(response.data.Details[0])
        } catch (err) {
            if (err.response) {
                setError(err.response.data.message || 'Fetching User Details Failed')
            } else {
                setError('Unable to Connect the Server')
            }
        }
        finally {
            setLoading(false)
        }

    }


    /*FETCHING APPLICATIONS*/

    useEffect(() => {

        const fetchApplication = async () => {
            try {
                const token = localStorage.getItem('token')

                const response = await axios.get('http://localhost:4000/applications/my',
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                )

                setApplications(response.data.application)
                console.log("Applications:", response.data.application)
            } catch (err) {
                if (err.response) {
                    setApplicationError(err.response.data.message || 'Fetching Application Details Failed')
                } else {
                    setApplicationError('Unable to Connect the Server')
                }
            } finally {
                setApplicationLoading(false)
            }
        }
        fetchApplication()
    }, [])


    /*APPLICATION STATUS HISTORY*/

    const fetchStatusHistory = async (applicationId) => {
        try {
            setStatusLoading(true)
            const token = localStorage.getItem('token')
            const response = await axios.get(`http://localhost:4000/applications/${applicationId}/history`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )
            console.log(response.data)
            setStatusHistory(response.data.applicationStatusResult)

        } catch (err) {
            if (err.response) {
                setStatusError(err.response.data.message || 'Unable to Fetch Status History')
            } else {
                setStatusError('Unable to Connect the Server')
            }
        }
        finally {
            setStatusLoading(false)
        }
    }


    /*ADD SKILLS*/

    const addSkill = async () => {
        try {
            const token = localStorage.getItem('token')
            if (!selectedSkillId) {
                alert('Skill Not Selected')
                return
            }
            setSkillPost("")
            setSkillPostError('')

            const response = await axios.post('http://localhost:4000/candidates/skills',
                {
                    skillId: selectedSkillId
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )
            setSkillPost(response.data.message)
            fetchSkills()
        }
        catch (err) {
            if (err.response) {
                setSkillPostError(err.response.data.message || 'Unable to Add Skill')
            } else {
                setSkillPostError('Unable to Connect Server')
            }
        }

    }


    /*DELETE SKILLS*/

    const deleteSkill = async (skillID) => {
        try {
            const token = localStorage.getItem('token')
            setSkillPost('')
            setSkillPostError('')


            const response = await axios.delete(`http://localhost:4000/candidates/skills/${skillID}`,

                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )

            setSkillPost(response.data.message)
            fetchSkills()
        }
        catch (err) {
            if (err.response) {
                setSkillPostError(err.response.data.message || 'Unable to Delete Skill')
            } else {
                setSkillPostError('Unable to connect to server')
            }
        }
    }


    useEffect(() => {
        fetchSkills()

    }, [])


    /*FETCHING SKILLS*/

    const fetchSkills = async () => {

        try {
            const token = localStorage.getItem('token')
            setCandidateSkillError('')
            const response = await axios.get('http://localhost:4000/candidates/skills',
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )
            console.log(response.data)
            setCandidateSkills(response.data.skill || [])
        }
        catch (err) {
            console.log(err.response?.data)
            if (err.response) {
                setCandidateSkillError(err.response.data.message || 'Unable to fetch Skills')
            } else {
                setCandidateSkillError('Unable to Connect Server')
            }

        }
        finally {
            setCandidateSkillLoading(false)
        }
    }

    /*UPLOADING RESUME*/

    const uploadResume = async () => {

        setResumeSuccess('')
        setResumeError('')
        if (resumeFile === null) {
            alert('Please select Resume')
            return
        }
        const formData = new FormData()

        formData.append('resume', resumeFile)
        try {
            const token = localStorage.getItem('token')

            const response = await axios.post('http://localhost:4000/candidates/resume',
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }

            )
            setResumeSuccess(response.data.message)
        } catch (err) {
            if (err.response) {
                setResumeError(err.response.data.message || 'Unable to Upload Resume')
            } else {
                setResumeError('Unable to Connect Server')
            }
        }

    }

    /*FETCHING AVAILABLE SKILLS*/

    useEffect(() => {
        const fetchAvailableSkills = async () => {
            try {
                const response = await axios.get('http://localhost:4000/skills',)

                setAvailableSkills(response.data.skills)

            } catch (err) {
                if (err.response) {
                    setAvailableSkillsError(err.response.data.message || 'Unable to fetch Skills')
                }
                else {
                    setAvailableSkillsError('Unable to Connect Server')
                }
            } finally {
                setAvailableSkillLoading(false)
            }
        }
        fetchAvailableSkills()
    }, [])


    /*FETCHING INTERVIEWS*/

    const fetchInterviews = async () => {
        try {

            const token = localStorage.getItem('token')
            setInterviewsError('')

            const response = await axios.get('http://localhost:4000/interviews/my',
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )
            setInterviews(response.data.interviews)

        } catch (err) {
            if (err.response) {
                if (err.response.status === 404) {
                    setInterviews([])
                    setInterviewsError('')
                } else {
                    setInterviewsError(
                        err.response.data.message || 'Unable to Fetch Interviews'
                    )
                }
            } else {
                setInterviewsError('Unable to Connect Server')
            }
        }
        finally {
            setInterviewsLoading(false)
        }
    }

    useEffect(() => {
        fetchInterviews()
    }, [])


    /*VIEW RESUME*/

    const viewResume = async () => {

        try {
            const token = localStorage.getItem('token')

            const response = await axios.get('http://localhost:4000/candidates/resume',
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    responseType: 'blob'
                }
            )

            const fileURL = URL.createObjectURL(response.data)
            window.open(fileURL, '_blank')
        } catch (err) {
            console.log('Unable to View Resume', err)
        }
    }


    /*EDIT CANDIDATE PROFILE*/

    const editProfile = async () => {

        try {
            setProfileUpdateMessage('')
            setProfileUpdateError('')
            const token = localStorage.getItem('token')
            if (editPhone.length !== 10) {
                setProfileUpdateError('Phone number must contain 10 digits')
                return
            }
            if (editPhone[0] !== "6" && editPhone[0] !== "7" && editPhone[0] !== "8" && editPhone[0] !== "9") {
                setProfileUpdateError('Phone number must start with 6, 7, 8, or 9')
                return
            }
            if (editLocation.trim() === '') {
                setProfileUpdateError('Please Enter the Location')
                return
            }

            const response = await axios.put('http://localhost:4000/candidates/profile',
                {
                    phone: editPhone,
                    location: editLocation
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )
            setProfile((previousProfile) => ({
                ...previousProfile,
                Phone: editPhone,
                Location: editLocation
            }))
            setProfileUpdateMessage(response.data.message)
            setIsEditing(false)
        }
        catch (err) {
            if (err.response) {
                setProfileUpdateError(err.response.data.message || 'Unable to Edit Profile')
            }
            else {
                setProfileUpdateError('Unable to Connect Server')
            }
        }


    }


    return (
        <div className="candidate-dashboard">

            {/* INTERNAL SIDEBAR */}
            <aside className="dashboard-sidebar">

                {/* <h2 className="sidebar-logo">
                    JOB <span>NEXA</span>
                </h2> */}

                <p className="sidebar-heading">MY ACCOUNT</p>

                <nav>
                    <button type="button" className={`sidebar-link ${activeSection === "profile" ? "active" : ""}`} onClick={() => setActiveSection("profile")}>
                        <FaUser /> <span>Profile</span>
                    </button>
                    <button type="button" className={`sidebar-link ${activeSection === "resume" ? "active" : ""}`} onClick={() => setActiveSection("resume")}>
                        <FaFileAlt /> <span>Resume</span>
                    </button>
                    <button type="button" className={`sidebar-link ${activeSection === "applications" ? "active" : ""}`} onClick={() => setActiveSection("applications")}>
                        <FaBriefcase /> <span>Applications</span>
                    </button>
                    <button type="button" className={`sidebar-link ${activeSection === "skills" ? "active" : ""}`} onClick={() => setActiveSection("skills")}>
                        <FaCode /> <span>Skills</span>
                    </button>
                    <button type="button" className={`sidebar-link ${activeSection === "interviews" ? "active" : ""}`} onClick={() => setActiveSection("interviews")}>
                        <FaCalendarAlt /> <span>Interviews</span>
                    </button>
                </nav>

            </aside>

            {/* MAIN DASHBOARD */}
            <main className="dashboard-main">

                {/* DASHBOARD HEADER */}
                <header className="dashboard-header">
                    <h1>Candidate Dashboard</h1>
                    <p>Manage your profile, applications and skills.</p>
                </header>

                {/* PROFILE SECTION */}
                {activeSection === "profile" && (
                    <div className={`profile-layout ${isEditing ? 'editing' : ''}`}>

                        <section id="profile" className="profile-card">

                            <div className="profile-header">
                                <h3>Profile</h3>

                                <button
                                    type="button"
                                    className="edit-profile-btn"
                                    disabled={loading || !profile}
                                    onClick={() => {
                                        setEditPhone(profile?.Phone || '')
                                        setEditLocation(profile?.Location || '')
                                        setProfileUpdateMessage('')
                                        setProfileUpdateError('')
                                        setIsEditing(true)
                                    }}
                                >
                                    Edit
                                </button>
                            </div>

                            {loading && <h3>Loading Profile...</h3>}

                            {error && <p className="error-message">Error: {error}</p>}

                            {!loading && !error && profile && (
                                <div className="profile-content">

                                    {/* Profile Details */}
                                    <div className="profile-details">
                                        <p><strong>Name: </strong>{profile.Name}</p>
                                        <p><strong>Email: </strong>{profile.Email}</p>
                                        <p><strong>Phone: </strong>{profile.Phone}</p>
                                        <p><strong>Location: </strong>{profile.Location}</p>
                                    </div>

                                    {/* Profile Completion */}
                                    <div className="profile-completion">

                                        <h4>Profile Completion</h4>

                                        <div
                                            className="progress-circle"
                                            style={{
                                                background: `conic-gradient(#2563eb ${profilePercentage}%, #e2e8f0 ${profilePercentage}%)`
                                            }}
                                        >
                                            <span className="progress-value">
                                                {profilePercentage}%
                                            </span>
                                        </div>

                                        <p>Completed</p>

                                    </div>

                                </div>
                            )}

                        </section>

                        {isEditing && (
                            <section className="edit-profile-card">

                                <h3>Edit Profile</h3>

                                <label htmlFor="phone">Phone Number</label>
                                <input
                                    id="phone"
                                    type="tel"
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                />

                                <label htmlFor="location">Location</label>
                                <input
                                    id="location"
                                    type="text"
                                    value={editLocation}
                                    onChange={(e) => setEditLocation(e.target.value)}
                                />

                                {profileUpdateError && (
                                    <p className="error-message">{profileUpdateError}</p>
                                )}

                                <button
                                    className="update-profile-btn"
                                    onClick={editProfile}
                                    type="button"
                                >
                                    Update Profile
                                </button>

                                <button
                                    className="cancel-profile-btn"
                                    onClick={() => {
                                        setIsEditing(false)
                                        setProfileUpdateMessage('')
                                        setProfileUpdateError('')
                                    }}
                                    type="button"
                                >
                                    Cancel
                                </button>

                            </section>
                        )}

                    </div>
                )}

                {activeSection === "profile" && profileUpdateMessage && (
                    <p className="success-message">{profileUpdateMessage}</p>
                )}

                {/* RESUME SECTION */}
                {activeSection === "resume" && (
                    <section id="resume" className="resume-card">

                        <h3>Upload Resume</h3>

                        <form>
                            <label htmlFor="resume">Choose Resume</label>

                            <input
                                type="file"
                                id="resume"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => setResumeFile(e.target.files[0])}
                            />

                            <button type="button" onClick={uploadResume}>
                                Upload Resume
                            </button>
                            <button type="button"
                                className="view-resume-btn"
                                onClick={viewResume}>
                                View Resume
                            </button>
                        </form>

                        {resumeError && (
                            <p className="error-message">
                                Error: {resumeError}
                            </p>
                        )}

                        {resumeSuccess && resumeFile && (
                            <p className="success-message">
                                Selected File: {resumeFile.name} Successfully Uploaded
                            </p>
                        )}

                    </section>
                )}

                {/* APPLICATIONS SECTION */}
                {activeSection === "applications" && (
                    <section id="applications" className="applications-section">

                        <div className="applications-header">
                            <div>
                                <h3>Applications</h3>
                                <p>Track the jobs you have applied for.</p>
                            </div>

                            <span className="applications-count">
                                {applications.length}{' '}
                                {applications.length === 1 ? 'Application' : 'Applications'}
                            </span>
                        </div>

                        {applicationLoading && <p>Loading Applications...</p>}

                        {applicationError && (
                            <p className="error-message">
                                Error: {applicationError}
                            </p>
                        )}

                        {!applicationLoading && !applicationError && applications.length === 0 && (
                            <div className="no-applications">
                                <h4>No applications yet</h4>
                                <p>Jobs you apply for will appear here.</p>
                            </div>
                        )}

                        {!applicationLoading && !applicationError && applications.length > 0 && (
                            <div className="applications-list">

                                {applications.map((app) => {

                                    const statusClass = app.Status
                                        ?.toLowerCase()
                                        .replace(/\s+/g, '-');

                                    const isHistoryOpen =
                                        selectedApplicationId === app.ApplicationID;

                                    const isDetailsOpen =
                                        selectedDetailsApplicationId === app.ApplicationID;

                                    return (
                                        <article
                                            key={app.ApplicationID}
                                            className="application-card"
                                        >

                                            {/* COMPACT CARD HEADER */}
                                            <div className="application-card-top">

                                                <div className="application-job-info">
                                                    <h4>{app.JobTitle}</h4>

                                                    <p className="application-job-meta">
                                                        {app.Location || 'Location not specified'}
                                                        {' · '}
                                                        {app.JobType || 'Job type not specified'}
                                                    </p>
                                                </div>

                                                <span className={`application-status ${statusClass}`}>
                                                    {app.Status}
                                                </span>

                                            </div>

                                            {/* CARD FOOTER: DATE + ACTION BUTTONS */}
                                            <div className="application-card-bottom">

                                                <span className="application-date">
                                                    Applied:{' '}
                                                    {new Date(app.ApplicationDate).toLocaleDateString(
                                                        'en-IN',
                                                        {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        }
                                                    )}
                                                </span>

                                                <div className="application-card-actions">

                                                    {/* VIEW DETAILS BUTTON */}
                                                    <button
                                                        type="button"
                                                        className="view-details-btn"
                                                        onClick={() => {
                                                            setSelectedDetailsApplicationId(
                                                                isDetailsOpen
                                                                    ? null
                                                                    : app.ApplicationID
                                                            );
                                                        }}
                                                    >
                                                        {isDetailsOpen
                                                            ? 'Hide Details'
                                                            : 'View Details'}
                                                    </button>

                                                    {/* STATUS HISTORY BUTTON */}
                                                    <button
                                                        type="button"
                                                        className="history-toggle-btn"
                                                        onClick={() => {
                                                            if (isHistoryOpen) {
                                                                setSelectedApplicationId(null);
                                                            } else {
                                                                setSelectedApplicationId(app.ApplicationID);
                                                                setStatusHistory([]);
                                                                setStatusError('');
                                                                fetchStatusHistory(app.ApplicationID);
                                                            }
                                                        }}
                                                    >
                                                        {isHistoryOpen
                                                            ? 'Hide History'
                                                            : 'View Status History'}
                                                    </button>

                                                </div>

                                            </div>

                                            {/* EXPANDED APPLICATION DETAILS */}
                                            {isDetailsOpen && (
                                                <div className="application-details">

                                                    <h5>Application Details</h5>

                                                    <div className="application-details-grid">

                                                        <div className="application-detail-item">
                                                            <span>Application ID</span>
                                                            <strong>{app.ApplicationID}</strong>
                                                        </div>

                                                        <div className="application-detail-item">
                                                            <span>Job ID</span>
                                                            <strong>{app.JobID}</strong>
                                                        </div>

                                                        <div className="application-detail-item">
                                                            <span>Job Title</span>
                                                            <strong>{app.JobTitle}</strong>
                                                        </div>

                                                        <div className="application-detail-item">
                                                            <span>Location</span>
                                                            <strong>{app.Location || 'Not specified'}</strong>
                                                        </div>

                                                        <div className="application-detail-item">
                                                            <span>Job Type</span>
                                                            <strong>{app.JobType || 'Not specified'}</strong>
                                                        </div>

                                                        <div className="application-detail-item">
                                                            <span>Experience Required</span>
                                                            <strong>
                                                                {app.ExperienceRequired ?? 'Not specified'}
                                                                {app.ExperienceRequired !== null &&
                                                                    app.ExperienceRequired !== undefined
                                                                    ? ' years'
                                                                    : ''}
                                                            </strong>
                                                        </div>

                                                        <div className="application-detail-item">
                                                            <span>Salary Range</span>
                                                            <strong>
                                                                {app.SalaryMin != null && app.SalaryMax != null
                                                                    ? `₹${Number(app.SalaryMin).toLocaleString('en-IN')} - ₹${Number(app.SalaryMax).toLocaleString('en-IN')}`
                                                                    : 'Not specified'}
                                                            </strong>
                                                        </div>

                                                        <div className="application-detail-item">
                                                            <span>Application Status</span>
                                                            <strong>{app.Status}</strong>
                                                        </div>

                                                        <div className="application-detail-item">
                                                            <span>Applied Date</span>
                                                            <strong>
                                                                {new Date(app.ApplicationDate).toLocaleDateString(
                                                                    'en-IN',
                                                                    {
                                                                        day: '2-digit',
                                                                        month: 'short',
                                                                        year: 'numeric'
                                                                    }
                                                                )}
                                                            </strong>
                                                        </div>

                                                        <div className="application-detail-item">
                                                            <span>Last Updated</span>
                                                            <strong>
                                                                {app.UpdatedAt
                                                                    ? new Date(app.UpdatedAt).toLocaleDateString(
                                                                        'en-IN',
                                                                        {
                                                                            day: '2-digit',
                                                                            month: 'short',
                                                                            year: 'numeric'
                                                                        }
                                                                    )
                                                                    : 'Not updated'}
                                                            </strong>
                                                        </div>

                                                    </div>

                                                </div>
                                            )}

                                            {/* EXPANDED STATUS HISTORY */}
                                            {isHistoryOpen && (
                                                <div className="application-history">

                                                    <h5>Status History</h5>

                                                    {statusLoading && <p>Loading history...</p>}

                                                    {statusError && (
                                                        <p className="error-message">
                                                            {statusError}
                                                        </p>
                                                    )}

                                                    {!statusLoading &&
                                                        !statusError &&
                                                        statusHistory.length === 0 && (
                                                            <p>No status history available.</p>
                                                        )}

                                                    {!statusLoading &&
                                                        !statusError &&
                                                        statusHistory.length > 0 && (
                                                            <div className="history-list">

                                                                {statusHistory.map((status, index) => (
                                                                    <div
                                                                        className="history-item"
                                                                        key={index}
                                                                    >
                                                                        <span>{status.Status}</span>

                                                                        <span>
                                                                            {new Date(status.ChangedAt).toLocaleDateString(
                                                                                'en-IN',
                                                                                {
                                                                                    day: '2-digit',
                                                                                    month: 'short',
                                                                                    year: 'numeric'
                                                                                }
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                ))}

                                                            </div>
                                                        )}

                                                </div>
                                            )}

                                        </article>
                                    );
                                })}

                            </div>
                        )}

                    </section>
                )}

                {/* CANDIDATE SKILLS SECTION */}
                {activeSection === "skills" && (
                    <section id="skills" className="candidate-skills-card">

                        <div className="skills-header">
                            <div>
                                <h3>Skills</h3>
                                <p>Manage the skills listed on your profile.</p>
                            </div>

                            <button
                                type="button"
                                className="add-skills-btn"
                                onClick={() => setShowSkillSelector(!showSkillSelector)}
                            >
                                {showSkillSelector ? "Cancel" : "+ Add Skills"}
                            </button>
                        </div>

                        {showSkillSelector && (
                            <div className="available-skills-panel">

                                <h4>Available Skills</h4>

                                {availableSkillLoading && (
                                    <p className="loading-message">
                                        Loading available skills...
                                    </p>
                                )}

                                {availableSkillsError && (
                                    <p className="error-message">
                                        Error: {availableSkillsError}
                                    </p>
                                )}

                                {!availableSkillLoading &&
                                    !availableSkillsError &&
                                    availableSkills.length === 0 && (
                                        <p className="empty-message">
                                            No available skills.
                                        </p>
                                    )}

                                {!availableSkillLoading && !availableSkillsError && (
                                    <div className="add-skill-controls">

                                        <select
                                            value={selectedSkillId}
                                            onChange={(e) => {
                                                setSelectedSkillId(e.target.value);
                                                setSkillPost("");
                                                setSkillPostError("");
                                            }}
                                        >
                                            <option value="">Select a skill</option>

                                            {availableSkills.map((avSkills) => (
                                                <option
                                                    key={avSkills.SkillID}
                                                    value={avSkills.SkillID}
                                                >
                                                    {avSkills.SkillName}
                                                </option>
                                            ))}
                                        </select>

                                        <button
                                            type="button"
                                            className="confirm-add-skill-btn"
                                            onClick={addSkill}
                                            disabled={!selectedSkillId}
                                        >
                                            Add
                                        </button>
                                    </div>
                                )}

                                {skillPostError && (
                                    <p className="error-message">{skillPostError}</p>
                                )}

                                {skillPost && (
                                    <p className="success-message">{skillPost}</p>
                                )}

                            </div>
                        )}

                        {candidateSkillLoading && (
                            <p className="loading-message">Loading your skills...</p>
                        )}

                        {candidateSkillError && (
                            <p className="error-message">
                                Error: {candidateSkillError}
                            </p>
                        )}

                        {!candidateSkillLoading &&
                            !candidateSkillError &&
                            candidateSkills.length === 0 && (
                                <p className="empty-message">
                                    No skills added yet. Click "+ Add Skills" to get started.
                                </p>
                            )}

                        {!candidateSkillLoading && !candidateSkillError && (
                            <div className="candidate-skills-list">

                                {candidateSkills.map((skill) => (
                                    <div
                                        key={skill.SkillID}
                                        className="candidate-skill-chip"
                                    >
                                        <span>{skill.SkillName}</span>

                                        <button
                                            type="button"
                                            className="delete-skill-btn"
                                            onClick={() => deleteSkill(skill.SkillID)}
                                            aria-label={`Remove ${skill.SkillName}`}
                                            title={`Remove ${skill.SkillName}`}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}

                            </div>
                        )}

                    </section>
                )}
                {activeSection === "interviews" && (
                    <section className="interviews-section">
                        <h3><FaCalendarAlt /> My Interviews</h3>
                        {interviewsLoading && <p>Loading Interviews...</p>}
                        {interviewsError && <p>Error:{interviewsError}</p>}
                        {!interviewsLoading && !interviewsError && interviews.length === 0
                            && (<p>No Interviews Found</p>)
                        }
                        {!interviewsLoading && !interviewsError && (

                            <div className='interviews-list'>
                                {interviews.map((inter) => {
                                    return (
                                        <div className='interview-card' key={inter.InterviewID}>
                                            <h4>{inter.JobTitle}</h4>
                                            <p><strong>Application ID:</strong> {inter.ApplicationID}</p>
                                            <p>
                                                <strong>Interview Date & Time:</strong>{" "}
                                                {new Date(inter.InterviewDate).toLocaleString("en-IN", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                    hour12: true
                                                })}
                                            </p>
                                            <p><strong>Mode:</strong> {inter.InterviewMode}</p>
                                            <p><strong>Location:</strong> {inter.InterviewLocation}</p>
                                            <p><strong>Status:</strong> {inter.Status}</p>
                                            <p><strong>Notes:</strong> {inter.Notes}</p>

                                        </div>
                                    )
                                })}
                            </div>
                        )

                        }

                    </section>
                )}

            </main>

        </div>
    )

}

export default CandidateDashboard
