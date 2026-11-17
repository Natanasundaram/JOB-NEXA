import React from 'react'
import { Navigate } from 'react-router-dom'

const ProtectedRoutes = ({ children, allowedRole }) => {
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    const user = storedUser ? JSON.parse(storedUser) : null

    if (!token || !user) {
        return <Navigate to="/login" replace />
    }

    if (user.role !== allowedRole) {
        return <Navigate to="/" replace />
    }

    return children
}

export default ProtectedRoutes