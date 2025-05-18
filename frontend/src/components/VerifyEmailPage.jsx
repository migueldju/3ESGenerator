import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Header from './Header';
import '../styles/AuthPages.css';
import '../styles/VerifyEmail.css';

const VerifyEmailPage = () => {
  const [verificationStatus, setVerificationStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const { token } = useParams();
  const navigate = useNavigate();

  const verifyEmail = useCallback(async () => {
    try {
      if (!token) {
        setVerificationStatus('error');
        setMessage('No verification token provided. Please check your email link.');
        setDebugInfo('No token found in URL');
        return;
      }
      
      const url = `/api/verify-email/${token}`;
      console.log(`Making verification request to: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      console.log("Response status:", response.status);
            let data = {};
      try {
        const text = await response.text();
        console.log("Raw response:", text);
        
        if (text) {
          data = JSON.parse(text);
          console.log("Parsed response data:", data);
        }
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
      }
    
      if (response.ok) {
        setVerificationStatus('success');
        setMessage(data.message || 'Email verified successfully. You can now log in to your account.');
      } else {
        setVerificationStatus('error');
        setMessage(data.message || 'Invalid or expired verification token.');
        setDebugInfo(`Status: ${response.status}, Token: ${token.substring(0, 8)}...`);
      }
    } catch (error) {
      console.error('Error verifying email:', error);
      setVerificationStatus('error');
      setMessage('An error occurred while verifying your email. Please try again later.');
      setDebugInfo(`Error: ${error.message}`);
    }
  }, [token]);

  useEffect(() => {
    verifyEmail();
  }, [verifyEmail]);

  const handleContinue = () => {
    navigate('/login');
  };

  const handleRequestNewVerification = async () => {
    try {
      const response = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        navigate('/login', { 
          state: { 
            message: 'A new verification email has been sent. Please check your inbox.' 
          } 
        });
      } else {
        navigate('/login', { 
          state: { 
            message: data.message || 'Unable to send a new verification email. Please use the "Forgot Password" option or contact support.' 
          } 
        });
      }
    } catch (error) {
      navigate('/login', { 
        state: { 
          message: 'If you need a new verification email, please use the "Forgot Password" option or contact support.' 
        } 
      });
    }
  };

  return (
    <div className="app-container">
      <Header />
      <div className="auth-container">
        <div className="auth-card">
          <h2>Email Verification</h2>
          
          {verificationStatus === 'loading' && (
            <div className="verification-loading">
              <p>Verifying your email address...</p>
              <div className="loading-spinner"></div>
            </div>
          )}
          
          {verificationStatus === 'success' && (
            <div className="verification-success">
              <div className="verification-icon success">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64">
                  <circle cx="12" cy="12" r="10" fill="#2ecc71" />
                  <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" />
                </svg>
              </div>
              <p className="verification-message">{message}</p>
              <button 
                className="auth-button"
                onClick={handleContinue}
              >
                Continue to Login
              </button>
            </div>
          )}
          
          {verificationStatus === 'error' && (
            <div className="verification-error">
              <div className="verification-icon error">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64">
                  <circle cx="12" cy="12" r="10" fill="#e74c3c" />
                  <path d="M15 9l-6 6M9 9l6 6" stroke="#fff" strokeWidth="2" />
                </svg>
              </div>
              <p className="verification-message">{message}</p>
              {debugInfo && (
                <div className="debug-info">
                  <p>Debug info: {debugInfo}</p>
                </div>
              )}
              <div className="verification-actions">
                <button 
                  className="auth-button"
                  onClick={handleRequestNewVerification}
                >
                  Request New Verification
                </button>
                <button 
                  className="auth-button secondary-button"
                  onClick={() => navigate('/login')}
                >
                  Return to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;