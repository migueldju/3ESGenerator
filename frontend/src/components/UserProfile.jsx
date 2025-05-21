import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import '../styles/userProfile.css';

const UserProfile = () => {
  const { user, logout } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserDocuments();
  }, []);

  const fetchUserDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/get_documents', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        throw new Error('Failed to fetch documents');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to load your documents. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNavigate = (path) => {
    navigate(path);
  };
  
  return (
    <div className="profile-container">
      <div className="nav-container">
        <button 
          className="nav-button inactive" 
          onClick={() => handleNavigate('/')}
        >
          Chat
        </button>
        <button 
          className="nav-button inactive" 
          onClick={() => handleNavigate('/editor')}
        >
          Editor
        </button>
        <button className="nav-button active">Profile</button>
      </div>
      
      <div className="profile-header">
        <h1>User Profile</h1>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="profile-content">
        <div className="user-info-card">
          <h2>Account Details</h2>
          <div className="user-details">
            <p><strong>Username:</strong> {user.username}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Account created:</strong> {new Date(user.created_at || Date.now()).toLocaleDateString()}</p>
          </div>
          <button 
            className="danger-button" 
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
        
        <div className="documents-card">
          <h2>Your Documents</h2>
          
          {isLoading ? (
            <div className="loading-spinner">Loading...</div>
          ) : documents.length === 0 ? (
            <div className="no-documents">
              <p>You haven't created any documents yet.</p>
              <button 
                className="primary-button"
                onClick={() => handleNavigate('/editor')}
              >
                Create New Document
              </button>
            </div>
          ) : (
            <>
              <div className="documents-list">
                {documents.map(doc => (
                  <div key={doc.id} className="document-item">
                    <div className="document-info">
                      <h3>{doc.name}</h3>
                      <p>Last updated: {new Date(doc.updated_at).toLocaleString()}</p>
                    </div>
                    <div className="document-actions">
                      <button 
                        className="icon-button" 
                        onClick={() => viewDocument(doc.id)}
                        title="Edit document"
                      >
                        ✏️
                      </button>
                      <button 
                        className="icon-button danger" 
                        onClick={() => deleteDocument(doc.id)}
                        title="Delete document"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                className="primary-button"
                onClick={() => handleNavigate('/editor')}
              >
                Create New Document
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
  
  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to log out. Please try again.');
    }
  };
  
  const viewDocument = (documentId) => {
    navigate(`/editor?document=${documentId}`);
  };
  
  const deleteDocument = async (documentId) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        const response = await fetch(`/delete_document/${documentId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (response.ok) {
          // Remove from list
          setDocuments(prevDocs => 
            prevDocs.filter(doc => doc.id !== documentId)
          );
        } else {
          throw new Error('Failed to delete document');
        }
      } catch (error) {
        console.error('Error deleting document:', error);
        setError('Failed to delete document. Please try again.');
      }
    }
  };