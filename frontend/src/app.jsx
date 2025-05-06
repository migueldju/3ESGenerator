import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ChatView from './components/chatView';
import EditorView from './components/editorView';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import VerifyEmailPage from './components/VerifyEmailPage';
import UserProfilePage from './components/UserProfilePage';
import MyContentPage from './components/MyContentPage';
import './styles/app.css';

// Fallback component for loading state
const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh', 
    fontSize: '20px',
    fontWeight: 'bold' 
  }}>
    Loading...
  </div>
);

function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<ChatView />} />
        <Route path="/editor" element={<EditorView />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/my-content" element={<MyContentPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;