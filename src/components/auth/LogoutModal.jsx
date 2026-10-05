import { FiLogOut, FiX } from 'react-icons/fi'

export default function LogoutModal({ isOpen, onCancel, onConfirm, username }) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-card logout-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiLogOut style={{ color: 'var(--red)', fontSize: '18px' }} />
            <h2 id="logout-title">Confirm Logout</h2>
          </div>
          <button
            className="nav-icon-btn"
            type="button"
            onClick={onCancel}
            title="Cancel"
          >
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          <p className="logout-confirm-text">
            Are you sure you want to logout{username ? `, ${username}` : ''}?
          </p>
          <p className="logout-preserve-note">
            Your quiz history, personal best records, achievements, and leaderboard scores will remain safely preserved on this device.
          </p>

          <div className="logout-actions-row">
            <button
              className="secondary-button"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="primary-button logout-confirm-btn"
              type="button"
              onClick={onConfirm}
            >
              <FiLogOut />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
