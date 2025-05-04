import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import '../styles/AuthButtons.css';

const AuthButtons = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const checkLoginStatus = async () => {
    try {
      const response = await fetch('/api/check-auth', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsLoggedIn(data.isAuthenticated);
        if (data.isAuthenticated) {
          setUsername(data.username);
        }
      }
    } catch (error) {
      console.error('Error checking authentication status:', error);
    }
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  useEffect(() => {
    checkLoginStatus();
  }, [location]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        // En lugar de solo navegar, recargar la página completamente
        setIsLoggedIn(false);
        setUsername('');
        setDropdownOpen(false);
        
        // Navegar primero a la página principal
        navigate('/');
        
        // Luego recargar la página para limpiar todo el estado
        setTimeout(() => {
          window.location.reload();
        }, 100); // Pequeño retraso para asegurar que la navegación ocurra primero
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <div className="auth-buttons-container">
      {isLoggedIn ? (
        <div className="user-menu">
          <button 
            className="user-menu-button"
            onClick={toggleDropdown}
            aria-expanded={dropdownOpen}
          >
            <FontAwesomeIcon icon={faUser} />
            <span>{username}</span>
          </button>
          
          {dropdownOpen && (
            <div className="user-dropdown">
              <Link to="/profile" className="dropdown-item">My Profile</Link>
              <Link to="/my-reports" className="dropdown-item">My Reports</Link>
              <button 
                className="dropdown-item logout-button"
                onClick={handleLogout}
              >
                <FontAwesomeIcon icon={faSignOutAlt} />
                Logout
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="auth-links">
          <Link to="/login" className="auth-link login-link">Log In</Link>
          <Link to="/register" className="auth-link register-link">Register</Link>
        </div>
      )}
    </div>
  );
};

export default AuthButtons;