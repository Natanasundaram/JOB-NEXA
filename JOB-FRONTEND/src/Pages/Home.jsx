import React from 'react'
import { Link } from 'react-router-dom'
import { FiBriefcase, FiArrowUpRight } from 'react-icons/fi'
import './Home.css'

const Home = () => {
    const storedUser = localStorage.getItem('user')
    const user = storedUser ? JSON.parse(storedUser) : null

    const isCandidate = user?.role === 'Candidate'
    const isRecruiter = user?.role === 'Recruiter'

    return (
        <div className="home-page">

            <section className="home-hero">
                <div className="home-hero-content">

                    <div className="home-hero-brand">
                        <div className="brand-icon">
                            J
                        </div>

                        <span>
                            JOB <strong>NEXA</strong>
                        </span>
                    </div>

                    <div className="home-welcome">
                        {user?.name ? (
                            <h2>Welcome , {user.name}!</h2>
                        ) : (
                            <h2>Welcome to JOB NEXA!</h2>
                        )}

                        {isCandidate && (
                            <p>
                                Your next career opportunity is waiting.
                                Explore jobs and take the next step in your career.
                            </p>
                        )}

                        {isRecruiter && (
                            <p>
                                Find exceptional talent and build your dream team.
                                Your next great hire starts here.
                            </p>
                        )}

                        {!user && (
                            <p>
                                Discover meaningful careers and connect with
                                leading companies.
                            </p>
                        )}
                    </div>

                    <div className="home-hero-badge">
                        <span className="home-badge-dot"></span>
                        YOUR NEXT CAREER MOVE STARTS HERE
                    </div>

                    <h1>
                        {isRecruiter ? (
                            <>
                                Find the talent
                                <span>that moves you forward.</span>
                            </>
                        ) : (
                            <>
                                Connecting talent
                                <span>with opportunities.</span>
                            </>
                        )}
                    </h1>

                    <p className="home-hero-description">
                        {isRecruiter
                            ? 'Connect with skilled professionals, discover promising candidates, and make your next great hire with JOB NEXA.'
                            : 'Discover meaningful careers, connect with leading companies, and find the right opportunity to shape your future.'}
                    </p>

                    {isCandidate && (
                        <Link to="/jobs" className="home-hero-action">
                            Explore Jobs
                            <FiArrowUpRight />
                        </Link>
                    )}

                    {isRecruiter && (
                        <Link
                            to="/recruiter-dashboard"
                            className="home-hero-action"
                        >
                            Go to Recruiter Dashboard
                            <FiArrowUpRight />
                        </Link>
                    )}

                    {!user && (
                        <Link to="/jobs" className="home-hero-action">
                            Find a Job
                            <FiArrowUpRight />
                        </Link>
                    )}

                </div>

                <div className="home-hero-decoration home-decoration-one"></div>
                <div className="home-hero-decoration home-decoration-two"></div>
                <div className="home-hero-decoration home-decoration-three"></div>
            </section>

        </div>
    )
}

export default Home