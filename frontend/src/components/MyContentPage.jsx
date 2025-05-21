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
      if (activeTab === 'conversations') {
        await fetchConversations();
      } else if (activeTab === 'documents') {
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
      setConversations(data);
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
    
    if (tab === 'conversations' && conversations.length === 0) {
      try {
        setIsLoading(true);
        await fetchConversations();
      } catch (error) {
        setError('Failed to load conversations. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else if (tab === 'documents' && documents.length === 0) {
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
    setIsLoading(true);
    const response = await fetch(`/api/chat/load_conversation/${id}`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to load conversation');
    }
    
    const data = await response.json();
    
    // Verificar explícitamente que hay mensajes en la respuesta
    if (data.success) {
      console.log("Conversation loaded successfully. Messages:", 
        data.conversation.messages ? data.conversation.messages.length : 0);
      
      // Guardar en localStorage un indicador de que se acaba de cargar una conversación
      // para que chatView sepa que debe forzar una recarga
      localStorage.setItem('just_loaded_conversation', 'true');
      localStorage.setItem('loaded_conversation_id', id.toString());
      localStorage.setItem('loaded_conversation_timestamp', Date.now().toString());
      
      // Navegar a la página principal
      navigate('/');
    } else {
      throw new Error(data.error || 'Failed to load conversation');
    }
  } catch (error) {
    console.error('Error loading conversation:', error);
    setError('Failed to load conversation. Please try again.');
    setIsLoading(false);
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
      const endpoint = type === 'conversation' ? `/api/user/conversation/${id}` : `/api/user/document/${id}`;
      
      const response = await fetch(endpoint, {
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="app-container">
      <Header />
      <div className="main-content">
        <div className="container">
          <div className="nav-container">
            <button 
              className="nav-button inactive" 
              onClick={() => navigate('/')}
            >
              Chat
            </button>
            <button 
              className="nav-button inactive" 
              onClick={() => navigate('/editor')}
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
                              <h3>{conversation.title || `Conversation ${formatDate(conversation.created_at)}`}</h3>
                              <div className="item-details">
                                <div className="company-description-container">
                                  <span className="detail-label">Company description:</span>
                                  <span className="detail-content">{conversation.company_description || 'No description available'}</span>
                                </div>
                                <div className="additional-details">
                                  <span className="detail">NACE Sector: {conversation.nace_sector || 'Not specified'}</span>
                                  <span className="detail">ESRS Sector: {conversation.esrs_sector || 'Not specified'}</span>
                                  <span className="detail">Messages: {conversation.answer_count || 0}</span>
                                  <span className="detail">Created: {formatDate(conversation.created_at)}</span>
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
                                <span className="detail">Created: {formatDate(document.created_at)}</span>
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