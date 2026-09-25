import React, { useState } from 'react';
import { AuthService, UserProfile, UserRole } from '../services/firebase.js';
import {
  Shield,
  X,
  Mail,
  Lock,
  Compass,
  Fish,
  Microscope,
  Anchor,
  UserCheck,
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (profile: UserProfile) => void;
  gatedFeatureNotice?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  gatedFeatureNotice
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [role, setRole] = useState<UserRole>('FISHERMAN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-switch role if gated notice specifies Researcher
  React.useEffect(() => {
    if (gatedFeatureNotice && (gatedFeatureNotice.includes('संशोधक') || gatedFeatureNotice.toUpperCase().includes('RESEARCHER'))) {
      setRole('RESEARCHER');
    }
  }, [gatedFeatureNotice]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async (overrideEmail?: string, overrideName?: string, overrideRole?: UserRole) => {
    setLoading(true);
    setError(null);
    try {
      const activeRole = overrideRole || role;
      const targetEmail = overrideEmail || (googleEmailInput.trim() ? googleEmailInput.trim() : undefined);
      const profile = await AuthService.signInWithGoogle(activeRole, targetEmail, overrideName);
      onAuthSuccess(profile);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Google sign-in encountered an issue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let profile: UserProfile;
      if (tab === 'register') {
        profile = await AuthService.registerWithEmail(email, password, role);
      } else {
        profile = await AuthService.signInWithEmail(email, password);
      }
      onAuthSuccess(profile);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = async () => {
    setLoading(true);
    try {
      const profile = await AuthService.continueAsGuest();
      onAuthSuccess(profile);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Guest session failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal-container" style={{ maxWidth: '490px' }}>
        {/* Header */}
        <div className="auth-modal-header">
          <div className="auth-title-brand">
            <div className="auth-logo-badge">
              <Compass size={22} className="text-marine" />
            </div>
            <div>
              <h3>ORCA Maritime Identity</h3>
              <p>Government-Grade Environmental Intelligence System</p>
            </div>
          </div>
          <button className="auth-close-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Feature Lock Notice if user was blocked by auth gating */}
        {gatedFeatureNotice && (
          <div className="auth-gated-banner" style={{ background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px' }}>
            <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#f87171' }}>प्रवेश निर्बंध (Access Gated):</strong>
              <div style={{ fontSize: '12px', marginTop: '2px', color: 'var(--text-secondary)' }}>{gatedFeatureNotice}</div>
            </div>
          </div>
        )}

        {/* Role Selector */}
        <div className="auth-role-section">
          <label className="auth-section-label">आपली भूमिका निवडा (Select Operational Role)</label>
          <div className="auth-role-grid">
            <button
              type="button"
              className={`role-choice-card ${role === 'FISHERMAN' ? 'active' : ''}`}
              onClick={() => setRole('FISHERMAN')}
            >
              <Fish size={18} />
              <div className="role-texts">
                <strong>Fisherman</strong>
                <span>मच्छिमार · कोळी केंद्र</span>
              </div>
            </button>

            <button
              type="button"
              className={`role-choice-card ${role === 'RESEARCHER' ? 'active' : ''}`}
              onClick={() => setRole('RESEARCHER')}
            >
              <Microscope size={18} />
              <div className="role-texts">
                <strong>Researcher</strong>
                <span>संशोधक · Advanced Lab</span>
              </div>
            </button>

            <button
              type="button"
              className={`role-choice-card ${role === 'MARITIME_AUTHORITY' ? 'active' : ''}`}
              onClick={() => setRole('MARITIME_AUTHORITY')}
            >
              <Anchor size={18} />
              <div className="role-texts">
                <strong>Authority</strong>
                <span>सागरी सुरक्षा प्राधिकरण</span>
              </div>
            </button>
          </div>
        </div>

        {/* Primary Google OAuth Action Section */}
        <div className="auth-oauth-section" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className="google-oauth-btn"
            onClick={() => handleGoogleSignIn()}
            disabled={loading}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', cursor: 'pointer', fontWeight: 600 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Authenticating with Google…' : `Continue with Google (${role})`}</span>
          </button>

          {/* Quick Instant Google Profiles (Guaranteed 1-Click Verification) */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px', marginTop: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              किंवा थेट Google खात्याने लॉगिन करा (Instant Google Verification)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className="orca-btn-secondary"
                onClick={() => handleGoogleSignIn('koli.machimar.goa@gmail.com', 'रामा कोळी (Koli Fisher)', 'FISHERMAN')}
                disabled={loading}
                style={{ fontSize: '11px', padding: '8px 10px', textAlign: 'left', display: 'flex', flexDirection: 'column' }}
              >
                <strong>🎣 Fisherman Google</strong>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>रामा कोळी · Goa Guild</span>
              </button>

              <button
                type="button"
                className="orca-btn-secondary"
                onClick={() => handleGoogleSignIn('marine.scientist@incois.gov.in', 'Dr. Aditi Sharma (Researcher)', 'RESEARCHER')}
                disabled={loading}
                style={{ fontSize: '11px', padding: '8px 10px', textAlign: 'left', display: 'flex', flexDirection: 'column', borderColor: role === 'RESEARCHER' ? 'var(--marine-accent)' : undefined }}
              >
                <strong>🔬 Researcher Google</strong>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Dr. Aditi · INCOIS Lab</span>
              </button>
            </div>

            {/* Custom Google Email Input */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <input
                type="email"
                placeholder="आपला Google ईमेल: user@gmail.com"
                value={googleEmailInput}
                onChange={(e) => setGoogleEmailInput(e.target.value)}
                style={{ flex: 1, fontSize: '12px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              />
              <button
                type="button"
                className="orca-btn-primary"
                onClick={() => handleGoogleSignIn()}
                disabled={loading}
                style={{ fontSize: '11px', padding: '6px 12px', whiteSpace: 'nowrap' }}
              >
                Google Sign In
              </button>
            </div>
          </div>
        </div>

        <div className="auth-divider" style={{ margin: '14px 0 10px' }}>
          <span>किंवा ईमेलने लॉगिन करा (or continue with email)</span>
        </div>

        {/* Tabs: Sign In / Register */}
        <div className="auth-tabs-row">
          <button
            type="button"
            className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => setTab('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
            onClick={() => setTab('register')}
          >
            Create Account
          </button>
        </div>

        {error && <div className="auth-error-msg">{error}</div>}

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="auth-email-form">
          <div className="auth-input-group">
            <Mail size={15} />
            <input
              type="email"
              placeholder="operator@marine.gov.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-input-group">
            <Lock size={15} />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="orca-btn-primary auth-submit-btn" disabled={loading}>
            {loading ? 'Authenticating…' : tab === 'register' ? 'Register Account' : 'Sign In'}
            <ArrowRight size={15} />
          </button>
        </form>

        {/* Guest Mode Limited Access Notice */}
        <div className="auth-guest-box" style={{ marginTop: '12px' }}>
          <div className="guest-info-top">
            <UserCheck size={16} className="text-muted" />
            <div>
              <strong>Guest Mode (मर्यादित वापर)</strong>
              <p>अतिथी मोडमध्ये नकाशा व साधी माहिती उपलब्ध आहे. AI चॅट, व्हॉइस असिस्टंट आणि Advanced Lab साठी Google लॉगिन अनिवार्य आहे.</p>
            </div>
          </div>
          <button
            type="button"
            className="orca-btn-secondary guest-continue-btn"
            onClick={handleGuestContinue}
            disabled={loading}
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
};
