import { FiArrowLeft, FiInfo, FiSun, FiMoon } from 'react-icons/fi'

export default function ForgotPassword({
  onSwitchToLogin,
  theme,
  toggleTheme,
  soundEffects,
  soundEnabled
}) {
  return (
    <div className="auth-page-wrapper view-enter">
      {/* Ambient background layers */}
      <div className="bg-ambient-layer" aria-hidden="true">
        <div className="bg-dot-pattern" />
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
      </div>

      {/* Top Controls */}
      <div className="auth-top-controls">
        <button
          className="theme-toggle-btn auth-theme-btn"
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <FiSun /> : <FiMoon />}
          <span>{theme === 'dark' ? 'LIGHT' : 'DARK'}</span>
        </button>
      </div>

      <div className="auth-container">
        {/* Branding Header */}
        <div className="auth-brand-header">
          <div className="auth-brand-icon-wrapper">
            <span className="auth-brand-icon">🧠</span>
          </div>
          <h1 className="auth-brand-title">
            <span className="brand-quiz">QUIZ</span> <span className="brand-battle">BATTLE</span>
          </h1>
          <p className="auth-brand-tagline">Learn &bull; Compete &bull; Grow</p>
        </div>

        {/* Forgot Password Card */}
        <div className="auth-card">
          <div className="auth-card-header">
            <h2 className="auth-card-title">Reset Password</h2>
            <p className="auth-card-subtitle">Password Recovery Service</p>
          </div>

          <div className="auth-notice-box">
            <div className="auth-notice-icon-wrap">
              <FiInfo className="auth-notice-icon" />
            </div>
            <div className="auth-notice-text">
              <p className="auth-notice-primary">
                Password recovery is available when a backend authentication service is connected.
              </p>
              <p className="auth-notice-secondary">
                Please return to the login screen or create a new account via the registration page.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="auth-primary-submit-btn auth-back-btn"
            onClick={() => {
              soundEffects?.playClick?.(soundEnabled)
              onSwitchToLogin()
            }}
          >
            <FiArrowLeft />
            <span>Back to Login</span>
          </button>
        </div>
      </div>
    </div>
  )
}
