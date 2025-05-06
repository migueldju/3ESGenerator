// frontend/src/components/editorView.jsx

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { pdfExporter } from 'quill-to-pdf';
import { saveAs } from 'file-saver';
import { generateWord } from 'quill-to-word';
import Header from './Header';
import '../styles/editorView.css';

const EditorView = () => {
  const [content, setContent] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState('');
  const [exportFormat, setExportFormat] = useState('docx');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const quillRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Verificar el estado de autenticación al montar
  useEffect(() => {
    checkAuthStatus();
  }, []);

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

  const handleNavigation = async (path) => {
    console.log('Navigating from editor to:', path);
    // Verificar el estado de autenticación antes de navegar
    await checkAuthStatus();
    navigate(path);
  };

  // Resto del código del componente permanece igual
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

  // Resto de las funciones permanecen igual
  const handleContentChange = (value) => {
    setContent(value);
  };

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

  // Las funciones de exportación permanecen iguales
  const exportToPDF = async () => { /* ... */ };
  const exportToDOCX = async () => { /* ... */ };
  const exportToTXT = async () => { /* ... */ };

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
          </div>
          
          <div className="editor-container">
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
    </>
  );
};

export default EditorView;