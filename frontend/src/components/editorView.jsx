import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { pdfExporter } from 'quill-to-pdf';
import { saveAs } from 'file-saver';
import { generateWord } from 'quill-to-word';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faCheck, faTimes, faHistory } from '@fortawesome/free-solid-svg-icons';
import Header from './Header';
import '../styles/editorView.css';

const EditorView = () => {
  const [content, setContent] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState('');
  const [exportFormat, setExportFormat] = useState('docx');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [lastSaved, setLastSaved] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [documentName, setDocumentName] = useState('Untitled Document');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [documentHistory, setDocumentHistory] = useState([]);
  
  const quillRef = useRef(null);
  const nameInputRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const navigate = useNavigate();

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

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/check-auth', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(data.isAuthenticated);
          
          if (data.isAuthenticated) {
            loadRecentDocument();
            loadDocumentHistory();
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      }
    };
    
    checkAuth();
  }, []);

  // Load most recent document
  const loadRecentDocument = async () => {
    try {
      const response = await fetch('/api/user/documents', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const documents = await response.json();
        if (documents.length > 0) {
          const recentDoc = documents[0];
          await loadDocument(recentDoc.id);
        }
      }
    } catch (error) {
      console.error('Error loading recent document:', error);
    }
  };

  // Load document history for sidebar
  const loadDocumentHistory = async () => {
    try {
      const response = await fetch('/api/user/documents', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const documents = await response.json();
        setDocumentHistory(documents);
      }
    } catch (error) {
      console.error('Error loading document history:', error);
    }
  };

  // Load specific document
  const loadDocument = async (documentId) => {
    try {
      const response = await fetch(`/api/user/document/${documentId}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const docData = await response.json();
        setContent(docData.content || '');
        setDocumentName(docData.name);
        setCurrentDocument(docData);
        setLastSaved(new Date(docData.updated_at || docData.created_at));
        setSaveStatus('saved');
      }
    } catch (error) {
      console.error('Error loading document:', error);
    }
  };

  // Auto-save function
  const autoSave = useCallback(async (contentToSave) => {
    if (!isAuthenticated || !contentToSave.trim()) {
      return;
    }

    setSaveStatus('saving');
    
    try {
      const formData = new FormData();
      formData.append('content', contentToSave);
      
      if (currentDocument?.id) {
        formData.append('document_id', currentDocument.id);
      }

      const response = await fetch('/api/user/documents/autosave', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSaveStatus('saved');
        setLastSaved(new Date(data.last_saved));
        
        // Update current document if this was a new document
        if (data.document_id && !currentDocument?.id) {
          setCurrentDocument({
            id: data.document_id,
            name: documentName,
            content: contentToSave
          });
          loadDocumentHistory(); // Refresh history
        }
      } else {
        setSaveStatus('error');
        console.error('Error saving content');
      }
    } catch (error) {
      console.error('Error auto-saving:', error);
      setSaveStatus('error');
    }
  }, [isAuthenticated, currentDocument?.id, documentName]);

  // Debounced save function
  const debouncedSave = useCallback((contentToSave) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(contentToSave);
    }, 2000);
  }, [autoSave]);

  // Handle content changes
  const handleContentChange = (value) => {
    setContent(value);
    
    if (isAuthenticated) {
      setSaveStatus('unsaved');
      debouncedSave(value);
    }
  };

  // Handle name editing
  const startEditingName = () => {
    setTempName(documentName);
    setIsEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const saveName = async () => {
    if (!tempName.trim()) {
      cancelEditingName();
      return;
    }

    if (!isAuthenticated || !currentDocument?.id) {
      setDocumentName(tempName);
      setIsEditingName(false);
      return;
    }

    try {
      const csrfResponse = await fetch('/api/get-csrf-token', {
        method: 'GET',
        credentials: 'include'
      });
      
      let csrfToken = '';
      if (csrfResponse.ok) {
        const csrfData = await csrfResponse.json();
        csrfToken = csrfData.csrf_token;
      }

      const response = await fetch(`/api/user/document/${currentDocument.id}/rename`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: tempName,
          csrf_token: csrfToken
        }),
        credentials: 'include'
      });

      if (response.ok) {
        setDocumentName(tempName);
        setCurrentDocument({...currentDocument, name: tempName});
        loadDocumentHistory(); // Refresh history
      }
    } catch (error) {
      console.error('Error renaming document:', error);
    }
    
    setIsEditingName(false);
  };

  const cancelEditingName = () => {
    setTempName('');
    setIsEditingName(false);
  };

  // New document
  const createNewDocument = () => {
    setContent('');
    setCurrentDocument(null);
    setDocumentName('Untitled Document');
    setSaveStatus('ready');
    setLastSaved(null);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleFormatChange = (e) => {
    setExportFormat(e.target.value);
  };

  const handleExport = async () => {
    if (!content.trim()) {
      setDownloadMessage('Cannot download empty content.');
      setTimeout(() => setDownloadMessage(''), 3000);
      return;
    }
    
    setIsDownloading(true);
    setDownloadMessage('');
    
    try {
      if (exportFormat === 'pdf') {
        await exportToPDF();
      } else if (exportFormat === 'docx') {
        await exportToDOCX();
      } else if (exportFormat === 'txt') {
        exportToTXT();
      }
      
      setDownloadMessage(`${exportFormat.toUpperCase()} downloaded successfully.`);
      setTimeout(() => {
        setDownloadMessage('');
      }, 3000);
    } catch (error) {
      console.error(`Error downloading ${exportFormat.toUpperCase()}:`, error);
      setDownloadMessage(`Error downloading ${exportFormat.toUpperCase()}. Please try again.`);
    } finally {
      setIsDownloading(false);
    }
  };

  const exportToPDF = async () => {
    const quillEditor = quillRef.current.getEditor();
    
    const pdfOptions = {
      filename: `${documentName}.pdf`,
      exportAs: 'blob',
      styleOptions: {
        paragraphSpacing: {
          before: 120,
          after: 240,
        },
        pageMargins: {
          top: 180,
          right: 180,
          bottom: 180,
          left: 180,
        },
      },
      title: documentName,
      author: 'ESGenerator',
      subject: 'European Sustainability Reporting Standards',
      keywords: 'ESRS, Sustainability, Report',
      headerText: documentName,
      footerText: `Generated on ${new Date().toLocaleDateString()}`,
    };
    
    const pdfBlob = await pdfExporter.generatePdf(quillEditor.getContents(), pdfOptions);
    
    if (window.showSaveFilePicker) {
      try {
        const opts = {
          suggestedName: `${documentName}.pdf`,
          types: [{
            description: 'PDF File',
            accept: {'application/pdf': ['.pdf']}
          }]
        };
        
        const fileHandle = await window.showSaveFilePicker(opts);
        const writable = await fileHandle.createWritable();
        await writable.write(pdfBlob);
        await writable.close();
      } catch (err) {
        if (err.name !== 'AbortError') {
          saveAs(pdfBlob, `${documentName}.pdf`);
        }
      }
    } else {
      saveAs(pdfBlob, `${documentName}.pdf`);
    }
  };

  const exportToDOCX = async () => {
    const quillEditor = quillRef.current.getEditor();
    
    const docxOptions = {
      exportAs: 'blob',
      styleOptions: {
        paragraphSpacing: {
          before: 120,
          after: 240,
        },
        pageMargins: {
          top: 360, 
          right: 360,
          bottom: 360,
          left: 360,
        },
      },
      
      title: documentName,
      subject: 'European Sustainability Reporting Standards',
      creator: 'ESGenerator',
      description: 'ESRS Report generated with ESGenerator',
      lastModifiedBy: 'ESGenerator User',
    };
    
    const docxBlob = await generateWord(quillEditor.getContents(), docxOptions);
    if (window.showSaveFilePicker) {
      try {
        const opts = {
          suggestedName: `${documentName}.docx`,
          types: [{
            description: 'Word Document',
            accept: {'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']}
          }]
        };
        
        const fileHandle = await window.showSaveFilePicker(opts);
        const writable = await fileHandle.createWritable();
        await writable.write(docxBlob);
        await writable.close();
      } catch (err) {
        if (err.name !== 'AbortError') {
          saveAs(docxBlob, `${documentName}.docx`);
        }
      }
    } else {
      saveAs(docxBlob, `${documentName}.docx`);
    }
  };

  const exportToTXT = async () => {
    const quillEditor = quillRef.current.getEditor();
    const plainText = quillEditor.getText();
    const txtBlob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    if (window.showSaveFilePicker) {
      try {
        const opts = {
          suggestedName: `${documentName}.txt`,
          types: [{
            description: 'Text File',
            accept: {'text/plain': ['.txt']}
          }]
        };
        
        const fileHandle = await window.showSaveFilePicker(opts);
        const writable = await fileHandle.createWritable();
        await writable.write(txtBlob);
        await writable.close();
      } catch (err) {
        if (err.name !== 'AbortError') {
          saveAs(txtBlob, `${documentName}.txt`);
        }
      }
    } else {
      saveAs(txtBlob, `${documentName}.txt`);
    }
  };

  // Render save status indicator
  const renderSaveStatus = () => {
    if (!isAuthenticated) {
      return (
        <div className="save-status">
          <span className="status-text">Login to save your work</span>
        </div>
      );
    }

    let statusText = '';
    let statusClass = '';

    switch (saveStatus) {
      case 'saving':
        statusText = 'Saving...';
        statusClass = 'saving';
        break;
      case 'saved':
        statusText = lastSaved ? `Saved at ${lastSaved.toLocaleTimeString()}` : 'Saved';
        statusClass = 'saved';
        break;
      case 'error':
        statusText = 'Error saving';
        statusClass = 'error';
        break;
      case 'unsaved':
        statusText = 'Unsaved changes';
        statusClass = 'unsaved';
        break;
      default:
        statusText = 'Ready';
        statusClass = 'ready';
    }

    return (
      <div className={`save-status ${statusClass}`}>
        <span className="status-text">{statusText}</span>
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
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
            <button className="nav-button active">Editor</button>
            {isAuthenticated && (
              <button 
                className={`nav-button ${showHistory ? 'active' : 'inactive'}`}
                onClick={() => setShowHistory(!showHistory)}
              >
              My Content
              </button>
            )}
          </div>
          
          <div className="editor-layout">
            {showHistory && isAuthenticated && (
              <div className="history-sidebar">
                <div className="history-header">
                  <h3>My Documents</h3>
                  <button className="new-doc-btn" onClick={createNewDocument}>
                    New Document
                  </button>
                </div>
                <div className="history-list">
                  {documentHistory.length === 0 ? (
                    <div className="no-documents">
                      <p>No documents yet</p>
                    </div>
                  ) : (
                    documentHistory.map(doc => (
                      <div
                        key={doc.id}
                        className={`history-item ${currentDocument?.id === doc.id ? 'active' : ''}`}
                        onClick={() => loadDocument(doc.id)}
                      >
                        <div className="doc-name">{doc.name}</div>
                        <div className="doc-date">{formatDate(doc.created_at)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
            <div className="editor-container">
              <div className="editor-header">
                <div className="document-title">
                  {isEditingName ? (
                    <div className="name-editor">
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveName();
                          if (e.key === 'Escape') cancelEditingName();
                        }}
                        onBlur={saveName}
                      />
                      <button onClick={saveName}><FontAwesomeIcon icon={faCheck} /></button>
                      <button onClick={cancelEditingName}><FontAwesomeIcon icon={faTimes} /></button>
                    </div>
                  ) : (
                    <div className="document-name" onClick={startEditingName}>
                      <span>{documentName}</span>
                      <FontAwesomeIcon icon={faEdit} className="edit-icon" />
                    </div>
                  )}
                </div>
                {renderSaveStatus()}
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
                {downloadMessage && (
                  <div className={`save-message ${downloadMessage.includes('Error') || downloadMessage.includes('Cannot') ? 'error' : 'success'}`}>
                    {downloadMessage}
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
                    className="save-button"
                    onClick={handleExport}
                    disabled={isDownloading}
                  >
                    {isDownloading ? `Preparing ${exportFormat.toUpperCase()}...` : `Download ${exportFormat.toUpperCase()}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditorView;