// frontend/src/components/chatView.jsx

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faRedo, faFile, faHistory } from '@fortawesome/free-solid-svg-icons';
import Header from './Header';
import '../styles/chatView.css';

const ChatView = () => {
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      content: `<h2>Welcome to ESGenerator</h2>
                <p>Please provide a detailed description of your company's activities, products, services, and sector to help me determine the applicable ESRS reporting standards.</p>`,
      isWelcome: true
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    initialized: false,
    naceSector: 'Not classified yet',
    esrsSector: 'Not determined yet'
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const navigate = useNavigate();
  const isLoadingRef = useRef(false);

  const [placeholderText, setPlaceholder] = useState("Enter your company description...");
  const [companyDesc, setCompanyDesc] = useState('');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/check-auth', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsLoggedIn(data.isAuthenticated);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchConversation = async (conversationIdParam = null) => {
  if (isLoadingRef.current) return;
  isLoadingRef.current = true;
  
  try {
    if (conversationIdParam) {
      // Load specific conversation into session
      const loadResponse = await fetch(`/api/chat/load_conversation/${conversationIdParam}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!loadResponse.ok) {
        console.error('Failed to load conversation');
        return;
      }
    }
    
    // Get current session state (works for both new sessions and loaded conversations)
    const response = await fetch('/api/chat/get_conversation', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.initialized) {
        setCompanyInfo({
          initialized: true,
          naceSector: data.nace_sector,
          esrsSector: data.esrs_sector
        });
        setPlaceholder("Ask your question here...");
        setCompanyDesc(data.company_desc);
        
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
        
        if (data.conversation_id) {
          setConversationId(data.conversation_id);
        }
      }
    }
  } catch (error) {
    console.error('Error fetching conversation:', error);
  } finally {
    isLoadingRef.current = false;
  }
};

  useEffect(() => {
    fetchConversation();
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
  
    const userMessage = inputValue.trim();
    setInputValue('');
    
    const newMessages = [...messages, { type: 'user', content: userMessage }];
    setMessages(newMessages);
    
    setIsLoading(true);
  
    try {
      const formData = new FormData();
      formData.append('message', userMessage);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
  
      const data = await response.json();
  
      if (data.is_first_message) {
        setCompanyInfo({
          initialized: true,
          naceSector: data.nace_sector,
          esrsSector: data.esrs_sector
        });
        setCompanyDesc(userMessage);
        setPlaceholder("Ask your question here...");
      } 
  
      setMessages(prev => [...prev, { type: 'bot', content: data.answer }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        type: 'bot', 
        content: "I'm sorry, there was an error processing your request. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      const response = await fetch('/api/reset', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        setMessages([
          {
            type: 'bot',
            content: `<h2>Welcome to ESGenerator</h2>
                      <p>Please provide a detailed description of your company's activities, products, services, and sector to help me determine the applicable ESRS reporting standards.</p>`,
            isWelcome: true
          }
        ]);
        setInputValue('');
        setCompanyInfo({
          initialized: false,
          naceSector: 'Not classified yet',
          esrsSector: 'Not determined yet'
        });
        setPlaceholder("Enter your company description...");
        setCompanyDesc('');
      }
    } catch (error) {
      console.error('Error resetting chat:', error);
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <div className="app-container">
      <Header />
      <div className="main-content">
        <div className="container">
          <div className="nav-container">
            <button className="nav-button active">Chat</button>
            <button 
              className="nav-button inactive" 
              onClick={() => handleNavigate('/editor')}
            >
            Editor
            </button>
            {isLoggedIn && (
              <button 
                className="nav-button inactive" 
                onClick={() => handleNavigate('/my-content')}
              >
            My Content
              </button>
            )}
          </div>
          
          {companyInfo.initialized && (
            <div className="sub-header">
              <div className="sector-info">
                <div className="sector-box">
                  <h3>NACE Sector:</h3>
                  <p>{companyInfo.naceSector}</p>
                </div>
                <div className="sector-box">
                  <h3>Sector-specific Standards:</h3>
                  <p>{companyInfo.esrsSector}</p>
                </div>
                <button 
                  className="reset-button" 
                  title="Start new conversation"
                  onClick={handleReset}
                >
                  <FontAwesomeIcon icon={faRedo} /> New Chat
                </button>
              </div>
            </div>
          )}
          
          <div className="chat-container" ref={chatContainerRef}>
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.type}-message ${message.isWelcome ? 'welcome-message' : ''}`}
                dangerouslySetInnerHTML={{ __html: message.content }}
              />
            ))}
            
            {isLoading && (
              <div className="message bot-message loading">
                <div className="loading-dots">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            )}
          </div>
          
          <div className="input-container">
            <textarea
              ref={textareaRef}
              id="user-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={placeholderText}
              rows="1"
            />
            <button 
              id="send-button"
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
            >
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;