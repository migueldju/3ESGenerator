// frontend/src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Allow guest access but show login prompt
  if (!isAuthenticated) {
    // Instead of redirecting, you can show a login prompt
    return (
      <div className="auth-prompt">
        <h2>Login Required</h2>
        <p>Please log in to access this feature. You'll be redirected to the homepage in 3 seconds.</p>
        {setTimeout(() => window.location.href = '/', 3000)}
      </div>
    );
  }

  // If authenticated, render the protected component
  return children;
};

export default ProtectedRoute;