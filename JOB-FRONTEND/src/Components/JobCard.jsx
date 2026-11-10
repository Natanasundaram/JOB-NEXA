import React, { useState,useEffect } from 'react';
import '../Pages/Jobs.css';
import axios from 'axios';

const JobCard = ({ job }) => {
  const [applied, setApplied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState("")


  const handleApply = async () => {

    try {
      setApplying(true)
      setApplyError('')
      const token = localStorage.getItem('token')
      await axios.post('http://localhost:4000/applications',
        { jobId: job.JobID },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      setApplied(true);
      alert('Application Submitted');
    } catch (err) {
      setApplyError(err.response?.data?.message || 'Unable to Apply for the Job')
    } finally {
      setApplying(false)
    }

  };



useEffect(()=>{

  const checkApplication = async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await axios.get(
        'http://localhost:4000/applications/my',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const applications = response.data.application;

      const alreadyApplied = applications.some(
        (application) => application.JobID === job.JobID
      );

      if (alreadyApplied) {
        setApplied(true);
      }
    } catch (err) {
      console.error('Failed to check existing application:', err);
    }
  };

  checkApplication();
},[job.JobID])



  const formatSalary = () => {
    if (job.SalaryMin == null && job.SalaryMax == null) {
      return 'Not specified';
    }

    const min = job.SalaryMin
      ? `₹${Number(job.SalaryMin).toLocaleString('en-IN')}`
      : '';

    const max = job.SalaryMax
      ? `₹${Number(job.SalaryMax).toLocaleString('en-IN')}`
      : '';

    if (min && max) return `${min} - ${max}`;
    return min || max;
  };

  return (
    <div className="job-card">

      {/* Job Header */}
      <div className="job-card-header">
        <div className="job-title-section">
          <h3>{job.JobTitle}</h3>
          <p className="job-company">{job.CompanyName}</p>
        </div>

        {applied && (
          <span className="applied-badge">
            Applied
          </span>
        )}
      </div>

      {/* Job Information */}
      <div className="job-info">
        <p>
          <span className="job-info-label">Location</span>
          <span>{job.Location || 'Not specified'}</span>
        </p>

        {job.JobType && (
          <p>
            <span className="job-info-label">Job Type</span>
            <span>{job.JobType}</span>
          </p>
        )}
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="job-details">
          <div className="job-detail-item">
            <span className="job-info-label">Salary</span>
            <span>{formatSalary()}</span>
          </div>

          <div className="job-detail-item">
            <span className="job-info-label">Experience</span>
            <span>
              {job.ExperienceRequired != null
                ? `${job.ExperienceRequired} years`
                : 'Not specified'}
            </span>
          </div>
        </div>
      )}



      {/* Card Actions */}
{applied && (
  <p style={{ color: 'red', fontWeight: 'bold' }}>
    Already applied for this job.
  </p>
)}

      <div className="job-card-actions">
        <button
          className="apply-button"
          onClick={handleApply}
          disabled={applied || applying}
        >
          {applied ? 'Applied' : applying ? 'Applying...' : 'Apply Now'}
        </button>

        <button
          className="details-button"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Details' : 'View Details'}
        </button>
      </div>

    </div>
  );
};

export default JobCard;