import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import '../styles/AuthPages.css';
import '../styles/UserProfilePage.css';

const UserProfilePage = () => {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const csrfResponse = await fetch('/api/get-csrf-token', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (csrfResponse.ok) {
          const csrfData = await csrfResponse.json();
          setCsrfToken(csrfData.csrf_token);
        }

        // Fetch user data
        const response = await fetch('/api/user/profile', {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data);
          setNewUsername(data.username);
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setErrorMessage('Error loading profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleUsernameChange = (e) => {
    setNewUsername(e.target.value);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSaveUsername = async () => {
    if (!newUsername.trim()) {
      setErrorMessage('Username cannot be empty');
      return;
    }

    if (newUsername.length < 3) {
      setErrorMessage('Username must be at least 3 characters');
      return;
    }

    if (newUsername === userData.username) {
      setErrorMessage('Username is the same as current');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username: newUsername,
          csrf_token: csrfToken 
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        setUserData({ ...userData, username: newUsername });
        setSuccessMessage('Username updated successfully');
        setIsEditing(false);
      } else {
        setErrorMessage(data.message || 'Failed to update username');
      }
    } catch (error) {
      console.error('Error updating username:', error);
      setErrorMessage('Error updating username. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        // Account deleted successfully
        setIsDeleted(true);
        setSuccessMessage('Your account has been successfully deleted.');
        
        // Wait a moment to show the message before redirecting
        setTimeout(() => {
          navigate('/login', { 
            state: { message: 'Your account has been successfully deleted.' }
          });
        }, 3000);
      } else {
        const data = await response.json();
        setErrorMessage(data.message || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setErrorMessage('Error deleting account. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="app-container">
        <Header />
        <div className="profile-container">
          <div className="profile-card">
            <div className="loading">Loading profile...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!userData || isDeleted) {
    return (
      <div className="app-container">
        <Header />
        <div className="profile-container">
          <div className="profile-card">
            {isDeleted && (
              <div className="delete-success-message">
                <h2>Account Deleted</h2>
                <p>{successMessage}</p>
                <p>You will be redirected to the login page shortly...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header />
      <div className="profile-container">
        <div className="profile-card">
          <h2>My Profile</h2>
          
          {successMessage && (
            <div className="auth-success-message">
              {successMessage}
            </div>
          )}
          
          {errorMessage && (
            <div className="auth-error-message">
              {errorMessage}
            </div>
          )}

          <div className="profile-section">
            <h3>Profile Information</h3>
            
            <div className="profile-field">
              <label>Email</label>
              <div className="value">{userData.email}</div>
            </div>

            <div className="profile-field">
              <label>Username</label>
              {isEditing ? (
                <div className="username-edit">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={handleUsernameChange}
                    className="profile-input"
                    placeholder="Enter new username"
                  />
                  <div className="edit-actions">
                    <button 
                      className="save-button"
                      onClick={handleSaveUsername}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      className="cancel-button"
                      onClick={() => {
                        setIsEditing(false);
                        setNewUsername(userData.username);
                        setErrorMessage('');
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="username-display">
                  <span className="value">{userData.username}</span>
                  <button 
                    className="edit-button"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            <div className="profile-field">
              <label>Member since</label>
              <div className="value">
                {new Date(userData.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="danger-zone">
            <h3>Danger Zone</h3>
            <p>Once you delete your account, there is no going back. Please be certain.</p>
            
            {!showDeleteConfirm ? (
              <button 
                className="delete-button"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Account
              </button>
            ) : (
              <div className="delete-confirm">
                <p className="delete-warning">
                  Are you absolutely sure? This action cannot be undone.
                </p>
                <div className="delete-actions">
                  <button 
                    className="confirm-delete-button"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
                  </button>
                  <button 
                    className="cancel-delete-button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;