import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'
import {
    FiBriefcase,
    FiUser,
    FiMail,
    FiLock,
    FiPhone,
    FiMapPin,
    FiUsers,
    FiArrowUpRight
} from 'react-icons/fi'
import './Register.css'

const Register = () => {
    const navigate = useNavigate()

    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [phone, setPhone] = useState("")
    const [role, setRole] = useState('')
    const [location, setLocation] = useState("")
    const [companyName, setCompanyName] = useState("")
    const [companyDescription, setCompanyDescription] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const handleRegister = async (e) => {
        e.preventDefault()
        setError("")
        setSuccess("")

        if (
            name.trim() === "" ||
            email.trim() === "" ||
            password.trim() === "" ||
            phone.trim() === ""
        ) {
            setError('Please fill all required fields')
            return
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        if (role === '') {
            setError('Please select a role')
            return
        }

        if (role === 'Candidate' && location.trim() === "") {
            setError('Please enter your location')
            return
        }

        if (
            role === 'Recruiter' &&
            (companyName.trim() === "" || companyDescription.trim() === "")
        ) {
            setError('Please enter company name and company description')
            return
        }

        if (!/^[6-9]\d{9}$/.test(phone)) {
            setError('Phone number must contain 10 digits and start with 6, 7, 8, or 9')
            return
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        if (!emailPattern.test(email)) {
            setError('Invalid email')
            return
        }

        try {
            const response = await axios.post(
                'http://localhost:4000/register',
                {
                    name,
                    email,
                    password,
                    phone,
                    role,
                    location,
                    companyName,
                    companyDescription
                }
            )

            setSuccess(response.data.message)
            navigate('/login')
        } catch (err) {
            if (err.response) {
                setError(err.response.data.message || 'Registration failed')
            } else {
                setError('Unable to connect to server')
            }
        }
    }

    return (
        <div className="register-page">
            <div className="register-card">

                <section className="register-visual-panel">
                    <div className="register-visual-background"></div>
                    <div className="register-visual-glow"></div>
                    <div className="register-grid"></div>

                    <div className="register-floating-shape register-shape-one"></div>
                    <div className="register-floating-shape register-shape-two"></div>
                    <div className="register-floating-shape register-shape-three"></div>
                    <div className="register-floating-shape register-shape-four"></div>
                    <div className="register-floating-shape register-shape-five"></div>

                    <div className="register-visual-content">
                        <div className="register-visual-brand">
                            <div className="register-brand-icon">
                                <FiBriefcase />
                            </div>

                            <span>
                                JOB <strong>NEXA</strong>
                            </span>
                        </div>

                        <div className="register-visual-badge">
                            <span className="register-badge-dot"></span>
                            YOUR CAREER JOURNEY STARTS HERE
                        </div>

                        <h2>
                            Build your future.
                            <span>Find your next opportunity.</span>
                        </h2>

                        <p>
                            Create your profile, connect with leading companies,
                            and discover opportunities that move your career forward.
                        </p>

                        <div className="register-visual-features">
                            <div className="register-feature">
                                <div className="register-feature-icon">
                                    <FiBriefcase />
                                </div>

                                <div>
                                    <strong>Discover Opportunities</strong>
                                    <span>Find roles that match your skills</span>
                                </div>
                            </div>

                            <div className="register-feature">
                                <div className="register-feature-icon">
                                    <FiUsers />
                                </div>

                                <div>
                                    <strong>Connect with Employers</strong>
                                    <span>Build connections that matter</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="register-3d-card">
                        <div className="career-card-top">
                            <div className="career-card-logo">
                                <FiBriefcase />
                            </div>

                            <span className="career-card-status">
                                CAREER OPPORTUNITY
                            </span>
                        </div>

                        <div className="career-card-content">
                            <span className="career-card-label">
                                YOUR NEXT CHAPTER
                            </span>

                            <div className="career-card-title">
                                <span className="career-line career-line-one"></span>
                                <span className="career-line career-line-two"></span>
                                <span className="career-line career-line-three"></span>
                            </div>
                        </div>

                        <div className="career-card-bottom">
                            <div className="career-avatar">JN</div>

                            <div className="career-card-text">
                                <strong>Your next role</strong>
                                <span>is waiting for you</span>
                            </div>

                            <div className="career-card-arrow">
                                <FiArrowUpRight />
                            </div>
                        </div>
                    </div>

                    <div className="register-visual-footer">
                        <span>JOB NEXA</span>
                        <span>Make your next move count.</span>
                    </div>
                </section>

                <section className="register-form-panel">
                    <div className="register-form-inner">

                        <div className="register-form-brand">
                            <div className="register-brand-icon">
                                <FiBriefcase />
                            </div>

                            <span>
                                JOB <strong>NEXA</strong>
                            </span>
                        </div>

                        <div className="register-heading">
                            <h1>Create Account</h1>
                            <p>Join JOB NEXA and explore new opportunities.</p>
                        </div>

                        <form onSubmit={handleRegister} className="register-form">

                            <div className="register-input-group">
                                <label htmlFor="register-name">Full Name</label>

                                <div className="register-input-wrapper">
                                    <FiUser className="register-input-icon" />

                                    <input
                                        id="register-name"
                                        type="text"
                                        placeholder="Enter your full name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="register-input-group">
                                <label htmlFor="register-email">Email Address</label>

                                <div className="register-input-wrapper">
                                    <FiMail className="register-input-icon" />

                                    <input
                                        id="register-email"
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="register-input-group">
                                <label htmlFor="register-password">Password</label>

                                <div className="register-input-wrapper">
                                    <FiLock className="register-input-icon" />

                                    <input
                                        id="register-password"
                                        type="password"
                                        placeholder="Create a password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="register-input-group">
                                <label htmlFor="register-phone">Mobile Number</label>

                                <div className="register-input-wrapper">
                                    <FiPhone className="register-input-icon" />

                                    <input
                                        id="register-phone"
                                        type="tel"
                                        placeholder="Enter your mobile number"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="register-input-group">
                                <label htmlFor="register-role">Account Type</label>

                                <div className="register-input-wrapper register-select-wrapper">
                                    <FiUsers className="register-input-icon" />

                                    <select
                                        id="register-role"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                    >
                                        <option value="">Select your role</option>
                                        <option value="Candidate">Candidate</option>
                                        <option value="Recruiter">Recruiter</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>
                            </div>

                            {role === 'Candidate' && (
                                <div className="register-input-group">
                                    <label htmlFor="register-location">Location</label>

                                    <div className="register-input-wrapper">
                                        <FiMapPin className="register-input-icon" />

                                        <input
                                            id="register-location"
                                            type="text"
                                            placeholder="Enter your location"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {role === 'Recruiter' && (
                                <>
                                    <div className="register-input-group">
                                        <label htmlFor="register-company">
                                            Company Name
                                        </label>

                                        <div className="register-input-wrapper">
                                            <FiBriefcase className="register-input-icon" />

                                            <input
                                                id="register-company"
                                                type="text"
                                                placeholder="Enter company name"
                                                value={companyName}
                                                onChange={(e) => setCompanyName(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="register-input-group">
                                        <label htmlFor="register-description">
                                            Company Description
                                        </label>

                                        <textarea
                                            id="register-description"
                                            placeholder="Tell us about your company"
                                            value={companyDescription}
                                            onChange={(e) => setCompanyDescription(e.target.value)}
                                            rows="3"
                                        />
                                    </div>
                                </>
                            )}

                            {error && (
                                <p className="register-error">{error}</p>
                            )}

                            {success && (
                                <p className="register-success">{success}</p>
                            )}

                            <button type="submit" className="register-button">
                                Create Account
                            </button>
                        </form>

                        <p className="register-login-link">
                            Already have an account? <Link to="/login">Log In</Link>
                        </p>

                    </div>
                </section>

            </div>
        </div>
    )
}

export default Register