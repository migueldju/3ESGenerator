// Modificación en frontend/src/components/chatView.jsx para cargar correctamente conversaciones

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faRedo, faSave, faHistory } from '@fortawesome/free-solid-svg-icons';
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
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [conversationTitle, setConversationTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [tabId, setTabId] = useState('');
  const [forceRefresh, setForceRefresh] = useState(0); // Contador para forzar recargas

  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const navigate = useNavigate();
  const isLoadingRef = useRef(false);

  const [placeholderText, setPlaceholder] = useState("Enter your company description...");
  const [companyDesc, setCompanyDesc] = useState('');
  const [conversationId, setConversationId] = useState(null);

  // Verificar si se acaba de cargar una conversación desde My Content
  useEffect(() => {
    const justLoadedConversation = localStorage.getItem('just_loaded_conversation');
    if (justLoadedConversation === 'true') {
      console.log("Detected conversation loaded from My Content");
      
      // Limpiar el indicador para evitar recargas innecesarias
      localStorage.removeItem('just_loaded_conversation');
      
      // Aumentar el contador de forceRefresh para forzar la recarga de la conversación
      setForceRefresh(prev => prev + 1);
    }
  }, []);

  useEffect(() => {
    // Generar un ID único para esta pestaña si no existe
    if (!tabId) {
      const newTabId = `tab_${Math.random().toString(36).substring(2, 11)}`;
      setTabId(newTabId);
      
      // Guardar el ID en localStorage para persistencia
      localStorage.setItem('esrs_tab_id', newTabId);
    }
    
    checkAuthStatus();
  }, [tabId]);

  // Recuperar el ID de pestaña al cargar
  useEffect(() => {
    const storedTabId = localStorage.getItem('esrs_tab_id');
    if (storedTabId) {
      setTabId(storedTabId);
    } else {
      const newTabId = `tab_${Math.random().toString(36).substring(2, 11)}`;
      setTabId(newTabId);
      localStorage.setItem('esrs_tab_id', newTabId);
    }
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

  const fetchConversation = async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    
    try {
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
            console.log("Fetched conversation with", data.messages.length, "messages");
            setMessages(data.messages);
            
            // Desplazar al final de la conversación después de cargar los mensajes
            setTimeout(() => {
              if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
              }
            }, 100);
          } else {
            console.log("No messages in fetched conversation");
          }
          
          // Guardar el ID de la conversación si existe
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

  // Usar forceRefresh para forzar la recarga cuando sea necesario
  useEffect(() => {
    fetchConversation();
  }, [tabId, forceRefresh]); // forceRefresh como dependencia

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
      // Incluir el ID de pestaña en las cabeceras para debugging
      const headers = new Headers();
      headers.append('X-Tab-ID', tabId);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: headers
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
        
        // Actualizar el título por defecto de la conversación
        setConversationTitle(`ESRS Chat - ${data.nace_sector}`);
      } 
  
      setMessages(prev => [...prev, { type: 'bot', content: data.answer }]);
      
      // Si hay un ID de conversación en la respuesta, actualizarlo
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }
      
      // Desplazar al final de la conversación después de recibir la respuesta
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
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
      const headers = new Headers();
      headers.append('X-Tab-ID', tabId);
      
      const response = await fetch('/api/reset', {
        method: 'POST',
        credentials: 'include',
        headers: headers
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
        setConversationId(null);
        setConversationTitle('');
      }
    } catch (error) {
      console.error('Error resetting chat:', error);
    }
  };

  const handleSaveConversation = () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    
    if (!companyInfo.initialized) {
      return;
    }
    
    setShowSaveDialog(true);
    
    // Establecer un título predeterminado si no hay uno
    if (!conversationTitle) {
      const defaultTitle = `ESRS Chat - ${companyInfo.naceSector} - ${new Date().toLocaleDateString()}`;
      setConversationTitle(defaultTitle);
    }
  };
  
  const confirmSaveConversation = async () => {
    if (!conversationTitle.trim()) {
      setSaveError('Please enter a title for your conversation.');
      return;
    }
    
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError('');
    
    try {
      const response = await fetch('/api/chat/save_for_later', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tab-ID': tabId
        },
        body: JSON.stringify({
          title: conversationTitle
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to save conversation');
      }
      
      setSaveSuccess(true);
      
      // Cerrar el diálogo después de un breve retraso
      setTimeout(() => {
        setShowSaveDialog(false);
        setSaveSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Error saving conversation:', error);
      setSaveError('Failed to save conversation. Please try again.');
    } finally {
      setIsSaving(false);
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
                <div className="action-buttons">
                  {isLoggedIn && (
                    <button
                      className="save-conversation-button"
                      title="Save conversation for later"
                      onClick={handleSaveConversation}
                    >
                      <FontAwesomeIcon icon={faSave} /> Save
                    </button>
                  )}
                  <button 
                    className="reset-button" 
                    title="Start new conversation"
                    onClick={handleReset}
                  >
                    <FontAwesomeIcon icon={faRedo} /> New Chat
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="chat-container" ref={chatContainerRef}>
            {messages.length > 0 ? messages.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.type}-message ${message.isWelcome ? 'welcome-message' : ''}`}
                dangerouslySetInnerHTML={{ __html: message.content }}
              />
            )) : (
              <div className="message bot-message welcome-message">
                <h2>Welcome to ESGenerator</h2>
                <p>Please provide a detailed description of your company's activities, products, services, and sector to help me determine the applicable ESRS reporting standards.</p>
              </div>
            )}
            
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
      
      {/* Diálogo para guardar la conversación */}
      {showSaveDialog && (
        <div className="save-dialog-overlay">
          <div className="save-dialog">
            <h3>Save Conversation</h3>
            {saveSuccess ? (
              <div className="save-success">
                <p>Conversation saved successfully!</p>
              </div>
            ) : (
              <>
                <p>Enter a title for this conversation:</p>
                <input
                  type="text"
                  value={conversationTitle}
                  onChange={(e) => setConversationTitle(e.target.value)}
                  placeholder="Conversation title"
                  className={saveError ? 'input-error' : ''}
                />
                {saveError && <p className="error-message">{saveError}</p>}
                <div className="save-dialog-buttons">
                  <button 
                    className="cancel-button"
                    onClick={() => setShowSaveDialog(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button 
                    className="save-button"
                    onClick={confirmSaveConversation}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatView;