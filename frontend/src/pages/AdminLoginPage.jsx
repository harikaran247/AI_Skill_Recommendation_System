import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiLogin } from '../services/api';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  KeyRound, 
  AlertCircle, 
  Loader2, 
  ArrowLeft 
} from 'lucide-react';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, login } = useAuth();
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [formKey, setFormKey] = useState(() => Date.now());

  // If already logged in as admin, redirect to admin dashboard
  useEffect(() => {
    if (user && isAdmin) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, isAdmin, navigate]);

  // Completely reset form state on mount or route transition
  useEffect(() => {
    setFormData({ email: '', password: '' });
    setError('');
    setShowPassword(false);
    setFormKey(Date.now());

    const clearInputs = () => {
      const emailEl = document.getElementById('admin-login-email');
      const passEl = document.getElementById('admin-login-password');
      if (emailEl) emailEl.value = '';
      if (passEl) passEl.value = '';
      setFormData({ email: '', password: '' });
    };

    clearInputs();
    const t1 = setTimeout(clearInputs, 60);
    const t2 = setTimeout(clearInputs, 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [location.key]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email.trim() || !formData.password) {
      setError('Please provide both administrator email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiLogin({
        email: formData.email.trim(),
        password: formData.password
      });

      if (res.success && res.token && res.user) {
        if (res.user.role !== 'admin') {
          setError('Access Denied: This account does not possess administrator privileges. Please sign in via the standard learner portal.');
          setLoading(false);
          return;
        }

        login(res.token, res.user);
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError(res.error || 'Invalid administrator credentials.');
      }
    } catch (err) {
      setError('Could not connect to authentication service. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card" style={{ borderColor: '#CBD5E1', boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1)' }}>
        {/* Header */}
        <div className="auth-header">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#FEF3C7',
            color: '#92400E',
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            marginBottom: '14px',
            border: '1px solid #FDE68A'
          }}>
            <ShieldAlert size={14} /> RESTRICTED ACCESS
          </div>

          <div className="auth-brand-logo" style={{ background: '#0F172A', color: '#FFFFFF', margin: '0 auto 12px auto' }}>
            <KeyRound size={24} />
          </div>

          <h1 className="auth-title">Administrator Sign In</h1>
          <p className="auth-subtitle">
            Secure administrative control console for platform management, user tracking, and system health metrics.
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '18px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form - with key reset and autofill trap */}
        <form 
          ref={formRef} 
          key={formKey} 
          onSubmit={handleSubmit} 
          className="auth-form" 
          autoComplete="off"
        >
          {/* Invisible Trap inputs to absorb browser autofill */}
          <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0, overflow: 'hidden' }} aria-hidden="true">
            <input type="text" name="browser_trap_adm_usr" tabIndex={-1} autoComplete="username" defaultValue="" />
            <input type="password" name="browser_trap_adm_pwd" tabIndex={-1} autoComplete="current-password" defaultValue="" />
          </div>

          {/* Email Address */}
          <div className="form-group">
            <label className="form-label" htmlFor="admin-login-email">Administrator Email</label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                id="admin-login-email"
                type="email"
                name={`admin_email_${formKey}`}
                className="form-input auth-input"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="admin-login-password">Administrator Password</label>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-input-icon" />
              <input
                id="admin-login-password"
                type={showPassword ? 'text' : 'password'}
                name={`admin_pwd_${formKey}`}
                className="form-input auth-input"
                placeholder="Enter admin password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-primary auth-submit-btn"
            style={{ background: '#0F172A' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Authenticating Administrator...
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                Sign In to Admin Console
              </>
            )}
          </button>
        </form>

        {/* Footer links */}
        <div className="auth-footer" style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '8px' }}>
            Looking for the learner portal?
          </p>
          <Link to="/login" style={{ fontSize: '0.86rem', color: '#4F46E5', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} /> Back to User Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
