import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';

export default function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={36} color="#4F46E5" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="main-content" style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
        <div className="ui-card" style={{ padding: '40px 30px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#FEF2F2',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto'
          }}>
            <ShieldAlert size={36} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
            Access Denied
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '24px' }}>
            You are signed in as <strong>{user.full_name}</strong> ({user.email}), which is a standard user account. 
            The Admin Dashboard requires elevated administrator privileges.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <Link to="/dashboard" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ArrowLeft size={16} /> Return to User Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
