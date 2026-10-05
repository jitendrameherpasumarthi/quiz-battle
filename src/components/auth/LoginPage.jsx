import { useState } from 'react'
import {
  FiUser,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiAlertCircle,
  FiSun,
  FiMoon,
  FiCheck
} from 'react-icons/fi'
import { loginUser } from '../../utils/authUtils'

export default function LoginPage({
  onLoginSuccess,
  onSwitchToRegister,
  onSwitchToForgot,
  theme,
  toggleTheme,
  soundEffects,
  soundEnabled
}) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrorMessage('')
    const errors = {}

    const trimmedId = (identifier || '').trim()
    const trimmedPass = (password || '')

    if (!trimmedId) {
      errors.identifier = 'Please enter your username or email.'
    }
    if (!trimmedPass) {
      errors.password = 'Please enter your password.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      soundEffects?.playWrong?.(soundEnabled)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)

    const result = loginUser({
      identifier: trimmedId,
      password: trimmedPass,
      rememberMe
    })

    if (result.success) {
      soundEffects?.playCorrect?.(soundEnabled)
      onLoginSuccess(result.session, result.user)
    } else {
      setIsSubmitting(false)
      setErrorMessage(result.error || 'Failed to log in. Please check credentials.')
      soundEffects?.playWrong?.(soundEnabled)
    }
  }

  return (
    <div className="auth-page-wrapper view-enter">
      {/* Background Ambient Elements */}
      <div className="bg-ambient-layer" aria-hidden="true">
        <div className="bg-dot-pattern" />
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
      </div>

      {/* Top Controls (Theme Toggle) */}
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

        {/* Login Card */}
        <div className="auth-card">
          <div className="auth-card-header">
            <h2 className="auth-card-title">Welcome Back</h2>
            <p className="auth-card-subtitle">Sign in to continue to Quiz Battle</p>
          </div>

          {errorMessage && (
            <div className="auth-error-banner" role="alert">
              <FiAlertCircle className="auth-error-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {/* Email / Username Field */}
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="login-identifier">
                <span className="auth-label-text">
                  <FiUser /> Email / Username
                </span>
              </label>
              <div className={`auth-input-wrapper ${fieldErrors.identifier ? 'has-error' : ''}`}>
                <input
                  id="login-identifier"
                  className="auth-input"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  placeholder="Enter your username or email"
                  onChange={(e) => {
                    setIdentifier(e.target.value)
                    if (fieldErrors.identifier) {
                      setFieldErrors((prev) => ({ ...prev, identifier: '' }))
                    }
                  }}
                />
              </div>
              {fieldErrors.identifier && (
                <span className="auth-inline-error">{fieldErrors.identifier}</span>
              )}
            </div>

            {/* Password Field */}
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="login-password">
                <span className="auth-label-text">
                  <FiLock /> Password
                </span>
              </label>
              <div className={`auth-input-wrapper ${fieldErrors.password ? 'has-error' : ''}`}>
                <input
                  id="login-password"
                  className="auth-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  placeholder="Enter your password"
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

            {/* Options Row (Remember me & Forgot Password) */}
            <div className="auth-options-row">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="auth-checkbox"
                />
                <span className="checkbox-custom">
                  {rememberMe && <FiCheck className="check-mark-icon" />}
                </span>
                <span className="checkbox-text">Remember me</span>
              </label>

              <button
                type="button"
                className="auth-link-btn"
                onClick={() => {
                  soundEffects?.playClick?.(soundEnabled)
                  onSwitchToForgot()
                }}
              >
                Forgot?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-primary-submit-btn"
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? 'SIGNING IN...' : 'LOGIN'}</span>
              <FiArrowRight />
            </button>
          </form>

          {/* Switch to Register Footer */}
          <div className="auth-card-footer">
            <span>Don&apos;t have an account?</span>
            <button
              type="button"
              className="auth-switch-link-btn"
              onClick={() => {
                soundEffects?.playClick?.(soundEnabled)
                onSwitchToRegister()
              }}
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
