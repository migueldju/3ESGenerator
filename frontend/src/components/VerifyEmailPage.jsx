import { useState, useEffect } from 'react';
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

  useEffect(() => {
    console.log("Verification token from URL:", token);
    
    const verifyEmail = async () => {
      try {
        console.log(`Making verification request to: /api/verify-email/${token}`);
        
        // First, check if the token is in the URL
        if (!token) {
          setVerificationStatus('error');
          setMessage('No verification token provided. Please check your email link.');
          return;
        }
        
        const response = await fetch(`/api/verify-email/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log("Response status:", response.status);
        
        // Read the response body as text first
        const responseText = await response.text();
        console.log("Raw response:", responseText);
        
        let data = {};
        try {
          // Only try to parse as JSON if it's not empty and likely valid JSON
          if (responseText && (responseText.startsWith('{') || responseText.startsWith('['))) {
            data = JSON.parse(responseText);
          }
          console.log("Parsed response data:", data);
        } catch (parseError) {
          console.error("Error parsing JSON response:", parseError);
          setDebugInfo(`Response status: ${response.status}, could not parse JSON`);
          // Don't fail verification just because of JSON parsing errors
        }
        
        // Compare the status code to determine success/failure
        // Any 2xx status code is considered a success
        if (response.status >= 200 && response.status < 300) {
          setVerificationStatus('success');
          setMessage(data.message || 'Email verified successfully. You can now log in to your account.');
        } else {
          setVerificationStatus('error');
          setMessage(data.message || 'Invalid or expired verification token. Please request a new verification email.');
          setDebugInfo(`Server response: ${responseText}`);
        }
      } catch (error) {
        console.error('Error verifying email:', error);
        
        // Network errors should be treated differently than response parsing errors
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          setVerificationStatus('error');
          setMessage('Unable to connect to the verification service. Please check your internet connection and try again.');
          setDebugInfo(`Network error: ${error.message}`);
        } else if (error.message.includes('SyntaxError') || error.message.includes('Unexpected token')) {
          // Handle non-JSON responses that might still indicate success
          // Often, successful redirects or HTML responses can trigger this
          setVerificationStatus('success');
          setMessage('Your email has been verified successfully. You can now log in to your account.');
          setDebugInfo(`Note: There was a response parsing issue, but your verification appears to have succeeded.`);
        } else {
          setVerificationStatus('error');
          setMessage('An error occurred while verifying your email. Please try again later.');
          setDebugInfo(`Error: ${error.message}`);
        }
      }
    };

    verifyEmail();
  }, [token]);

  const handleContinue = () => {
    navigate('/login');
  };

  const handleRequestNewVerification = async () => {
    try {
      // Make an actual API call to request a new verification email
      const response = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token }) // Send the expired token to help identify the user
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
      // If the API call fails, fall back to the original behavior
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
                  {token && <p>Token: {token.substring(0, 8)}...{token.substring(token.length - 8)}</p>}
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