import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Header from './Header';
import '../styles/AuthPages.css';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state && location.state.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setSuccessMessage('');
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });
      
      // Handle both successful and failed JSON responses
      try {
        // Try to parse as JSON first
        const contentType = response.headers.get("content-type");
        let data = {};
        
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          const text = await response.text();
          console.log("Received non-JSON response:", text);
        }
        
        // Even if we get a 500 error, check if we're actually logged in
        // by making a request to check authentication status
        const authCheckResponse = await fetch('/api/check-auth', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (authCheckResponse.ok) {
          const authData = await authCheckResponse.json();
          
          if (authData.isAuthenticated) {
            // We're logged in despite the error, so redirect to home
            navigate('/');
            return;
          }
        }
        
        // If we're here, we're not logged in
        if (!response.ok) {
          // Check if this is due to email verification
          if (data.message && data.message.includes('verify your email')) {
            throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
          } else {
            throw new Error(data.message || 'Login failed');
          }
        }
        
        // Normal success path
        navigate('/');
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        throw new Error('Invalid credentials. Please try again.');
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoginError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsLoading(true);
    setLoginError('');
    setSuccessMessage('');
    
    try {
      const response = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: formData.email }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccessMessage('Verification email resent. Please check your inbox.');
      } else {
        throw new Error(data.message || 'Failed to resend verification email');
      }
    } catch (error) {
      console.error("Error resending verification:", error);
      setLoginError(error.message || 'Failed to resend verification email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Header />
      <div className="auth-container">
        <div className="auth-card">
          <h2>Log In</h2>
          <p className="auth-subtitle">Welcome back! Please login to your account.</p>
          
          {successMessage && (
            <div className="auth-success-message">
              {successMessage}
            </div>
          )}
          
          {loginError && (
            <div className="auth-error-message">
              {loginError}
              {loginError.includes('verify your email') && (
                <div className="resend-verification">
                  <button 
                    className="resend-link"
                    onClick={handleResendVerification}
                    disabled={isLoading}
                  >
                    Resend verification email
                  </button>
                </div>
              )}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className={errors.password ? 'error' : ''}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>
            
            <div className="auth-links">
              <Link to="/forgot-password" className="forgot-password">Forgot password?</Link>
            </div>
            
            <button 
              type="submit" 
              className="auth-button"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
          
          <div className="auth-footer">
            Don't have an account? <Link to="/register">Register now</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;