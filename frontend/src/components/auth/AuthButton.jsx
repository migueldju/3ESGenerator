// frontend/src/components/auth/AuthButton.jsx
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import ForgotPasswordModal from './ForgotPasswordModal';
import '../../styles/AuthModals.css';

const AuthButton = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const openLoginModal = () => {
    setShowLoginModal(true);
    setShowRegisterModal(false);
    setShowForgotPasswordModal(false);
  };

  const openRegisterModal = () => {
    setShowRegisterModal(true);
    setShowLoginModal(false);
    setShowForgotPasswordModal(false);
  };

  const openForgotPasswordModal = () => {
    setShowForgotPasswordModal(true);
    setShowLoginModal(false);
    setShowRegisterModal(false);
  };

  const closeAllModals = () => {
    setShowLoginModal(false);
    setShowRegisterModal(false);
    setShowForgotPasswordModal(false);
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
  };

  return (
    <div className="auth-container">
      {isAuthenticated ? (
        <div className="user-menu">
          <button className="user-button" onClick={toggleDropdown}>
            {user?.username || 'User'}
          </button>
          {showDropdown && (
            <div className="user-dropdown">
              <button className="dropdown-item" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="auth-buttons">
          <button className="login-button" onClick={openLoginModal}>
            Log In
          </button>
          <button className="register-button" onClick={openRegisterModal}>
            Register
          </button>
        </div>
      )}

      {showLoginModal && (
        <LoginModal
          onClose={closeAllModals}
          switchToRegister={openRegisterModal}
          switchToForgotPassword={openForgotPasswordModal}
        />
      )}

      {showRegisterModal && (
        <RegisterModal
          onClose={closeAllModals}
          switchToLogin={openLoginModal}
        />
      )}

      {showForgotPasswordModal && (
        <ForgotPasswordModal
          onClose={closeAllModals}
          switchToLogin={openLoginModal}
        />
      )}
    </div>
  );
};

export default AuthButton;