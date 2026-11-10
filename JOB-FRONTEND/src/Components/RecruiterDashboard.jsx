import React, { useEffect, useState } from 'react'
import axios from 'axios'
import {
  MdDashboard,
  MdWork,
  MdAddBox,
  MdPeople,
  MdEvent,
  MdSearch,
  MdLogout
} from 'react-icons/md'
import './RecruiterDashboard.css'

const RecruiterDashboard = () => {
  const [activeSection, setActiveSection] = useState('Dashboard')

  const menuItems = [
    { name: 'Dashboard', icon: <MdDashboard /> },
    { name: 'My Jobs', icon: <MdWork /> },
    { name: 'Post Jobs', icon: <MdAddBox /> },
    { name: 'Applicants', icon: <MdPeople /> },
    { name: 'Find Candidates', icon: <MdSearch /> },
    { name: 'Interviews', icon: <MdEvent /> }
  ]

  const [totalJobs, setTotalJobs] = useState(0)
  const [totalApplications, setTotalApplications] = useState(0)
  const [totalApplied, setTotalApplied] = useState(0)
  const [totalShortlisted, setTotalShortlisted] = useState(0)
  const [totalRejected, setTotalRejected] = useState(0)
  const [dashboardError, setDashboardError] = useState('')
  const [dashboardLoading, setDashboardLoading] = useState(false)

  const [recruiterJobs, setRecruiterJobs] = useState([])
  const [recruiterJobError, setRecruiterJobError] = useState('')
  const [recruiterJobsLoading, setRecruiterJobsLoading] = useState(false)
  const [updateStatus, setUpdateStatus] = useState('')
  const [updateError, setUpdateError] = useState('')
  const [jobForm, setJobForm] = useState({
    jobTitle: '',
    description: '',
    location: '',
    salaryMin: '',
    salaryMax: '',
    experienceRequired: '',
    jobType: '',
    skillsRequired: ''
  })

  const [jobFormError, setJobFormError] = useState('')
  const [jobFormMessage, setJobFormMessage] = useState('')
  const [jobFormLoading, setJobFormLoading] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [jobDetailsError, setJobDetailsError] = useState('')
  const [deleteJobSuccess, setDeleteJobSuccess] = useState('')
  const [deleteJobError, setDeleteJobError] = useState('')
  const [applicants, setApplicants] = useState([])
  const [applicantsLoading, setApplicantsLoading] = useState(false)
  const [applicantsError, setApplicantsError] = useState('')
  const [updateStatusMessage, setUpdateStatusMessage] = useState('')
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [selectedSkillsJobs, setSelectedSkillsJobs] = useState(null);
  const [jobSkills, setJobSkills] = useState([]);
  const [jobSkillsError, setJobSkillsError] = useState("");
  const [availableSkills, setAvailableSkills] = useState([]);
  const [showAvailableSkills, setShowAvailableSkills] = useState(false);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [availableSkillsLoading, setAvailableSkillsLoading] = useState(false);
  const [addingSkillId, setAddingSkillId] = useState(null);
  const [deletingSkillId, setDeletingSkillId] = useState(null);
  const [candidateSkills, setCandidateSkills] = useState([]);
  const [selectedCandidateSkill, setSelectedCandidateSkill] = useState("");
  const [matchingCandidates, setMatchingCandidates] = useState([]);
  const [candidateSkillsLoading, setCandidateSkillsLoading] = useState(false);
  const [candidateSkillsError, setCandidateSkillsError] = useState("");
  const [selectedMatchingJob, setSelectedMatchingJob] = useState("");
  const [jobMatchingCandidates, setJobMatchingCandidates] = useState([]);
  const [jobMatchingCandidatesLoading, setJobMatchingCandidatesLoading] = useState(false);
  const [jobMatchingCandidatesError, setJobMatchingCandidatesError] = useState("");
  const [recruiterInterviews, setRecruiterInterviews] = useState([]);
  const [interviewsLoading, setInterviewsLoading] = useState(false);
  const [interviewsError, setInterviewsError] = useState("");
  const [interviewStatusLoading, setInterviewStatusLoading] = useState(null);
  const [interviewStatusMessage, setInterviewStatusMessage] = useState("");
  const [interviewStatusError, setInterviewStatusError] = useState("");
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);

  const [interviewForm, setInterviewForm] = useState({
    interviewDate: "",
    interviewMode: "Online",
    interviewLocation: "",
    notes: ""
  });



  const [scheduleInterviewLoading, setScheduleInterviewLoading] = useState(false);
  const [scheduleInterviewError, setScheduleInterviewError] = useState("");
  const [scheduleInterviewMessage, setScheduleInterviewMessage] = useState("");


  /*FETCHING RECRUITER DASHBOARD SUMMARY*/

  const fetchDashboardSummary = async () => {
    try {
      setDashboardError('')
      setDashboardLoading(true)

      const token = localStorage.getItem('token')

      const response = await axios.get(
        'http://localhost:4000/recruiter/dashboard/summary',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      setTotalJobs(response.data.totalJobs)
      setTotalApplications(response.data.totalApplications)
      setTotalApplied(response.data.totalApplied)
      setTotalShortlisted(response.data.totalShortlisted)
      setTotalRejected(response.data.totalRejected)
    } catch (err) {
      if (err.response) {
        setDashboardError(
          err.response.data.message || 'Unable to Fetch Dashboard'
        )
      } else {
        setDashboardError('Unable to Connect Server')
      }
    } finally {
      setDashboardLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardSummary()
  }, [])


  useEffect(() => {
    if (activeSection === "Interviews") {
      fetchRecruiterInterviews();
    }
  }, [activeSection]);

  /*FETCHING RECRUITER JOB*/


  const fetchRecruiterJobs = async () => {
    try {
      setRecruiterJobError('')
      setRecruiterJobsLoading(true)

      const token = localStorage.getItem('token')

      const response = await axios.get(
        'http://localhost:4000/recruiter/dashboard/jobs',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      setRecruiterJobs(response.data.Jobs)
    } catch (err) {
      if (err.response) {
        setRecruiterJobError(
          err.response.data.message || 'Unable to Fetch Jobs'
        )
      } else {
        setRecruiterJobError('Unable to Connect Server')
      }
    } finally {
      setRecruiterJobsLoading(false)
    }
  }

  useEffect(() => {
    fetchRecruiterJobs()
  }, [])



  /*FETCHING JOB DETAILS*/

  const fetchJobDetails = async (jobId) => {
    try {
      setJobDetailsError('')
      setJobFormError('')
      setJobFormMessage('')

      const token = localStorage.getItem('token')

      const response = await axios.get(
        `http://localhost:4000/jobs/${jobId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      const job = response.data.JobIDResult[0]

      setJobForm({
        jobTitle: job.JobTitle ?? '',
        description: job.Description ?? '',
        location: job.Location ?? '',
        salaryMin: job.SalaryMin ?? '',
        salaryMax: job.SalaryMax ?? '',
        experienceRequired: job.ExperienceRequired ?? '',
        jobType: job.JobType ?? '',
        skillsRequired: job.SkillsRequired ?? ''
      })
    } catch (err) {
      if (err.response) {
        setJobDetailsError(
          err.response.data.message || 'Unable to Fetch Job Details'
        )
      } else {
        setJobDetailsError('Unable to Connect Server')
      }
    }
  }

  const handlePost = async (e) => {
    e.preventDefault()

    try {
      setJobFormLoading(true)
      setJobFormError('')
      setJobFormMessage('')

      const token = localStorage.getItem('token')
      let response

      if (selectedJobId) {
        response = await axios.put(
          `http://localhost:4000/jobs/${selectedJobId}`,
          jobForm,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )
      } else {
        response = await axios.post(
          'http://localhost:4000/jobs',
          jobForm,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )
      }

      setJobFormMessage(response.data.message || 'Job saved successfully')

      setJobForm({
        jobTitle: '',
        description: '',
        location: '',
        salaryMin: '',
        salaryMax: '',
        experienceRequired: '',
        jobType: '',
        skillsRequired: ''
      })

      setSelectedJobId(null)

      await fetchRecruiterJobs()
      await fetchDashboardSummary()
    } catch (err) {
      if (err.response) {
        setJobFormError(
          err.response.data.message || 'Unable to Save Job'
        )
      } else {
        setJobFormError('Unable to Connect Server')
      }
    } finally {
      setJobFormLoading(false)
    }
  }

  const handleEditJob = async (jobId) => {
    setSelectedJobId(jobId)
    setActiveSection('Post a Job')
    await fetchJobDetails(jobId)
  }

  const handleCancelEdit = () => {
    setSelectedJobId(null)
    setJobDetailsError('')
    setJobFormError('')
    setJobFormMessage('')

    setJobForm({
      jobTitle: '',
      description: '',
      location: '',
      salaryMin: '',
      salaryMax: '',
      experienceRequired: '',
      jobType: '',
      skillsRequired: ''
    })
  }


  /*DELETE A JOB*/

  const handleDeleteJob = async (jobId) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this job?'
    )

    if (!confirmDelete) return

    try {
      setDeleteJobSuccess('')
      setDeleteJobError('')

      const token = localStorage.getItem('token')

      const response = await axios.delete(
        `http://localhost:4000/deleteJob/${jobId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      setDeleteJobSuccess(response.data.message)

      await fetchRecruiterJobs()
      await fetchDashboardSummary()

    } catch (err) {
      if (err.response) {
        setDeleteJobError(
          err.response.data.message || 'Unable to Delete Job'
        )
      } else {
        setDeleteJobError('Unable to Connect Server')
      }
    }
  }



  /*FETCHING APPLICANTS*/

  const fetchApplicants = async () => {

    try {
      setApplicantsLoading(true)
      setApplicantsError('')
      const token = localStorage.getItem('token')

      const response = await axios.get('http://localhost:4000/applications/recruiter',

        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      console.log(response.data)
      setApplicants(response.data.RecruiterJobResult)
    }
    catch (err) {
      setApplicantsError(
        err.response?.data?.message || 'Unable to Load Applicants'
      )
    }

    finally {
      setApplicantsLoading(false)
    }

  }

  useEffect(() => {
    if (activeSection === 'Applicants') {
      fetchApplicants()
    }
  }, [activeSection])



  /*RECRUITER VIEW CANDIDATE RESUME*/

  const viewResume = async (candidateID) => {

    try {
      const token = localStorage.getItem('token')

      const response = await axios.get(`http://localhost:4000/applications/recruiter/${candidateID}/resume`,
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


  /*UPDATING APPLICATIONS STATUS*/

  const updateApplicationStatus = async (jobID, candidateID, action) => {

    try {

      setUpdateStatusMessage('')
      setUpdateError('')
      const token = localStorage.getItem('token')

      const response = await axios.post(`http://localhost:4000/jobs/${jobID}/candidate/${candidateID}/${action}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      setUpdateStatusMessage(response.data.message)
      await fetchApplicants()
    } catch (err) {
      setUpdateError(err.response.data.message || 'Unable to Change Status')
    }
  }


  /* FETCH JOB SKILLS */

  const handleViewSkills = async (jobId, jobTitle) => {

    setSelectedSkillsJobs({
      JobID: jobId,
      JobTitle: jobTitle,
    });

    setShowSkillsModal(true);
    setShowAvailableSkills(false);
    setJobSkillsError("");
    setJobSkills([]);
    setSkillsLoading(true);

    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `http://localhost:4000/jobs/${jobId}/skills`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setJobSkills(response.data.skill || []);
    } catch (err) {
      console.error("Error fetching job skills:", err);

      setJobSkillsError(
        err.response?.data?.message || "Unable to fetch job skills"
      );
    } finally {
      setSkillsLoading(false);
    }
  };




  /* FETCH AVAILABLE SKILLS */

  const fetchAvailableSkills = async () => {
    setAvailableSkillsLoading(true);

    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        "http://localhost:4000/skills",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAvailableSkills(response.data.skills || []);
    } catch (err) {
      console.error("Error fetching available skills:", err);

      setJobSkillsError(
        err.response?.data?.message || "Unable to fetch available skills"
      );
    } finally {
      setAvailableSkillsLoading(false);
    }
  };


  /* ADD SKILL TO JOB */
  const handleAddSkill = async (skillId) => {

    if (!selectedSkillsJobs?.JobID) {
      setJobSkillsError("Please select a job first");
      return;
    }

    const jobId = selectedSkillsJobs.JobID;
    const jobTitle = selectedSkillsJobs.JobTitle;

    setAddingSkillId(skillId);
    setJobSkillsError("");

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `http://localhost:4000/jobs/${jobId}/skills`,
        {
          skillId: Number(skillId),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await handleViewSkills(jobId, jobTitle);

      setShowAvailableSkills(false);
    } catch (err) {
      console.error("Add skill failed:", err);
      console.error("Status:", err.response?.status);
      console.error("Backend response:", err.response?.data);

      setJobSkillsError(
        err.response?.data?.message || "Unable to add skill"
      );
    } finally {
      setAddingSkillId(null);
    }
  };




  /* DELETE SKILL FROM JOB */
  const handleDeleteSkill = async (skillId) => {
    if (!selectedSkillsJobs?.JobID) {
      setJobSkillsError("Please select a job first");
      return;
    }

    const jobId = selectedSkillsJobs.JobID;
    const jobTitle = selectedSkillsJobs.JobTitle;

    setDeletingSkillId(skillId);
    setJobSkillsError("");

    try {
      const token = localStorage.getItem("token");

      const response = await axios.delete(
        `http://localhost:4000/jobs/${jobId}/skills/${skillId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await handleViewSkills(jobId, jobTitle);
    } catch (err) {
      console.error("Delete skill failed:", err);
      console.error("Status:", err.response?.status);
      console.error("Backend response:", err.response?.data);

      setJobSkillsError(
        err.response?.data?.message || "Unable to delete skill"
      );
    } finally {
      setDeletingSkillId(null);
    }
  };





  /* FIND CANDIDATES BY SKILLS */

  const fetchMatchingCandidates = async (skillId) => {
    try {
      setCandidateSkillsLoading(true);
      setCandidateSkillsError("");
      setMatchingCandidates([]);

      const token = localStorage.getItem("token");

      const response = await axios.get(
        `http://localhost:4000/candidates/skills/${skillId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMatchingCandidates(response.data.matchingResult || []);
    } catch (err) {
      console.error("Error fetching matching candidates:", err);

      setCandidateSkillsError(
        err.response?.data?.message || "Unable to fetch matching candidates"
      );
    } finally {
      setCandidateSkillsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === "Find Candidates" && availableSkills.length === 0) {
      fetchAvailableSkills();
    }
  }, [activeSection]);



  /*FETCHING MATCHING CANDIDATES FOR JOB*/

  const fetchJobMatchingCandidates = async (jobId) => {

    try {
      setJobMatchingCandidatesLoading(true)
      setJobMatchingCandidatesError('')
      const token = localStorage.getItem('token')

      const response = await axios.get(`http://localhost:4000/jobs/${jobId}/matching-candidates`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      setJobMatchingCandidates(response.data.matchingResult || [])

    }
    catch (err) {
      setJobMatchingCandidatesError(err.response?.data?.message || "No Matching Results Found")
    }
    finally {
      setJobMatchingCandidatesLoading(false)
    }
  }


  /* FETCH RECRUITER INTERVIEWS */

  const fetchRecruiterInterviews = async () => {
    try {
      setInterviewsLoading(true);
      setInterviewsError("");
      setInterviewStatusMessage("");
      setInterviewStatusError("");

      const token = localStorage.getItem("token");

      const response = await axios.get(
        "http://localhost:4000/interviews/recruiter",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setRecruiterInterviews(response.data.interviews || []);
    } catch (err) {
      setInterviewsError(
        err.response?.data?.message || "Unable to fetch interviews"
      );
    } finally {
      setInterviewsLoading(false);
    }
  };


  /* UPDATE INTERVIEW STATUS */

  const updateInterviewStatus = async (interviewId, status) => {
    try {
      setInterviewStatusLoading(interviewId);
      setInterviewStatusMessage("");
      setInterviewStatusError("");

      const token = localStorage.getItem("token");

      const response = await axios.put(
        `http://localhost:4000/interviews/${interviewId}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setInterviewStatusMessage(response.data.message || "Interview status updated");

      await fetchRecruiterInterviews();
    } catch (err) {
      setInterviewStatusError(
        err.response?.data?.message || "Unable to update interview status"
      );
    } finally {
      setInterviewStatusLoading(null);
    }
  };



  /*RECRUITER SCHEDULING INTERVIEWS*/


  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    console.log("1. Handler started");

    if (!selectedApplicant?.ApplicationID) {
      setScheduleInterviewError("Please select a valid applicant.");
      return;
    }

    if (!interviewForm.interviewDate) {
      setScheduleInterviewError("Please select an interview date and time.");
      return;
    }

    const selectedDate = new Date(interviewForm.interviewDate);

    if (Number.isNaN(selectedDate.getTime())) {
      setScheduleInterviewError("Please select a valid interview date and time.");
      return;
    }

    if (selectedDate <= new Date()) {
      setScheduleInterviewError("Interview date and time must be in the future.");
      return;
    }

    if (
      interviewForm.interviewMode === "Offline" &&
      !interviewForm.interviewLocation.trim()
    ) {
      setScheduleInterviewError("Please enter the interview location.");
      return;
    }

    setScheduleInterviewLoading(true);
    setScheduleInterviewError("");
    setScheduleInterviewMessage("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setScheduleInterviewError("Your session has expired. Please log in again.");
        return;
      }

      const payload = {
        applicationId: Number(selectedApplicant.ApplicationID),
        interviewDate: interviewForm.interviewDate,
        interviewMode: interviewForm.interviewMode,
        interviewLocation:
          interviewForm.interviewMode === "Offline"
            ? interviewForm.interviewLocation.trim()
            : null,
        notes: interviewForm.notes.trim() || null,
      };
      console.log("2. Sending interview request", payload);
      const response = await axios.post(
        "http://localhost:4000/interviews",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("3. API response", response.data);
      setScheduleInterviewMessage(
        response.data?.message || "Interview scheduled successfully."
      );
      console.log("4. Refreshing interviews");
      await fetchRecruiterInterviews();
      await fetchApplicants();

      setShowInterviewForm(false);
      setSelectedApplicant(null);
      console.log("5. Closing interview form");
      setInterviewForm({
        interviewDate: "",
        interviewMode: "Online",
        interviewLocation: "",
        notes: "",
      });
    } catch (error) {
      console.log("API ERROR:", error);
      setScheduleInterviewError(
        error.response?.data?.message ||
        (error.request
          ? "No response from server. Please check whether the backend is running."
          : "Failed to schedule interview.")
      );
    } finally {
      setScheduleInterviewLoading(false);
    }
  };

  return (
    <div className="recruiter-dashboard">

      <aside className="recruiter-sidebar">
        {/* <div className="recruiter-logo">
          JOB <span>NEXA</span>
        </div> */}

        <div className="recruiter-menu">
          <p className="menu-heading">MAIN MENU</p>

          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`recruiter-menu-item ${activeSection === item.name ? 'active' : ''
                }`}
              onClick={() => {
                if (item.name === 'Post a Job' && !selectedJobId) {
                  handleCancelEdit()
                }

                setActiveSection(item.name)
              }}
            >
              <span className="menu-icon">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </div>

      </aside>

      <main className="recruiter-main">
        <header className="recruiter-header">
          <div>
            <h2>{activeSection}</h2>
          </div>
        </header>

        {activeSection === 'Dashboard' && (
          <section className="recruiter-content">
            {dashboardLoading && <p>Loading dashboard...</p>}
            {dashboardError && <p>{dashboardError}</p>}

            <div className="recruiter-stats">
              <div className="recruiter-stats-card">
                <h3>Total Jobs</h3>
                <p>{totalJobs}</p>
              </div>

              <div className="recruiter-stats-card">
                <h3>Total Applications</h3>
                <p>{totalApplications}</p>
              </div>

              <div className="recruiter-stats-card">
                <h3>Total Applied</h3>
                <p>{totalApplied}</p>
              </div>

              <div className="recruiter-stats-card">
                <h3>Total Shortlisted</h3>
                <p>{totalShortlisted}</p>
              </div>

              <div className="recruiter-stats-card">
                <h3>Total Rejected</h3>
                <p>{totalRejected}</p>
              </div>
            </div>
          </section>
        )}

        {activeSection === 'My Jobs' && (
          <div className="my-jobs-section">

            {recruiterJobsLoading && <p>Loading...</p>}
            {recruiterJobError && <p>{recruiterJobError}</p>}

            {!recruiterJobsLoading &&
              !recruiterJobError &&
              recruiterJobs.length === 0 && (
                <p>No jobs found. Start by posting your first job!</p>
              )}
            {deleteJobSuccess && <p>{deleteJobSuccess}</p>}
            {deleteJobError && <p>{deleteJobError}</p>}
            {!recruiterJobsLoading &&
              !recruiterJobError &&
              recruiterJobs.length > 0 && (

                <div className="my-jobs-table-container">
                  <table className="my-jobs-table">
                    <thead>
                      <tr>
                        <th>Job Title</th>
                        <th>Applications</th>
                        <th>Total Applied</th>
                        <th>Total Shortlisted</th>
                        <th>Total Rejected</th>
                        <th>Actions</th>
                        <th>Skills</th>
                        <th>Delete</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recruiterJobs.map((job) => (
                        <tr key={job.JobID}>
                          <td>{job.JobTitle}</td>
                          <td>{job.TotalApplications}</td>
                          <td>{job.TotalApplied}</td>
                          <td>{job.TotalShortlisted}</td>
                          <td>{job.TotalRejected}</td>
                          <td>
                            <button
                              type="button"
                              className='job-edit-btn'
                              onClick={() => handleEditJob(job.JobID)}
                            >
                              Edit
                            </button>
                          </td>
                          <td>
                            <button
                              type="button"
                              className='view-skills-btn'
                              onClick={() => {

                                handleViewSkills(job.JobID, job.JobTitle);
                              }}
                            >
                              View Skills
                            </button>
                          </td>
                          <td><button type='button'
                            className='job-delete-btn'
                            onClick={() => handleDeleteJob(job.JobID)}
                          >Delete</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        )}

        {activeSection === 'Post Jobs' && (
          <div className="post-job-card">
            <div className="post-job-header">
              <h3>
                {selectedJobId
                  ? 'Edit your job opening'
                  : 'Add a new job opening for your company'}
              </h3>
            </div>

            {jobDetailsError && <p>{jobDetailsError}</p>}
            {jobFormError && <p>{jobFormError}</p>}
            {jobFormMessage && <p>{jobFormMessage}</p>}

            <form className="post-job-form" onSubmit={handlePost}>
              <label htmlFor="jobTitle">Job Title :</label>
              <input
                id="jobTitle"
                type="text"
                value={jobForm.jobTitle}
                onChange={(e) =>
                  setJobForm({ ...jobForm, jobTitle: e.target.value })
                }
              />

              <label htmlFor="description">Description :</label>
              <textarea
                id="description"
                value={jobForm.description}
                onChange={(e) =>
                  setJobForm({ ...jobForm, description: e.target.value })
                }
              />

              <label htmlFor="location">Location :</label>
              <input
                id="location"
                type="text"
                value={jobForm.location}
                onChange={(e) =>
                  setJobForm({ ...jobForm, location: e.target.value })
                }
              />

              <label htmlFor="salaryMin">SalaryMin :</label>
              <input
                id="salaryMin"
                type="number"
                value={jobForm.salaryMin}
                onChange={(e) =>
                  setJobForm({ ...jobForm, salaryMin: e.target.value })
                }
              />

              <label htmlFor="salaryMax">SalaryMax :</label>
              <input
                id="salaryMax"
                type="number"
                value={jobForm.salaryMax}
                onChange={(e) =>
                  setJobForm({ ...jobForm, salaryMax: e.target.value })
                }
              />

              <label htmlFor="experienceRequired">
                Experience Required :
              </label>
              <input
                id="experienceRequired"
                type="number"
                value={jobForm.experienceRequired}
                onChange={(e) =>
                  setJobForm({
                    ...jobForm,
                    experienceRequired: e.target.value
                  })
                }
              />

              <label htmlFor="jobType">Job Type :</label>
              <select
                id="jobType"
                value={jobForm.jobType}
                onChange={(e) =>
                  setJobForm({ ...jobForm, jobType: e.target.value })
                }
              >
                <option value="">Select Job Type</option>
                <option value="Full-time">Full-Time</option>
                <option value="Part-time">Part-Time</option>
                <option value="Internship">Internship</option>
              </select>

              <label htmlFor="skillsRequired">Skills Required :</label>
              <input
                id="skillsRequired"
                type="text"
                value={jobForm.skillsRequired}
                onChange={(e) =>
                  setJobForm({ ...jobForm, skillsRequired: e.target.value })
                }
              />

              <button type="submit" disabled={jobFormLoading}>
                {jobFormLoading
                  ? 'Saving...'
                  : selectedJobId
                    ? 'Update Job'
                    : 'Post Job'}
              </button>

              {selectedJobId && (
                <button
                  type="button"
                  onClick={() => {
                    handleCancelEdit()
                    setActiveSection('My Jobs')
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </form>
          </div>
        )}

        {activeSection === "Find Candidates" && (
          <section className="find-candidates-section">
            <div className="find-candidates-header">
            </div>

            {/* Side-by-side candidate search sections */}
            <div className="candidate-search-grid">

              {/* LEFT SECTION: Find Candidates by Skills */}
              <section className="candidate-search-panel">
                <div className="find-candidates-header">
                  <h2>Find Candidates by Skills</h2>
                  <p>
                    Select a skill to find candidates who have it in their profile.
                  </p>
                </div>

                {/* Skill dropdown */}
                <div className="candidate-skills-search">
                  <label htmlFor="candidateSkill">Select a Skill</label>

                  <select
                    id="candidateSkill"
                    value={selectedCandidateSkill}
                    onChange={(e) => {
                      const skillId = e.target.value;

                      setSelectedCandidateSkill(skillId);
                      setMatchingCandidates([]);
                      setCandidateSkillsError("");

                      if (skillId) {
                        fetchMatchingCandidates(skillId);
                      }
                    }}
                  >
                    <option value="">-- Select a Skill --</option>

                    {availableSkills.map((skill) => (
                      <option key={skill.SkillID} value={skill.SkillID}>
                        {skill.SkillName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Skill search loading */}
                {availableSkillsLoading && (
                  <p className="candidate-search-message">
                    Loading available skills...
                  </p>
                )}

                {candidateSkillsLoading && (
                  <p className="candidate-search-message">
                    Searching candidates...
                  </p>
                )}

                {/* Skill search error */}
                {candidateSkillsError && (
                  <p className="candidate-search-message candidate-search-error">
                    {candidateSkillsError}
                  </p>
                )}

                {/* Skill search empty result */}
                {!candidateSkillsLoading &&
                  !candidateSkillsError &&
                  selectedCandidateSkill &&
                  matchingCandidates.length === 0 && (
                    <p className="candidate-search-message candidate-search-empty">
                      No matching candidates found.
                    </p>
                  )}

                {/* Skill search candidate cards */}
                {!candidateSkillsLoading && matchingCandidates.length > 0 && (
                  <div className="matching-candidates-list">
                    {matchingCandidates.map((candidate, index) => (
                      <article
                        className="matching-candidate-card"
                        key={
                          candidate.CandidateID ||
                          candidate.Email ||
                          index
                        }
                      >
                        <div className="candidate-card-header">
                          <h3>{candidate.Name}</h3>
                        </div>

                        <div className="candidate-details">
                          <p>
                            <strong>Email:</strong>
                            <span>{candidate.Email}</span>
                          </p>

                          <p>
                            <strong>Phone:</strong>
                            <span>{candidate.Phone || "Not provided"}</span>
                          </p>

                          <p>
                            <strong>Location:</strong>
                            <span>{candidate.Location || "Not provided"}</span>
                          </p>
                        </div>

                        <div className="candidate-resume">
                          {candidate.CandidateID ? (
                            <button
                              type="button"
                              className="view-resume-btn"
                              onClick={() =>
                                viewResume(candidate.CandidateID)
                              }
                            >
                              View Resume
                            </button>
                          ) : (
                            <span className="resume-not-available">
                              Resume not available
                            </span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              {/* RIGHT SECTION: Find Candidates by Job Skills */}
              <section className="candidate-search-panel">
                <div className="find-candidates-header">
                  <h2>Find Candidates by Job Skills</h2>
                  <p>
                    Select one of your jobs to find candidates who have its required
                    skills.
                  </p>
                </div>

                {/* Job dropdown */}
                <div className="job-skills-search">
                  <label htmlFor="matchingJob">Select Job</label>

                  <select
                    id="matchingJob"
                    value={selectedMatchingJob}
                    onChange={(e) => {
                      const jobId = e.target.value;

                      setSelectedMatchingJob(jobId);
                      setJobMatchingCandidates([]);
                      setJobMatchingCandidatesError("");

                      if (jobId) {
                        fetchJobMatchingCandidates(jobId);
                      }
                    }}
                  >
                    <option value="">-- Select a Job --</option>

                    {recruiterJobs.map((job) => (
                      <option key={job.JobID} value={job.JobID}>
                        {job.JobTitle}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Job skills search loading */}
                {jobMatchingCandidatesLoading && (
                  <p className="candidate-search-message">
                    Finding matching candidates...
                  </p>
                )}

                {/* Job skills search error */}
                {jobMatchingCandidatesError && (
                  <p className="candidate-search-message candidate-search-error">
                    {jobMatchingCandidatesError}
                  </p>
                )}

                {/* Job skills search empty result */}
                {!jobMatchingCandidatesLoading &&
                  selectedMatchingJob &&
                  jobMatchingCandidates.length === 0 &&
                  !jobMatchingCandidatesError && (
                    <p className="candidate-search-message candidate-search-empty">
                      No matching candidates found for this job.
                    </p>
                  )}

                {/* Job skills search candidate cards */}
                {!jobMatchingCandidatesLoading &&
                  jobMatchingCandidates.length > 0 && (
                    <div className="matching-candidates-list">
                      {jobMatchingCandidates.map((candidate, index) => (
                        <article
                          className="matching-candidate-card"
                          key={
                            candidate.CandidateID ||
                            candidate.Email ||
                            index
                          }
                        >
                          <div className="candidate-card-header">
                            <h3>{candidate.Name}</h3>
                          </div>

                          <div className="candidate-details">
                            <p>
                              <strong>Email:</strong>
                              <span>{candidate.Email}</span>
                            </p>

                            <p>
                              <strong>Phone:</strong>
                              <span>{candidate.Phone || "Not provided"}</span>
                            </p>

                            <p>
                              <strong>Location:</strong>
                              <span>{candidate.Location || "Not provided"}</span>
                            </p>
                          </div>

                          <div className="candidate-resume">
                            {candidate.CandidateID ? (
                              <button
                                type="button"
                                className="view-resume-btn"
                                onClick={() =>
                                  viewResume(candidate.CandidateID)
                                }
                              >
                                View Resume
                              </button>
                            ) : (
                              <span className="resume-not-available">
                                Resume not available
                              </span>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
              </section>

            </div>
          </section>
        )}



        {activeSection === 'Applicants' && (
          <div className="applicants-section">

            {applicantsLoading && (
              <p className="applicants-message">Loading Applicants...</p>
            )}

            {applicantsError && (
              <p className="applicants-message applicants-error">
                {applicantsError}
              </p>
            )}

            {!applicantsLoading && !applicantsError && applicants.length === 0 && (
              <p className="applicants-message applicants-empty">
                No Applicants
              </p>
            )}

            {!applicantsLoading && !applicantsError && applicants.length > 0 && (
              <div className="applicants-list">
                {applicants.map((app) => (
                  <div className="applicant-card" key={app.ApplicationID}>
                    <p><strong>JobID:</strong> {app.JobID}</p>
                    <p><strong>Application ID:</strong> {app.ApplicationID}</p>
                    <p><strong>Candidate ID:</strong> {app.CandidateID}</p>
                    <p><strong>Name:</strong> {app.Name}</p>
                    <p><strong>Email:</strong> {app.Email}</p>
                    <p><strong>Phone:</strong> {app.Phone}</p>
                    <p><strong>Job Title:</strong> {app.JobTitle}</p>
                    <p><strong>Application Date:</strong> {new Date(app.ApplicationDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    <p>
                      <strong>Status:</strong>{' '}
                      <span className={`applicant-status ${app.Status?.toLowerCase()}`}>
                        {app.Status}
                      </span>
                    </p>


                    <div className="applicant-actions">
                      <button
                        type="button"
                        className="view-resume-btn"
                        onClick={() => viewResume(app.CandidateID)}
                      >
                        View Resume
                      </button>

                      <button
                        type="button"
                        className="shortlist-btn"
                        onClick={() =>
                          updateApplicationStatus(app.JobID, app.CandidateID, 'shortlist')
                        }
                      >
                        Shortlist
                      </button>

                      <button
                        type="button"
                        className="reject-btn"
                        onClick={() =>
                          updateApplicationStatus(app.JobID, app.CandidateID, 'reject')
                        }
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={scheduleInterviewLoading}
                        className="schedule-interview-btn"
                        onClick={() => {
                          console.log("Schedule Interview clicked");
                          setSelectedApplicant(app);
                          setShowInterviewForm(true);
                          setScheduleInterviewError("");
                          setScheduleInterviewMessage("");
                        }}
                      >
                        {scheduleInterviewLoading ? "Scheduling..." : "Schedule Interview"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {showInterviewForm && selectedApplicant && (
          <div className="interview-form-overlay">
            <div className="interview-form-card">
              <h2>Schedule Interview</h2>

              <p>
                <strong>Candidate:</strong> {selectedApplicant.Name}
              </p>

              <p>
                <strong>Job:</strong> {selectedApplicant.JobTitle}
              </p>

              {scheduleInterviewError && (
                <p className="interview-form-error">
                  {scheduleInterviewError}
                </p>
              )}

              {scheduleInterviewMessage && (
                <p className="interview-form-success">
                  {scheduleInterviewMessage}
                </p>
              )}
          
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  console.log("FORM SUBMITTED");
                  handleScheduleInterview(e);
                }}
              >
                <label htmlFor="interviewDate">Interview Date & Time</label>
                <input
                  id="interviewDate"
                  type="datetime-local"
                  value={interviewForm.interviewDate}
                  onChange={(e) =>
                    setInterviewForm({
                      ...interviewForm,
                      interviewDate: e.target.value
                    })
                  }
                  required
                />

                <label htmlFor="interviewMode">Interview Mode</label>
                <select
                  id="interviewMode"
                  value={interviewForm.interviewMode}
                  onChange={(e) =>
                    setInterviewForm({
                      ...interviewForm,
                      interviewMode: e.target.value,
                      interviewLocation: ""
                    })
                  }
                  required
                >
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                </select>

                {interviewForm.interviewMode === "Offline" && (
                  <>
                    <label htmlFor="interviewLocation">Interview Location</label>
                    <input
                      id="interviewLocation"
                      type="text"
                      value={interviewForm.interviewLocation}
                      onChange={(e) =>
                        setInterviewForm({
                          ...interviewForm,
                          interviewLocation: e.target.value
                        })
                      }
                      required
                    />
                  </>
                )}

                <label htmlFor="interviewNotes">Notes</label>
                <textarea
                  id="interviewNotes"
                  value={interviewForm.notes}
                  onChange={(e) =>
                    setInterviewForm({
                      ...interviewForm,
                      notes: e.target.value
                    })
                  }
                />

                <div className="interview-form-actions">
                  <button type="submit" disabled={scheduleInterviewLoading}>
                    {scheduleInterviewLoading ? "Scheduling..." : "Schedule Interview"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowInterviewForm(false);
                      setSelectedApplicant(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


        {showSkillsModal && (
          <div
            className="skills-modal-overlay"
            onClick={() => {
              setShowSkillsModal(false);
              setShowAvailableSkills(false);
            }}
          >
            <div
              className="skills-modal"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="skills-modal-header">
                <h2>{selectedSkillsJobs?.JobTitle} Skills</h2>

                <button
                  type="button"
                  className="skills-modal-close-btn"
                  onClick={() => {
                    setShowSkillsModal(false);
                    setShowAvailableSkills(false);
                  }}
                >
                  ×
                </button>
              </div>

              {/* Error Message */}
              {jobSkillsError && (
                <p className="skills-error-message">
                  {jobSkillsError}
                </p>
              )}

              {/* Existing Job Skills */}
              <div className="job-skills-list">
                {skillsLoading ? (
                  <p>Loading job skills...</p>
                ) : jobSkills.length === 0 ? (
                  <p>No skills added for this job yet.</p>
                ) : (
                  jobSkills.map((skill) => (
                    <span
                      key={skill.SkillID}
                      className="job-skill-item"
                    >
                      <span>{skill.SkillName}</span>

                      <button
                        type="button"
                        className="delete-job-skill-btn"
                        title={`Remove ${skill.SkillName}`}
                        disabled={deletingSkillId === skill.SkillID}
                        onClick={() => handleDeleteSkill(skill.SkillID)}
                      >
                        {deletingSkillId === skill.SkillID ? "…" : "×"}
                      </button>
                    </span>
                  ))
                )}

                {/* Plus Button — visible even when there are no skills */}
                <button
                  type="button"
                  className="add-skill-icon-btn"
                  title="Add skill"
                  onClick={async () => {
                    setJobSkillsError("");
                    setShowAvailableSkills(true);
                    await fetchAvailableSkills();
                  }}
                >
                  + Add Skills
                </button>
              </div>

              {/* Available Skills Picker */}
              {showAvailableSkills && (
                <div className="available-skills-picker">
                  <h3>Select a skill to add</h3>

                  {availableSkillsLoading ? (
                    <p>Loading available skills...</p>
                  ) : availableSkills.length === 0 ? (
                    <p>No available skills found.</p>
                  ) : (
                    <div className="available-skills-list">
                      {availableSkills
                        .filter(
                          (availableSkill) =>
                            !jobSkills.some(
                              (jobSkill) =>
                                jobSkill.SkillID === availableSkill.SkillID
                            )
                        )
                        .map((skill) => (
                          <button
                            key={skill.SkillID}
                            type="button"
                            className="available-skill-btn"
                            disabled={addingSkillId === skill.SkillID}
                            onClick={() => handleAddSkill(skill.SkillID)}
                          >
                            {addingSkillId === skill.SkillID
                              ? "Adding..."
                              : skill.SkillName}
                          </button>
                        ))}
                    </div>
                  )}

                  <button
                    type="button"
                    className="close-skills-picker-btn"
                    onClick={() => setShowAvailableSkills(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Modal Footer */}
              <button
                type="button"
                className="skills-modal-footer-close"
                onClick={() => {
                  setShowSkillsModal(false);
                  setShowAvailableSkills(false);
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}


        {/* RECRUITER INTERVIEWS */}

        {activeSection === "Interviews" && (
          <section className="recruiter-interviews-section">
            <div className="interviews-header">
              <h2>Scheduled Interviews</h2>
            </div>

            {interviewsLoading && (
              <p className="interviews-message">Loading interviews...</p>
            )}

            {interviewsError && (
              <p className="interviews-message interviews-error">
                {interviewsError}
              </p>
            )}

            {interviewStatusMessage && (
              <p className="interviews-message interviews-success">
                {interviewStatusMessage}
              </p>
            )}

            {interviewStatusError && (
              <p className="interviews-message interviews-error">
                {interviewStatusError}
              </p>
            )}

            {!interviewsLoading &&
              !interviewsError &&
              recruiterInterviews.length === 0 && (
                <p className="interviews-message interviews-empty">
                  No interviews scheduled yet.
                </p>
              )}

            {!interviewsLoading && recruiterInterviews.length > 0 && (
              <div className="recruiter-interviews-list">
                {recruiterInterviews.map((interview) => (
                  <article
                    className="recruiter-interview-card"
                    key={interview.InterviewID}
                  >
                    <div className="recruiter-interview-card-header">
                      <div>
                        <h3>{interview.CandidateName}</h3>
                        <p className="interview-job-title">
                          {interview.JobTitle}
                        </p>
                      </div>

                      <span
                        className={`interview-status ${interview.Status?.toLowerCase()}`}
                      >
                        {interview.Status}
                      </span>
                    </div>

                    <div className="recruiter-interview-details">
                      <p>
                        <strong>Email:</strong>
                        <span>{interview.CandidateEmail || "Not provided"}</span>
                      </p>

                      <p>
                        <strong>Phone:</strong>
                        <span>{interview.CandidatePhone || "Not provided"}</span>
                      </p>

                      <p>
                        <strong>Date & Time:</strong>
                        <span>
                          {interview.InterviewDate
                            ? new Date(interview.InterviewDate).toLocaleString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                            : "Not provided"}
                        </span>
                      </p>

                      <p>
                        <strong>Mode:</strong>
                        <span>{interview.InterviewMode}</span>
                      </p>

                      {interview.InterviewLocation && (
                        <p>
                          <strong>Location:</strong>
                          <span>{interview.InterviewLocation}</span>
                        </p>
                      )}

                      {interview.Notes && (
                        <p>
                          <strong>Notes:</strong>
                          <span>{interview.Notes}</span>
                        </p>
                      )}
                    </div>

                    <div className="interview-status-actions">
                      <label htmlFor={`interviewStatus-${interview.InterviewID}`}>
                        Update Status
                      </label>

                      <select
                        id={`interviewStatus-${interview.InterviewID}`}
                        value={interview.Status}
                        disabled={
                          interviewStatusLoading === interview.InterviewID ||
                          interview.Status === "Completed" ||
                          interview.Status === "Cancelled"
                        }
                        onChange={(e) =>
                          updateInterviewStatus(
                            interview.InterviewID,
                            e.target.value
                          )
                        }
                      >
                        <option value="Scheduled" disabled>
                          Scheduled
                        </option>

                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>

                      {interviewStatusLoading === interview.InterviewID && (
                        <span>Updating...</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default RecruiterDashboard