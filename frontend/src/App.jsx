import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { Loader2 } from 'lucide-react';

import HomePage from './pages/HomePage';
import SignUpPage from './pages/SignUpPage';
import SignInPage from './pages/SignInPage';
import UserDashboardPage from './pages/UserDashboardPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={36} color="#4F46E5" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Application Entry: Redirects to /login if unauthenticated, /dashboard if authenticated */}
          <Route path="/" element={<RootRedirect />} />
          
          {/* User Authentication Pages */}
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/login" element={<SignInPage />} />

          {/* User Protected Dashboard */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <UserDashboardPage />
              </ProtectedRoute>
            } 
          />

          {/* Interactive Recommender & Explorer */}
          <Route 
            path="/recommender" 
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            } 
          />

          {/* Admin Dedicated Authentication Page */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Admin Protected Dashboard */}
          <Route 
            path="/admin/dashboard" 
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            } 
          />

          {/* Catch-all redirect to entry */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
