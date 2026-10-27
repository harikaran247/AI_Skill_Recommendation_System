import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiLogin } from '../services/api';
import { 
  Compass, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [formKey, setFormKey] = useState(() => Date.now());

  // If already authenticated, redirect to dashboard immediately
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Completely reset form state whenever component mounts or when navigating back/to login
  useEffect(() => {
    setFormData({ email: '', password: '' });
    setError('');
    setShowPassword(false);
    setFormKey(Date.now());

    // Actively clear any browser-injected autofill
    const clearInputs = () => {
      const emailEl = document.getElementById('user-login-email');
      const passEl = document.getElementById('user-login-password');
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
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiLogin({
        email: formData.email.trim(),
        password: formData.password
      });

      if (res.success && res.token && res.user) {
        login(res.token, res.user);

        // Redirect to intended protected route or user dashboard
        const destination = location.state?.from?.pathname;
        if (destination) {
          navigate(destination, { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setError(res.error || 'Invalid credentials. Please verify your email and password.');
      }
    } catch (err) {
      setError('Could not connect to authentication service. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <Link to="/" className="auth-brand">
            <div className="auth-brand-logo">
              <Compass size={24} />
            </div>
            <span>SkillsAI Recommender</span>
          </Link>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">
            Sign in to access your customized skill roadmap, track project completions, and view new recommendations.
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
            <input type="text" name="browser_trap_usr" tabIndex={-1} autoComplete="username" defaultValue="" />
            <input type="password" name="browser_trap_pwd" tabIndex={-1} autoComplete="current-password" defaultValue="" />
          </div>

          {/* Email Address */}
          <div className="form-group">
            <label className="form-label" htmlFor="user-login-email">Email Address</label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                id="user-login-email"
                type="email"
                name={`login_email_${formKey}`}
                className="form-input auth-input"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="user-login-password">Password</label>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-input-icon" />
              <input
                id="user-login-password"
                type={showPassword ? 'text' : 'password'}
                name={`login_pass_${formKey}`}
                className="form-input auth-input"
                placeholder="Enter your password"
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
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Verifying credentials...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Footer links */}
        <div className="auth-footer">
          <p style={{ marginBottom: '10px' }}>
            Don't have an account yet?{' '}
            <Link to="/signup" className="auth-link">
              Sign up free <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </Link>
          </p>

          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '14px', marginTop: '14px' }}>
            <Link to="/admin/login" style={{ fontSize: '0.82rem', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <ShieldAlert size={14} /> System Administrator Portal &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
