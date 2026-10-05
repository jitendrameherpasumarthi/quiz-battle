import React from 'react'
import {
  FiX,
  FiHome,
  FiClock,
  FiTrendingUp,
  FiAward,
  FiCheckSquare,
  FiUser,
  FiLogOut,
  FiSun,
  FiMoon,
  FiVolume2,
  FiVolumeX
} from 'react-icons/fi'

/**
 * MobileNavigationDrawer Component
 * 
 * Provides a responsive right-side slide-in navigation drawer for viewport widths < 1024px (mobile & tablet).
 * Preserves all existing navigation actions and handlers without duplicating logic.
 */
export default function MobileNavigationDrawer({
  isOpen,
  onClose,
  goToHome,
  openHistory,
  openProgress,
  openLeaderboard,
  openAchievements,
  scrollToCategories,
  switchToBattleMode,
  quizHistoryCount = 0,
  avgAccuracy = 0,
  gameState = 'lobby',
  modalOpen = null,
  authSession = null,
  playerName = 'User',
  onLogout,
  theme = 'dark',
  toggleTheme,
  soundEnabled = true,
  toggleSound
}) {
  return (
    <>
      {/* Semi-transparent backdrop overlay */}
      <div
        className={`mobile-nav-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in drawer container */}
      <aside
        id="mobile-nav-drawer"
        className={`mobile-nav-drawer ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
      >
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-brand">
            <span className="drawer-brand-icon">🧠</span>
            <div className="drawer-brand-text">
              <span className="drawer-brand-name">
                QUIZ <span className="drawer-brand-highlight">BATTLE</span>
              </span>
              <span className="drawer-brand-tagline">Navigation Menu</span>
            </div>
          </div>
          <button
            className="drawer-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            title="Close Menu (Esc)"
          >
            <FiX />
          </button>
        </div>

        {/* Drawer User Card */}
        {authSession && (
          <div className="drawer-user-card">
            <div className="drawer-user-avatar">
              <FiUser />
            </div>
            <div className="drawer-user-info">
              <span className="drawer-user-name">
                {authSession.username || playerName || 'User'}
              </span>
              <span className="drawer-user-email">
                {authSession.email || 'Registered Player'}
              </span>
            </div>
          </div>
        )}

        {/* Scrollable Navigation Body */}
        <div className="drawer-body">
          {/* Main Navigation Section */}
          <p className="drawer-section-title">NAVIGATION</p>
          <div className="drawer-nav-group">
            <button
              className={`drawer-nav-btn ${gameState === 'lobby' && !modalOpen ? 'active' : ''}`}
              type="button"
              onClick={() => {
                onClose()
                goToHome()
              }}
              title="Home Dashboard"
            >
              <FiHome className="drawer-nav-icon" />
              <span>Home</span>
            </button>

            <button
              className={`drawer-nav-btn ${modalOpen === 'history' ? 'active' : ''}`}
              type="button"
              onClick={() => {
                onClose()
                openHistory()
              }}
              title="Quiz History"
            >
              <FiClock className="drawer-nav-icon" />
              <span>Quiz History</span>
              {quizHistoryCount > 0 && (
                <span className="drawer-badge">{quizHistoryCount}</span>
              )}
            </button>

            <button
              className={`drawer-nav-btn ${modalOpen === 'progress' ? 'active' : ''}`}
              type="button"
              onClick={() => {
                onClose()
                openProgress()
              }}
              title="My Progress Dashboard"
            >
              <FiTrendingUp className="drawer-nav-icon" />
              <span>My Progress</span>
              {quizHistoryCount > 0 && (
                <span className="drawer-badge">{avgAccuracy}%</span>
              )}
            </button>

            <button
              className={`drawer-nav-btn ${modalOpen === 'leaderboard' ? 'active' : ''}`}
              type="button"
              onClick={() => {
                onClose()
                openLeaderboard()
              }}
              title="Leaderboard Rankings"
            >
              <FiAward className="drawer-nav-icon" />
              <span>Leaderboard</span>
            </button>

            <button
              className={`drawer-nav-btn ${modalOpen === 'achievements' ? 'active' : ''}`}
              type="button"
              onClick={() => {
                onClose()
                openAchievements()
              }}
              title="Badges & Achievements"
            >
              <FiCheckSquare className="drawer-nav-icon" />
              <span>Achievements</span>
            </button>
          </div>

          <div className="drawer-divider" />

          {/* Feature Shortcuts Section */}
          <p className="drawer-section-title">FEATURE SHORTCUTS</p>
          <div className="drawer-nav-group">
            <button
              className="drawer-feature-card"
              type="button"
              onClick={() => {
                onClose()
                scrollToCategories()
              }}
              title="Browse Categories"
            >
              <span className="drawer-feat-icon">🎮</span>
              <div className="drawer-feat-text">
                <h5>Categories</h5>
                <p>Browse 13+ CS topics</p>
              </div>
            </button>

            <button
              className="drawer-feature-card"
              type="button"
              onClick={() => {
                onClose()
                switchToBattleMode()
              }}
              title="Switch to 2-Player Battle Mode"
            >
              <span className="drawer-feat-icon">👥</span>
              <div className="drawer-feat-text">
                <h5>Battle Mode</h5>
                <p>2-player head-to-head</p>
              </div>
            </button>

            <button
              className="drawer-feature-card"
              type="button"
              onClick={() => {
                onClose()
                openProgress()
              }}
              title="Track Mastery and Progress"
            >
              <span className="drawer-feat-icon">⭐</span>
              <div className="drawer-feat-text">
                <h5>Track Progress</h5>
                <p>Improve mastery</p>
              </div>
            </button>
          </div>

          <div className="drawer-divider" />

          {/* Quick Settings & Logout */}
          <p className="drawer-section-title">PREFERENCES & ACCOUNT</p>
          <div className="drawer-controls-row">
            {toggleTheme && (
              <button
                className="drawer-ctrl-btn"
                type="button"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <FiSun /> : <FiMoon />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            )}

            {toggleSound && (
              <button
                className="drawer-ctrl-btn"
                type="button"
                onClick={toggleSound}
                title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
              >
                {soundEnabled ? <FiVolume2 /> : <FiVolumeX />}
                <span>{soundEnabled ? 'Sound On' : 'Muted'}</span>
              </button>
            )}
          </div>

          {onLogout && (
            <button
              className="drawer-logout-btn"
              type="button"
              onClick={() => {
                onClose()
                onLogout()
              }}
              title="Logout from Quiz Battle"
            >
              <FiLogOut />
              <span>Logout Account</span>
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
