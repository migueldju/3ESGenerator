// frontend/src/components/auth/LoginModal.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/AuthModals.css';

const LoginModal = ({ onClose, switchToRegister, switchToForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const { login } = useAuth();

  // Add keyboard event handling for Escape key
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);
    
    try {
      const success = await login(email, password);
      if (success) {
        onClose();
      } else {
        setErrorMessage('Invalid email or password');
      }
    } catch (error) {
      setErrorMessage(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="auth-modal" onClick={handleBackdropClick}>
      <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <h2>Log In</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="auth-modal-body">
          {errorMessage && <div className="auth-error-message">{errorMessage}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="auth-submit-button"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
          
          <div className="auth-links">
            <button className="text-button" onClick={switchToForgotPassword}>
              Forgot Password?
            </button>
            <button className="text-button" onClick={switchToRegister}>
              Don't have an account? Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;