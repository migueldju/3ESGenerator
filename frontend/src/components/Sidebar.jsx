// frontend/src/components/Sidebar.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faComments, 
  faFile, 
  faSignOutAlt, 
  faTimes, 
  faBars,
  faTrash,
  faUser
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { useConversations } from '../context/ConversationContext';
import { useDocuments } from '../context/DocumentContext';
import '../styles/Sidebar.css';

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState('conversations');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  const { user, logout } = useAuth();
  const { 
    conversations, 
    currentConversation, 
    fetchConversation, 
    createNewConversation,
    deleteConversation
  } = useConversations();
  
  const { 
    documents, 
    currentDocument, 
    fetchDocument,
    createDocument,
    deleteDocument
  } = useDocuments();
  
  const navigate = useNavigate();

  // Close sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [window.location.pathname]);

  const handleNewConversation = () => {
    // Prompt for company description
    const companyDesc = prompt('Please provide a description of your company:');
    if (companyDesc && companyDesc.trim()) {
      createNewConversation(companyDesc.trim())
        .then(conversation => {
          if (conversation) {
            navigate('/');
          }
        });
    }
  };

  const handleNewDocument = () => {
    const name = prompt('Enter a name for the new document:');
    if (name && name.trim()) {
      createDocument(name.trim())
        .then(document => {
          if (document) {
            navigate('/editor');
          }
        });
    }
  };

  const handleConversationClick = (conversationId) => {
    fetchConversation(conversationId)
      .then(() => {
        navigate('/');
        setIsMobileSidebarOpen(false);
      });
  };

  const handleDocumentClick = (documentId) => {
    fetchDocument(documentId)
      .then(() => {
        navigate('/editor');
        setIsMobileSidebarOpen(false);
      });
  };

  const handleDeleteConversation = (e, conversationId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      deleteConversation(conversationId);
    }
  };

  const handleDeleteDocument = (e, documentId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this document?')) {
      deleteDocument(documentId);
    }
  };

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      navigate('/login');
    }
  };

  const toggleSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const toggleUserDropdown = () => {
    setShowUserDropdown(!showUserDropdown);
  };

  // Format date to display in sidebar
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // If user is not logged in, don't render the sidebar
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Mobile Hamburger Menu */}
      <div className="mobile-menu-toggle" onClick={toggleSidebar}>
        <FontAwesomeIcon icon={isMobileSidebarOpen ? faTimes : faBars} />
      </div>
      
      {/* Sidebar */}
      <div className={`sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>ESGenerator</h2>
          <div className="user-profile" onClick={toggleUserDropdown}>
            <FontAwesomeIcon icon={faUser} />
            <span>{user.username}</span>
            {showUserDropdown && (
              <div className="user-dropdown">
                <div className="dropdown-item" onClick={handleLogout}>
                  <FontAwesomeIcon icon={faSignOutAlt} />
                  <span>Logout</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="sidebar-tabs">
          <div 
            className={`tab ${activeTab === 'conversations' ? 'active' : ''}`}
            onClick={() => setActiveTab('conversations')}
          >
            <FontAwesomeIcon icon={faComments} />
            <span>Conversations</span>
          </div>
          <div 
            className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <FontAwesomeIcon icon={faFile} />
            <span>Documents</span>
          </div>
        </div>
        
        <div className="sidebar-content">
          {activeTab === 'conversations' && (
            <div className="conversations-list">
              <button className="new-button" onClick={handleNewConversation}>
                <FontAwesomeIcon icon={faPlus} />
                <span>New Conversation</span>
              </button>
              
              {conversations.length === 0 ? (
                <div className="empty-state">
                  <p>No conversations yet</p>
                </div>
              ) : (
                conversations.map(conversation => (
                  <div 
                    key={conversation.id}
                    className={`list-item ${currentConversation && currentConversation.id === conversation.id ? 'active' : ''}`}
                    onClick={() => handleConversationClick(conversation.id)}
                  >
                    <div className="item-details">
                      <h4>{conversation.title}</h4>
                      <span className="item-date">{formatDate(conversation.updated_at)}</span>
                    </div>
                    <button 
                      className="delete-button"
                      onClick={(e) => handleDeleteConversation(e, conversation.id)}
                      title="Delete conversation"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
          
          {activeTab === 'documents' && (
            <div className="documents-list">
              <button className="new-button" onClick={handleNewDocument}>
                <FontAwesomeIcon icon={faPlus} />
                <span>New Document</span>
              </button>
              
              {documents.length === 0 ? (
                <div className="empty-state">
                  <p>No documents yet</p>
                </div>
              ) : (
                documents.map(document => (
                  <div 
                    key={document.id}
                    className={`list-item ${currentDocument && currentDocument.id === document.id ? 'active' : ''}`}
                    onClick={() => handleDocumentClick(document.id)}
                  >
                    <div className="item-details">
                      <h4>{document.name}</h4>
                      <span className="item-date">{formatDate(document.updated_at)}</span>
                    </div>
                    <button 
                      className="delete-button"
                      onClick={(e) => handleDeleteDocument(e, document.id)}
                      title="Delete document"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        
        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <FontAwesomeIcon icon={faSignOutAlt} />
            <span>Logout</span>
          </button>
        </div>
      </div>
      
      {/* Overlay for mobile */}
      {isMobileSidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}
    </>
  );
};

export default Sidebar;