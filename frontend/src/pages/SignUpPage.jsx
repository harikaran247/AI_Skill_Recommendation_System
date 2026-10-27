import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiSignUp } from '../services/api';
import { 
  Compass, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  Target
} from 'lucide-react';

export default function SignUpPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formKey, setFormKey] = useState(() => Date.now());
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Guarantee fields are completely blank on mount and route change
  useEffect(() => {
    setFormData({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
    setError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormKey(Date.now());

    const clearInputs = () => {
      const emailEl = document.getElementById('signup-email');
      const passEl = document.getElementById('signup-password');
      const confirmEl = document.getElementById('signup-confirm-password');
      if (emailEl) emailEl.value = '';
      if (passEl) passEl.value = '';
      if (confirmEl) confirmEl.value = '';
    };

    clearInputs();
    const t1 = setTimeout(clearInputs, 50);
    const t2 = setTimeout(clearInputs, 200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    let score = 0;
    if (!pwd) return { score: 0, label: '', color: '#CBD5E1' };
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: '#EF4444' };
      case 2:
        return { score: 2, label: 'Fair', color: '#F59E0B' };
      case 3:
        return { score: 3, label: 'Good', color: '#3B82F6' };
      case 4:
        return { score: 4, label: 'Strong', color: '#10B981' };
      default:
        return { score: 0, label: '', color: '#CBD5E1' };
    }
  };

  const strength = getPasswordStrength(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!formData.fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please provide a valid email address.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiSignUp({
        full_name: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirm_password: formData.confirmPassword,
        career_goal: null,
        existing_skills: []
      });

      if (res.success && res.token && res.user) {
        login(res.token, res.user);
        navigate('/dashboard');
      } else {
        setError(res.error || 'Failed to create account.');
      }
    } catch (err) {
      setError('Could not connect to server. Please ensure the backend is running.');
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
          <h1 className="auth-title">Create your learner account</h1>
          <p className="auth-subtitle">
            Start tracking your personalized skill roadmap, project completion, and AI recommendations.
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '18px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form with Autofill Trap */}
        <form key={formKey} onSubmit={handleSubmit} className="auth-form" autoComplete="off">
          {/* Invisible trap inputs to absorb browser autofill */}
          <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0, overflow: 'hidden' }} aria-hidden="true">
            <input type="text" name="trap_usr" tabIndex={-1} autoComplete="username" defaultValue="" />
            <input type="password" name="trap_pwd" tabIndex={-1} autoComplete="current-password" defaultValue="" />
          </div>

          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="signup-fullname">Full Name</label>
            <div className="auth-input-wrapper">
              <User size={18} className="auth-input-icon" />
              <input
                id="signup-fullname"
                type="text"
                name={`fullname_${formKey}`}
                className="form-input auth-input"
                placeholder="e.g. Alex Morgan"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                autoComplete="off"
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">Email Address</label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                id="signup-email"
                type="email"
                name={`email_${formKey}`}
                className="form-input auth-input"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                autoComplete="off"
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="signup-password">Password</label>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-input-icon" />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                name={`pwd_${formKey}`}
                className="form-input auth-input"
                placeholder="Create a secure password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

            {/* Password Strength Indicator */}
            {formData.password && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Password Strength:</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px', height: '4px' }}>
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      style={{
                        flex: 1,
                        borderRadius: '2px',
                        background: step <= strength.score ? strength.color : '#E2E8F0',
                        transition: 'background 0.3s ease'
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px', fontSize: '0.72rem', color: '#64748B' }}>
                  <span style={{ color: formData.password.length >= 6 ? '#10B981' : '#94A3B8', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Check size={12} /> Min 6 chars
                  </span>
                  <span style={{ color: formData.password.length >= 8 ? '#10B981' : '#94A3B8', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Check size={12} /> 8+ chars
                  </span>
                  <span style={{ color: /[A-Z]/.test(formData.password) ? '#10B981' : '#94A3B8', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Check size={12} /> Uppercase
                  </span>
                  <span style={{ color: /[0-9]|[^A-Za-z0-9]/.test(formData.password) ? '#10B981' : '#94A3B8', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Check size={12} /> Number or symbol
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="signup-confirm-password">Confirm Password</label>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-input-icon" />
              <input
                id="signup-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                name={`conf_pwd_${formKey}`}
                className="form-input auth-input"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                Creating your account...
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                Sign Up as Learner
              </>
            )}
          </button>
        </form>

        {/* Footer links */}
        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in here <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
