// frontend/src/components/MyContentPage.jsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faFile, faTrash, faEye, faSpinner, faEdit } from '@fortawesome/free-solid-svg-icons';
import Header from './Header';
import '../styles/MyContentPage.css';

const MyContentPage = () => {
  const [activeTab, setActiveTab] = useState('conversations');
  const [conversations, setConversations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/check-auth', {
          credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.isAuthenticated) {
          navigate('/login');
        } else {
          // Load initial data
          fetchData();
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        navigate('/login');
      }
    };
    
    checkAuth();
  }, [navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await fetchConversations();
      
      if (activeTab === 'documents') {
        await fetchDocuments();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/user/conversations', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      
      const data = await response.json();
      
      const processedData = [];
      
      for (const conversation of data) {
        const createdDate = new Date(conversation.created_at);
        const day = String(createdDate.getDate()).padStart(2, '0');
        const month = String(createdDate.getMonth() + 1).padStart(2, '0');
        const year = createdDate.getFullYear();
        const hours = String(createdDate.getHours()).padStart(2, '0');
        const minutes = String(createdDate.getMinutes()).padStart(2, '0');
        
        conversation.displayTitle = conversation.title || `Conversation ${day}-${month}-${year} ${hours}:${minutes}`;
        
        try {
          const detailsResponse = await fetch(`/api/user/conversation/${conversation.id}`, {
            credentials: 'include'
          });
          
          if (detailsResponse.ok) {
            const details = await detailsResponse.json();
            conversation.answerCount = details.answers ? Math.floor(details.answers.length / 2) : 0;
          }
        } catch (error) {
          console.error(`Error fetching details for conversation ${conversation.id}:`, error);
          conversation.answerCount = 0;
        }
        
        processedData.push(conversation);
      }
      
      setConversations(processedData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/user/documents', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  };

  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    
    if (tab === 'documents' && documents.length === 0) {
      try {
        setIsLoading(true);
        await fetchDocuments();
      } catch (error) {
        setError('Failed to load documents. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLoadConversation = async (id) => {
    try {
      const response = await fetch(`/api/chat/load_conversation/${id}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }
      
      navigate('/');
    } catch (error) {
      console.error('Error loading conversation:', error);
      setError('Failed to load conversation. Please try again.');
    }
  };

  const handleLoadDocument = (id) => {
    navigate(`/editor?document=${id}`);
  };

  const confirmDelete = (type, id) => {
    setDeleteItem({ type, id });
  };

  const cancelDelete = () => {
    setDeleteItem(null);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    
    const { type, id } = deleteItem;
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/user/${type}/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete ${type}`);
      }
      
      if (type === 'document') {
        setDocuments(documents.filter(doc => doc.id !== id));
      } else if (type === 'conversation') {
        setConversations(conversations.filter(conv => conv.id !== id));
      }
      
      setDeleteItem(null);
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      setError(`Failed to delete ${type}. Please try again.`);
    } finally {
      setIsDeleting(false);
    }
  };

  const getCompanyDescription = (conversation) => {
    if (!conversation) return '';
    
    if (conversation.company_description && typeof conversation.company_description === 'string') {
      const desc = conversation.company_description.trim();
      if (desc.length === 0) return 'No description available';
      
      return desc.length > 150 ? desc.substring(0, 150).trim() + '...' : desc;
    }
    
    return 'No description available';
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="app-container">
      <Header />
      <div className="main-content">
        <div className="container">
          <div className="nav-container">
            <button 
              className="nav-button inactive" 
              onClick={() => handleNavigation('/')}
            >
              Chat
            </button>
            <button 
              className="nav-button inactive" 
              onClick={() => handleNavigation('/editor')}
            >
              Editor
            </button>
            <button className="nav-button active">
              My Content
            </button>
          </div>
          
          <div className="content-wrapper">
            <div className="my-content-header">
              <h2>My Content</h2>
              <div className="tabs">
                <button 
                  className={activeTab === 'conversations' ? 'active' : ''}
                  onClick={() => handleTabChange('conversations')}
                >
                  <FontAwesomeIcon icon={faComments} /> Conversations
                </button>
                <button 
                  className={activeTab === 'documents' ? 'active' : ''}
                  onClick={() => handleTabChange('documents')}
                >
                  <FontAwesomeIcon icon={faFile} /> Documents
                </button>
              </div>
            </div>
            
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            <div className="content-container">
              {isLoading ? (
                <div className="loading-spinner">
                  <FontAwesomeIcon icon={faSpinner} spin />
                  <span>Loading...</span>
                </div>
              ) : (
                <div className="items-container">
                  {activeTab === 'conversations' && (
                    conversations.length > 0 ? (
                      <div className="items-list">
                        {conversations.map(conversation => (
                          <div key={conversation.id} className="item-card">
                            <div className="item-info">
                              <h3>{conversation.displayTitle}</h3>
                              <div className="item-details">
                                <div className="company-description-container">
                                  <span className="detail-label">Company description:</span>
                                  <span className="detail-content">{getCompanyDescription(conversation)}</span>
                                </div>
                                <div className="additional-details">
                                  <span className="detail">NACE Sector: {conversation.nace_sector || 'Not specified'}</span>
                                  <span className="detail">Answers: {conversation.answerCount || 0}</span>
                                </div>
                              </div>
                            </div>
                            <div className="item-actions">
                              <button 
                                className="action-button view-button"
                                onClick={() => handleLoadConversation(conversation.id)}
                                title="Continue conversation"
                              >
                                <FontAwesomeIcon icon={faEye} />
                              </button>
                              <button 
                                className="action-button delete-button"
                                onClick={() => confirmDelete('conversation', conversation.id)}
                                title="Delete conversation"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <p>You don't have any saved conversations yet.</p>
                        <Link to="/" className="start-button">
                          Start a new conversation
                        </Link>
                      </div>
                    )
                  )}
                  
                  {activeTab === 'documents' && (
                    documents.length > 0 ? (
                      <div className="items-list">
                        {documents.map(document => (
                          <div key={document.id} className="item-card">
                            <div className="item-info">
                              <h3>{document.name}</h3>
                              <div className="item-details">
                                <span className="detail">Created: {new Date(document.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="item-actions">
                              <button 
                                className="action-button view-button"
                                onClick={() => handleLoadDocument(document.id)}
                                title="Edit document"
                              >
                                <FontAwesomeIcon icon={faEdit} />
                              </button>
                              <button 
                                className="action-button delete-button"
                                onClick={() => confirmDelete('document', document.id)}
                                title="Delete document"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <p>You don't have any saved documents yet.</p>
                        <Link to="/editor" className="start-button">
                          Create a new document
                        </Link>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
          
          {deleteItem && (
            <div className="delete-modal">
              <div className="delete-modal-content">
                <h3>Delete Confirmation</h3>
                <p>
                  Are you sure you want to delete this {deleteItem.type}? 
                  This action cannot be undone.
                </p>
                <div className="delete-modal-actions">
                  <button 
                    className="cancel-button"
                    onClick={cancelDelete}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button 
                    className="confirm-delete-button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin /> Deleting...
                      </>
                    ) : (
                      'Yes, Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyContentPage;