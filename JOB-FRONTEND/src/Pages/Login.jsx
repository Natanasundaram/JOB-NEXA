
import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'
import './Login.css'

const Login = (props) => {

    const [password, setPassword] = useState("")
    const [email, setEmail] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()
        setError("")
        setSuccess("")

        if (password.trim() === "" || email.trim() === "") {
            setError('Missing Email or Password')
            return
        }

        const atIndex = email.indexOf('@')
        const dotIndex = email.indexOf('.', atIndex)

        if (
            atIndex <= 0 ||
            dotIndex <= atIndex + 1 ||
            dotIndex === email.length - 1
        ) {
            setError('Invalid Email')
            return
        }

        try {
            const response = await axios.post(
                'http://localhost:4000/login',
                {
                    email: email,
                    password: password
                }
            )

            localStorage.setItem('token', response.data.token)
            localStorage.setItem('user', JSON.stringify(response.data.user))

            setSuccess(response.data.message)
            props.setIsLoggedIn(true)

            navigate('/')

        } catch (err) {
            if (err.response) {
                setError(err.response.data.message || 'Login Failed')
            } else {
                setError('Unable to Connect the Server')
            }
        }
    }

    return (
        <div className="login-page">

            <div className="login-card">

                <div className="login-visual-panel">

                    <div className="visual-shape shape-one"></div>
                    <div className="visual-shape shape-two"></div>
                    <div className="visual-shape shape-three"></div>
                    <div className="visual-shape shape-four"></div>
                    <div className="visual-shape shape-five"></div>

                    <div className="visual-content">

                        <span className="visual-badge">
                            YOUR CAREER JOURNEY
                        </span>

                        <h1>
                            Your Career.
                            <br />
                            Your Next Chapter.
                        </h1>

                        <p>
                            Discover opportunities, connect with leading
                            employers, and take the next step in your
                            professional journey.
                        </p>

                        <div className="visual-stat">

                            <div className="stat-icon">
                                ✦
                            </div>

                            <div>
                                <strong>
                                    Find Your Perfect Opportunity
                                </strong>

                                <span>
                                    Your dream job is closer than you think.
                                </span>
                            </div>

                        </div>

                    </div>

                    <div className="visual-bottom">
                        <span>Discover. Connect. Grow.</span>
                        <span className="visual-dot"></span>
                    </div>

                </div>

                <div className="login-form-panel">

                    <div className="login-brand">
                        <span className="brand-icon">J</span>
                        <span>JOB NEXA</span>
                    </div>

                    <div className="login-header">

                        <h2>Welcome Back!</h2>

                        <p className="login-subtitle">
                            Sign in to your JOB NEXA account
                        </p>

                    </div>

                    {success && (
                        <p className="login-success">{success}</p>
                    )}

                    <form onSubmit={handleLogin} className="login-form">

                        <div className="login-input-group">

                            <label htmlFor="login-email">
                                Email Address
                            </label>

                            <input
                                id="login-email"
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />

                        </div>

                        <div className="login-input-group">

                            <label htmlFor="login-password">
                                Password
                            </label>

                            <input
                                id="login-password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />

                        </div>

                        <button type="submit" className="login-button">
                            Log In
                            <span>→</span>
                        </button>

                    </form>

                    {error && (
                        <p className="login-error">{error}</p>
                    )}

                    <p className="login-register">
                        Don't have an account?
                        <Link to="/register"> Create Account</Link>
                    </p>

                    <p className="login-footer">
                        © 2026 JOB NEXA. All rights reserved.
                    </p>

                </div>

            </div>

        </div>
    )
}

export default Login
