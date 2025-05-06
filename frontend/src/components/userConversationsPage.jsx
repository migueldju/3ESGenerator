import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faFile, faTrash, faEye, faSpinner } from '@fortawesome/free-solid-svg-icons';
import Header from './Header';
import '../styles/UserConversationsPage.css';

const UserConversationsPage = () => {
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
      // Fetch conversations first
      await fetchConversations();
      
      // Then fetch documents
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
      
      // Process the conversation titles to include date in DD-MM-YYYY format
      const processedData = data.map(conversation => {
        // Check if the title already contains a date in the required format
        const dateRegex = /\d{2}-\d{2}-\d{4}/;
        if (!dateRegex.test(conversation.title)) {
          // Extract date from created_at (ISO format)
          const createdDate = new Date(conversation.created_at);
          const day = String(createdDate.getDate()).padStart(2, '0');
          const month = String(createdDate.getMonth() + 1).padStart(2, '0');
          const year = createdDate.getFullYear();
          
          // Update the title to include the date
          conversation.title = `${conversation.title} (${day}-${month}-${year})`;
        }
        return conversation;
      });
      
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
    
    // If switching to documents tab and we haven't loaded them yet
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
      
      // Redirect to chat page
      navigate('/');
    } catch (error) {
      console.error('Error loading conversation:', error);
      setError('Failed to load conversation. Please try again.');
    }
  };

  const handleLoadDocument = (id) => {
    // Navigate to editor with document ID
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
      
      // Remove the deleted item from state
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
    return date.toLocaleDateString();
  };

  return (
    <div className="app-container">
      <Header />
      <div className="content-container">
        <div className="user-content-container">
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
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
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
                      <div key={conversation.id} className="