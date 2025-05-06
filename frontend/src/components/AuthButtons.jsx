// frontend/src/components/AuthButtons.jsx

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
      console.log('AuthButtons checking login status...');
      const response = await fetch('/api/check-auth', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('AuthButtons auth status:', data);
        setIsLoggedIn(data.isAuthenticated);
        if (data.isAuthenticated) {
          setUsername(data.username);
        }
      } else {
        console.error('Auth check failed:', response.status);
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error checking authentication status:', error);
      setIsLoggedIn(false);
    }
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  useEffect(() => {
    // Verificar el estado de autenticación cuando cambia la ruta
    checkLoginStatus();
  }, [location]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setIsLoggedIn(false);
        setUsername('');
        setDropdownOpen(false);
        navigate('/');
        window.location.reload();
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
              <Link to="/profile" className="dropdown-item">
                <FontAwesomeIcon icon={faUser} /> My Profile
              </Link>
              <button 
                className="dropdown-item logout-button"
                onClick={handleLogout}
              >
                <FontAwesomeIcon icon={faSignOutAlt} /> Logout
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