import { useEffect, useState } from 'react';
import axios from 'axios';
import JobCard from '../Components/JobCard';
import './Jobs.css';

function Jobs() {
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [sortOrder, setSortOrder] = useState('default');

  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState('');

  const [jobType, setJobType] = useState('');
  const [experience, setExperience] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    location: '',
    jobType: '',
    experience: '',
    salaryMin: '',
    salaryMax: '',
  });

  const fetchJobs = async (filters) => {
    setJobsLoading(true);
    setJobsError('');

    try {
      const token = localStorage.getItem('token');

      const response = await axios.get(
        'http://localhost:4000/jobs',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            keyword: filters.search,
            location: filters.location,
            jobtype: filters.jobType,
            experience: filters.experience,
            salaryMin: filters.salaryMin,
            salaryMax: filters.salaryMax,
          },
        }
      );

      const fetchedJobs = response.data.Jobs;

      setJobs(Array.isArray(fetchedJobs) ? fetchedJobs : []);
    } catch (error) {
      if (error.response?.status === 404) {
        setJobs([]);
      } else {
        setJobsError(
          error.response?.data?.message || 'Unable to load jobs.'
        );
      }
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(appliedFilters);
  }, [appliedFilters]);

  const handleSearch = (event) => {
    event.preventDefault();

    setAppliedFilters({
      search,
      location,
      jobType,
      experience,
      salaryMin,
      salaryMax,
    });
  };

  const handleClearFilters = () => {
    setSearch('');
    setLocation('');
    setJobType('');
    setExperience('');
    setSalaryMin('');
    setSalaryMax('');

    setAppliedFilters({
      search: '',
      location: '',
      jobType: '',
      experience: '',
      salaryMin: '',
      salaryMax: '',
    });
  };

  const sortedJobs = [...jobs].sort((a, b) => {
    if (sortOrder === 'salary-high') {
      return (b.SalaryMax || 0) - (a.SalaryMax || 0);
    }

    if (sortOrder === 'salary-low') {
      return (a.SalaryMin || 0) - (b.SalaryMin || 0);
    }

    return 0;
  });

  return (
    <div className="jobs-page">
      <div className="jobs-container">

        {/* Page Header */}
        <header className="jobs-header">
          <h1>Explore Jobs</h1>
          <p>
            Discover opportunities that match your skills and career goals.
          </p>
        </header>

        {/* Search and Filters */}
        <form className="jobs-filter-form" onSubmit={handleSearch}>
          <div className="filter-grid">

            <div className="filter-field">
              <label htmlFor="job-search">Job title or keyword</label>
              <input
                id="job-search"
                type="text"
                placeholder="e.g. React Developer"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="filter-field">
              <label htmlFor="job-location">Location</label>
              <input
                id="job-location"
                type="text"
                placeholder="e.g. Chennai"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </div>

            <div className="filter-field">
              <label htmlFor="job-type">Job type</label>
              <select
                id="job-type"
                value={jobType}
                onChange={(event) => setJobType(event.target.value)}
              >
                <option value="">All Job Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="experience">Experience</label>
              <input
                id="experience"
                type="number"
                min="0"
                placeholder="Years"
                value={experience}
                onChange={(event) => setExperience(event.target.value)}
              />
            </div>

            <div className="filter-field">
              <label htmlFor="salary-min">Minimum salary</label>
              <input
                id="salary-min"
                type="number"
                min="0"
                placeholder="₹ Min"
                value={salaryMin}
                onChange={(event) => setSalaryMin(event.target.value)}
              />
            </div>

            <div className="filter-field">
              <label htmlFor="salary-max">Maximum salary</label>
              <input
                id="salary-max"
                type="number"
                min="0"
                placeholder="₹ Max"
                value={salaryMax}
                onChange={(event) => setSalaryMax(event.target.value)}
              />
            </div>

          </div>

          <div className="filter-actions">
            <button
              type="submit"
              className="search-button"
              disabled={jobsLoading}
            >
              {jobsLoading ? 'Searching...' : 'Search Jobs'}
            </button>

            <button
              type="button"
              className="clear-button"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          </div>
        </form>

        {/* Job Results */}
        <section className="jobs-results">

          <div className="jobs-results-header">
            <div>
              <h2>Available Opportunities</h2>
              <p className="jobs-count">
                {jobsLoading
                  ? 'Loading jobs...'
                  : `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'} found`}
              </p>
            </div>

            <div className="sort-field">
              <label htmlFor="sort-jobs">Sort by</label>
              <select
                id="sort-jobs"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              >
                <option value="default">Default order</option>
                <option value="salary-high">Highest salary</option>
                <option value="salary-low">Lowest salary</option>
              </select>
            </div>
          </div>

          {jobsLoading && (
            <div className="jobs-message">
              <div className="loading-spinner"></div>
              <p>Finding the best opportunities for you...</p>
            </div>
          )}

          {!jobsLoading && jobsError && (
            <div className="jobs-message error-message">
              <p>{jobsError}</p>
            </div>
          )}

          {!jobsLoading && !jobsError && sortedJobs.length === 0 && (
            <div className="jobs-message empty-message">
              <h3>No jobs found</h3>
              <p>Try changing your search criteria or clearing the filters.</p>
              <button
                type="button"
                className="clear-button"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            </div>
          )}

          {!jobsLoading && !jobsError && sortedJobs.length > 0 && (
            <div className="jobs-list">
              {sortedJobs.map((job) => (
                <div className="job-card-wrapper" key={job.JobID}>
                  <JobCard job={job} />
                </div>
              ))}
            </div>
          )}

        </section>
      </div>
    </div>
  );
}

export default Jobs;