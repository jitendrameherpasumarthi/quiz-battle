import { useState } from 'react'
import {
  FiUser,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiAlertCircle,
  FiSun,
  FiMoon
} from 'react-icons/fi'
import { registerUser } from '../../utils/authUtils'

export default function RegisterPage({
  onRegisterSuccess,
  onSwitchToLogin,
  theme,
  toggleTheme,
  soundEffects,
  soundEnabled
}) {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrorMessage('')
    setFieldErrors({})

    const errors = {}

    const trimmedFullName = (fullName || '').trim()
    const trimmedUsername = (username || '').trim()
    const trimmedEmail = (email || '').trim().toLowerCase()
    const pass = password || ''
    const confPass = confirmPassword || ''

    if (!trimmedFullName || trimmedFullName.length < 2) {
      errors.fullName = 'Full name must be at least 2 characters.'
    }

    if (!trimmedUsername || trimmedUsername.length < 2 || trimmedUsername.length > 20) {
      errors.username = 'Username must be 2–20 characters.'
    } else if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      errors.username = 'Username can only contain letters, numbers, and underscores.'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!trimmedEmail) {
      errors.email = 'Please enter your email.'
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email format (e.g. name@example.com).'
    }

    if (!pass) {
      errors.password = 'Please enter a password.'
    } else if (pass.length < 8) {
      errors.password = 'Password must be at least 8 characters.'
    }

    if (!confPass) {
      errors.confirmPassword = 'Please confirm your password.'
    } else if (pass !== confPass) {
      errors.confirmPassword = 'Passwords do not match.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      soundEffects?.playWrong?.(soundEnabled)
      return
    }

    setIsSubmitting(true)

    const result = registerUser({
      fullName: trimmedFullName,
      username: trimmedUsername,
      email: trimmedEmail,
      password: pass,
      confirmPassword: confPass
    })

    if (result.success) {
      soundEffects?.playCorrect?.(soundEnabled)
      onRegisterSuccess(result.session, result.user)
    } else {
      setIsSubmitting(false)
      setErrorMessage(result.error || 'Failed to create account.')
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors)
      }
      soundEffects?.playWrong?.(soundEnabled)
    }
  }

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

        {/* Register Card */}
        <div className="auth-card register-card">
          <div className="auth-card-header">
            <h2 className="auth-card-title">Create Account</h2>
            <p className="auth-card-subtitle">Join Quiz Battle to track your personal best and stats</p>
          </div>

          {errorMessage && (
            <div className="auth-error-banner" role="alert">
              <FiAlertCircle className="auth-error-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {/* Full Name */}
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="reg-fullname">
                <span className="auth-label-text">
                  <FiUser /> Full Name
                </span>
              </label>
              <div className={`auth-input-wrapper ${fieldErrors.fullName ? 'has-error' : ''}`}>
                <input
                  id="reg-fullname"
                  className="auth-input"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  placeholder="Enter your full name"
                  onChange={(e) => {
                    setFullName(e.target.value)
                    if (fieldErrors.fullName) {
                      setFieldErrors((prev) => ({ ...prev, fullName: '' }))
                    }
                  }}
                />
              </div>
              {fieldErrors.fullName && (
                <span className="auth-inline-error">{fieldErrors.fullName}</span>
              )}
            </div>

            {/* Username */}
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="reg-username">
                <span className="auth-label-text">
                  <FiUser /> Username
                </span>
              </label>
              <div className={`auth-input-wrapper ${fieldErrors.username ? 'has-error' : ''}`}>
                <input
                  id="reg-username"
                  className="auth-input"
                  type="text"
                  autoComplete="username"
                  value={username}
                  placeholder="Choose username"
                  onChange={(e) => {
                    setUsername(e.target.value)
                    if (fieldErrors.username) {
                      setFieldErrors((prev) => ({ ...prev, username: '' }))
                    }
                  }}
                />
              </div>
              {fieldErrors.username && (
                <span className="auth-inline-error">{fieldErrors.username}</span>
              )}
            </div>

            {/* Email */}
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="reg-email">
                <span className="auth-label-text">
                  <FiMail /> Email
                </span>
              </label>
              <div className={`auth-input-wrapper ${fieldErrors.email ? 'has-error' : ''}`}>
                <input
                  id="reg-email"
                  className="auth-input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  placeholder="Enter email"
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: '' }))
                    }
                  }}
                />
              </div>
              {fieldErrors.email && (
                <span className="auth-inline-error">{fieldErrors.email}</span>
              )}
            </div>

            {/* Password */}
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="reg-password">
                <span className="auth-label-text">
                  <FiLock /> Password
                </span>
              </label>
              <div className={`auth-input-wrapper ${fieldErrors.password ? 'has-error' : ''}`}>
                <input
                  id="reg-password"
                  className="auth-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  placeholder="Create password (min. 8 characters)"
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: '' }))
                    }
                  }}
                />
                <button
                  type="button"
                  className="auth-password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {fieldErrors.password && (
                <span className="auth-inline-error">{fieldErrors.password}</span>
              )}
            </div>

            {/* Confirm Password */}
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="reg-confirm-password">
                <span className="auth-label-text">
                  <FiLock /> Confirm Password
                </span>
              </label>
              <div className={`auth-input-wrapper ${fieldErrors.confirmPassword ? 'has-error' : ''}`}>
                <input
                  id="reg-confirm-password"
                  className="auth-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  placeholder="Confirm password"
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }))
                    }
                  }}
                />
                <button
                  type="button"
                  className="auth-password-toggle-btn"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <span className="auth-inline-error">{fieldErrors.confirmPassword}</span>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-primary-submit-btn"
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}</span>
              <FiArrowRight />
            </button>
          </form>

          {/* Switch to Login Footer */}
          <div className="auth-card-footer">
            <span>Already have an account?</span>
            <button
              type="button"
              className="auth-switch-link-btn"
              onClick={() => {
                soundEffects?.playClick?.(soundEnabled)
                onSwitchToLogin()
              }}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
