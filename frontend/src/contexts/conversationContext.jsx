// frontend/src/context/ConversationContext.jsx
import { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';

const ConversationContext = createContext();

export const useConversations = () => useContext(ConversationContext);

export const ConversationProvider = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch conversations when user changes
  useEffect(() => {
    if (user) {
      fetchConversations();
    } else {
      setConversations([]);
      setCurrentConversation(null);
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/conversations', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      setConversations(data);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversation = async (conversationId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }

      const data = await response.json();
      setCurrentConversation(data);
      return data;
    } catch (err) {
      console.error('Error fetching conversation:', err);
      setError('Failed to load conversation');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createNewConversation = async (companyDescription) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_description: companyDescription,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const data = await response.json();
      
      // Update conversations list
      setConversations(prev => [data, ...prev]);
      
      // Set as current conversation
      setCurrentConversation({
        ...data,
        messages: []
      });
      
      return data;
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError('Failed to create conversation');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const addMessageToConversation = async (conversationId, question) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const messageData = await response.json();
      
      // Update current conversation with new message
      setCurrentConversation(prev => {
        if (prev && prev.id === conversationId) {
          return {
            ...prev,
            messages: [...(prev.messages || []), messageData],
            updated_at: new Date().toISOString()
          };
        }
        return prev;
      });
      
      // Update the conversation in the list
      setConversations(prev => {
        return prev.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              updated_at: new Date().toISOString()
            };
          }
          return conv;
        });
      });
      
      return messageData;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (conversationId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }

      // Remove from conversations list
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // Clear current conversation if it's the one being deleted
      if (currentConversation && currentConversation.id === conversationId) {
        setCurrentConversation(null);
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setError('Failed to delete conversation');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    conversations,
    currentConversation,
    loading,
    error,
    fetchConversations,
    fetchConversation,
    createNewConversation,
    addMessageToConversation,
    deleteConversation,
    setCurrentConversation
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};

export default ConversationContext;