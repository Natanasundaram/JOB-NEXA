import { Link, useNavigate } from "react-router-dom";
import { IoLogOut } from "react-icons/io5";
import "./Navbar.css";

const Navbar = (props) => {
    const navigate = useNavigate();

    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;

    const handlelogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        props.setIsLoggedIn(false);
        navigate("/login");
    };

    return (
        <nav className="app-navbar">

            {/* LOGO */}
            <div className="navbar-logo">
                <div className="brand-icon">
                    J
                </div>

                <h2>
                    JOB <span>NEXA</span>
                </h2>
            </div>

            {/* NAVIGATION LINKS */}
            <div className="navbar-links">

                <Link to="/" className="nav-link">
                    Home
                </Link>

                {/* CANDIDATE LINKS */}
                {user && user.role === "Candidate" && (
                    <>
                        <Link to="/jobs" className="nav-link">
                            Jobs
                        </Link>

                        <Link to="/candidate-dashboard" className="nav-link">
                            Dashboard
                        </Link>
                    </>
                )}

                {/* RECRUITER LINKS */}
                {user && user.role === "Recruiter" && (
                    <Link to="/recruiter-dashboard" className="nav-link">
                        Dashboard
                    </Link>
                )}

                {/* ADMIN LINKS */}
                {user && user.role === "Admin" && (
                    <Link to="/admin-dashboard" className="nav-link">
                        Admin Dashboard
                    </Link>
                )}

                {/* REGISTER LINK */}
                {!props.isLoggedIn && (
                    <Link to="/register" className="nav-link">
                        Register
                    </Link>
                )}

                {/* LOGIN / LOGOUT */}
                {props.isLoggedIn ? (
                    <button
                        onClick={handlelogout}
                        className="logout-btn"
                        title="Logout"
                        aria-label="Logout"
                    >
                        <IoLogOut />
                        <span>Logout</span>
                    </button>
                ) : (
                    <Link to="/login" className="login-btn">
                        Login
                    </Link>
                )}

            </div>
        </nav>
    );
};

export default Navbar;