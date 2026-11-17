import React, { useState } from 'react';
import Navbar from './Components/Navbar';
import Jobs from './Pages/Jobs';
import Login from './Pages/Login';
import Home from './Pages/Home';
import Register from './Pages/Register';
import ProtectedRoutes from './Components/ProtectedRoutes';
import { Route, Routes, Navigate } from 'react-router-dom';
import './App.css';
import CandidateDashboard from './Components/CandidateDashboard';
import RecruiterDashboard from './Components/RecruiterDashboard';
import AdminDashboard from './Components/AdminDashboard';

const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(
        Boolean(localStorage.getItem('token'))
    );

    return (
        <>
            <Navbar
                isLoggedIn={isLoggedIn}
                setIsLoggedIn={setIsLoggedIn}
            />

            <Routes>
                <Route
                    path="/"
                    element={
                        isLoggedIn
                            ? <Home />
                            : <Navigate to="/login" replace />
                    }
                />

                <Route
                    path="/login"
                    element={
                        isLoggedIn
                            ? <Navigate to="/" replace />
                            : <Login
                                isLoggedIn={isLoggedIn}
                                setIsLoggedIn={setIsLoggedIn}
                            />
                    }
                />

                <Route
                    path="/register"
                    element={<Register />}
                />

                <Route
                    path="/jobs"
                    element={
                        <ProtectedRoutes
                            isLoggedIn={isLoggedIn}
                            allowedRole="Candidate"
                        >
                            <Jobs />
                        </ProtectedRoutes>
                    }
                />

                <Route
                    path="/candidate-dashboard"
                    element={
                        <ProtectedRoutes
                            isLoggedIn={isLoggedIn}
                            allowedRole="Candidate"
                        >
                            <CandidateDashboard />
                        </ProtectedRoutes>
                    }
                />

                <Route
                    path="/recruiter-dashboard"
                    element={
                        <ProtectedRoutes
                            isLoggedIn={isLoggedIn}
                            allowedRole="Recruiter"
                        >
                            <RecruiterDashboard />
                        </ProtectedRoutes>
                    }
                />
                <Route
                    path="/admin-dashboard"
                    element={
                        <ProtectedRoutes
                            isLoggedIn={isLoggedIn}
                            allowedRole="Admin"
                        >
                            <AdminDashboard />
                        </ProtectedRoutes>
                    }
                />
            </Routes>
        </>
    );
};

export default App;