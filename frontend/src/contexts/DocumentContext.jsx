// frontend/src/context/DocumentContext.jsx
import { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';

const DocumentContext = createContext();

export const useDocuments = () => useContext(DocumentContext);

export const DocumentProvider = ({ children }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch documents when user changes
  useEffect(() => {
    if (user) {
      fetchDocuments();
    } else {
      setDocuments([]);
      setCurrentDocument(null);
    }
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/documents', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocument = async (documentId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }

      const data = await response.json();
      setCurrentDocument(data);
      return data;
    } catch (err) {
      console.error('Error fetching document:', err);
      setError('Failed to load document');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async (name, content = '') => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create document');
      }

      const data = await response.json();
      
      // Update documents list
      setDocuments(prev => [data, ...prev]);
      
      // Set as current document
      setCurrentDocument(data);
      
      return data;
    } catch (err) {
      console.error('Error creating document:', err);
      setError('Failed to create document');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateDocument = async (documentId, updates) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update document');
      }

      const data = await response.json();
      
      // Update document in list
      setDocuments(prev => 
        prev.map(doc => doc.id === documentId ? { ...doc, ...data } : doc)
      );
      
      // Update current document if it's the one being edited
      if (currentDocument && currentDocument.id === documentId) {
        setCurrentDocument(prev => ({ ...prev, ...data }));
      }
      
      return data;
    } catch (err) {
      console.error('Error updating document:', err);
      setError('Failed to update document');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (documentId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      // Remove from documents list
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      // Clear current document if it's the one being deleted
      if (currentDocument && currentDocument.id === documentId) {
        setCurrentDocument(null);
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    documents,
    currentDocument,
    loading,
    error,
    fetchDocuments,
    fetchDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    setCurrentDocument
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
};

export default DocumentContext;