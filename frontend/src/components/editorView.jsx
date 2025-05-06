// frontend/src/components/editorView.jsx

import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { pdfExporter } from 'quill-to-pdf';
import { saveAs } from 'file-saver';
import { generateWord } from 'quill-to-word';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faDownload, faSpinner, faHistory } from '@fortawesome/free-solid-svg-icons';
import Header from './Header';
import '../styles/editorView.css';

const EditorView = () => {
  const [content, setContent] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [exportFormat, setExportFormat] = useState('docx');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [documentId, setDocumentId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const quillRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Verificar el estado de autenticación y cargar documento si es necesario
  useEffect(() => {
    checkAuthStatus();
    
    // Check if we have a document ID in the URL
    const params = new URLSearchParams(location.search);
    const docId = params.get('document');
    
    if (docId) {
      setDocumentId(docId);
      loadDocument(docId);
    }
  }, [location]);

  const checkAuthStatus = async () => {
    try {
      console.log('Checking auth status from editor...');
      const response = await fetch('/api/check-auth', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Auth status response:', data);
        setIsLoggedIn(data.isAuthenticated);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const loadDocument = async (id) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/user/document/${id}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load document');
      }
      
      const data = await response.json();
      setContent(data.content);
      setDocumentTitle(data.name);
      setDocumentId(data.id);
    } catch (error) {
      console.error('Error loading document:', error);
      setStatusMessage('Failed to load document. Please try again.');
      setTimeout(() => setStatusMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  // Rest of the code...
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'align': [] }],
      [{ 'link': [] }],
      [{'color': [] }, { 'background': [] }],
      ['clean']
    ]
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'indent',
    'link',
    'align',
    'color', 'background'
  ];

  const handleContentChange = (value) => {
    setContent(value);
  };

  const handleTitleChange = (e) => {
    setDocumentTitle(e.target.value);
  };

  const handleFormatChange = (e) => {
    setExportFormat(e.target.value);
  };

  const handleSaveDocument = async () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    
    if (!content.trim()) {
      setStatusMessage('Cannot save empty content.');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }
    
    setIsSaving(true);
    setStatusMessage('');
    
    try {
      // Get CSRF token
      const csrfResponse = await fetch('/api/get-csrf-token', {
        credentials: 'include'
      });
      
      let csrfToken = '';
      if (csrfResponse.ok) {
        const csrfData = await csrfResponse.json();
        csrfToken = csrfData.csrf_token;
      }
      
      // If document exists, update it
      if (documentId) {
        const response = await fetch(`/api/user/document/${documentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: content,
            name: documentTitle || 'Untitled Document',
            csrf_token: csrfToken
          }),
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to update document');
        }
        
        setStatusMessage('Document updated successfully.');
      } else {
        // Create new document
        const formData = new FormData();
        formData.append('content', content);
        formData.append('name', documentTitle || `ESRS Report ${new Date().toLocaleString()}`);
        formData.append('csrf_token', csrfToken);
        
        const response = await fetch('/api/save_content', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to save document');
        }
        
        const data = await response.json();
        if (data.document_id) {
          setDocumentId(data.document_id);
        }
        
        setStatusMessage('Document saved successfully.');
      }
    } catch (error) {
      console.error('Error saving document:', error);
      setStatusMessage('Error saving document. Please try again.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleExport = async () => {
    if (!content.trim()) {
      setStatusMessage('Cannot download empty content.');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }
    
    setIsDownloading(true);
    setStatusMessage('');
    
    try {
      if (exportFormat === 'pdf') {
        await exportToPDF();
      } else if (exportFormat === 'docx') {
        await exportToDOCX();
      } else if (exportFormat === 'txt') {
        exportToTXT();
      }
      
      setStatusMessage(`${exportFormat.toUpperCase()} downloaded successfully.`);
    } catch (error) {
      console.error(`Error downloading ${exportFormat.toUpperCase()}:`, error);
      setStatusMessage(`Error downloading ${exportFormat.toUpperCase()}. Please try again.`);
    } finally {
      setIsDownloading(false);
      setTimeout(() => {
        setStatusMessage('');
      }, 3000);
    }
  };

  const exportToPDF = async () => {
    try {
      const quill = quillRef.current.getEditor();
      const delta = quill.getContents();
      const pdfBlob = await pdfExporter.generatePdf(delta);
      saveAs(pdfBlob, `${documentTitle || 'ESGenerator_Report'}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
  };

  const exportToDOCX = async () => {
    try {
      const quill = quillRef.current.getEditor();
      const delta = quill.getContents();
      
      const docBlob = await generateWord(delta);
      saveAs(docBlob, `${documentTitle || 'ESGenerator_Report'}.docx`);
    } catch (error) {
      console.error('Error exporting to DOCX:', error);
      throw error;
    }
  };

  const exportToTXT = () => {
    try {
      // Remove HTML tags to get plain text
      const tempElement = document.createElement('div');
      tempElement.innerHTML = content;
      const plainText = tempElement.textContent || tempElement.innerText || '';
      
      const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `${documentTitle || 'ESGenerator_Report'}.txt`);
    } catch (error) {
      console.error('Error exporting to TXT:', error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="app-container">
        <Header />
        <div className="main-content">
          <div className="container">
            <div className="loading-container">
              <FontAwesomeIcon icon={faSpinner} spin />
              <p>Loading document...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
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
            <button className="nav-button active">Editor</button>
            {isLoggedIn && (
              <button 
                className="nav-button inactive" 
                onClick={() => handleNavigation('/my-content')}
              >
                <FontAwesomeIcon icon={faHistory} /> My Content
              </button>
            )}
          </div>
          
          <div className="editor-container">
            <div className="editor-header">
              <input
                type="text"
                value={documentTitle}
                onChange={handleTitleChange}
                placeholder="Document title..."
                className="document-title-input"
              />
              {isLoggedIn && (
                <button 
                  className="save-button"
                  onClick={handleSaveDocument}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin /> Saving...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faSave} /> Save
                    </>
                  )}
                </button>
              )}
            </div>
            
            <div className="quill-wrapper">
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={content}
                onChange={handleContentChange}
                modules={modules}
                formats={formats}
                placeholder="Write your ESRS report here..."
              />
            </div>
            
            <div className="editor-controls">
              {statusMessage && (
                <div className={`status-message ${statusMessage.includes('Error') || statusMessage.includes('Cannot') ? 'error' : 'success'}`}>
                  {statusMessage}
                </div>
              )}
              
              <div className="export-options">
                <select 
                  className="format-selector" 
                  value={exportFormat} 
                  onChange={handleFormatChange}
                >
                  <option value="pdf">PDF</option>
                  <option value="docx">Word Document (.docx)</option>
                  <option value="txt">Plain Text (.txt)</option>
                </select>
                
                <button 
                  className="download-button"
                  onClick={handleExport}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin /> Preparing...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faDownload} /> Download {exportFormat.toUpperCase()}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditorView;