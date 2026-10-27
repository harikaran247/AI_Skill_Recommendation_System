import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Compass, 
  Sparkles, 
  Shield, 
  LogOut, 
  LogIn, 
  UserPlus,
  LayoutDashboard,
  BookmarkCheck
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand / Logo */}
        <Link to={user ? "/dashboard" : "/login"} className="brand-section">
          <div className="brand-logo">
            <Compass size={22} />
          </div>
          <div>
            <div className="brand-title">
              AI-Based Skill Recommendation System
            </div>
          </div>
        </Link>

        {/* Navigation Actions */}
        <div className="nav-actions">
          {/* Recommender Tab (when on home page) */}
          {setActiveTab ? (
            <>
              <button 
                type="button"
                className={`nav-tab-btn ${activeTab === 'recommend' ? 'active' : ''}`}
                onClick={() => setActiveTab('recommend')}
              >
                <Sparkles size={16} />
                Recommender & Roadmap
              </button>

              <button 
                type="button"
                className={`nav-tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
                onClick={() => setActiveTab('progress')}
              >
                <BookmarkCheck size={16} />
                Saved Profiles
              </button>
            </>
          ) : (
            <Link to="/recommender" className="nav-tab-btn">
              <Sparkles size={16} />
              Recommender
            </Link>
          )}

          {/* Divider */}
          <div style={{ width: '1px', height: '22px', background: '#E2E8F0', margin: '0 4px' }} />

          {/* Authentication State Elements */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* User Dashboard Link */}
              <Link to="/dashboard" className="nav-tab-btn" title="Open My Learning Dashboard">
                <LayoutDashboard size={16} />
                My Dashboard
              </Link>

              {/* Admin Dashboard Link if Admin */}
              {isAdmin && (
                <Link 
                  to="/admin/dashboard" 
                  className="nav-tab-btn" 
                  style={{ background: '#0F172A', color: '#FFFFFF', borderColor: '#0F172A' }}
                  title="Open Administrator Console"
                >
                  <Shield size={15} />
                  Admin Console
                </Link>
              )}

              {/* User Pill */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  padding: '4px 10px', 
                  borderRadius: '999px', 
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#0F172A'
                }}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: isAdmin ? '#4F46E5' : '#10B981',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}>
                  {user.full_name?.charAt(0) || 'U'}
                </div>
                <span>{user.full_name?.split(' ')[0]}</span>
              </div>

              {/* Sign Out Button */}
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '6px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={handleLogout}
                title="Sign out of account"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link 
                to="/login" 
                className="btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <LogIn size={14} />
                Sign In
              </Link>

              <Link 
                to="/signup" 
                className="btn-primary" 
                style={{ padding: '6px 14px', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <UserPlus size={14} />
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
