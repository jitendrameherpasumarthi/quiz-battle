/**
 * Authentication utility for Quiz Battle (Demo / Frontend LocalStorage Auth)
 */

export const AUTH_STORAGE_KEYS = {
  AUTH_USER: 'quiz-auth-user',
  AUTH_SESSION: 'quiz-auth-session',
  AUTH_ACCOUNTS: 'quiz-auth-accounts'
}

/**
 * Fast deterministic string hashing for frontend demo credentials.
 * Ensures passwords are NEVER stored in plaintext in localStorage.
 */
export function hashPassword(str) {
  if (!str) return ''
  let hash1 = 5381
  let hash2 = 52711
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash1 = ((hash1 << 5) + hash1) ^ char
    hash2 = ((hash2 << 5) + hash2) ^ char
  }
  // Convert 32-bit integers to 64-char hex-like string representation
  const p1 = (hash1 >>> 0).toString(16).padStart(8, '0')
  const p2 = (hash2 >>> 0).toString(16).padStart(8, '0')
  const p3 = ((hash1 ^ hash2) >>> 0).toString(16).padStart(8, '0')
  const p4 = ((hash1 + hash2) >>> 0).toString(16).padStart(8, '0')
  return `h_${p1}${p2}${p3}${p4}`
}

/**
 * Pre-seeded default accounts for seamless demo login.
 */
const DEFAULT_ACCOUNTS = [
  {
    id: 'user-demo-meher',
    fullName: 'Jitendra Meher',
    username: 'meher',
    email: 'meher@example.com',
    passwordHash: hashPassword('password123'),
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'user-demo-player',
    fullName: 'Quiz Champion',
    username: 'quizmaster',
    email: 'master@quizbattle.io',
    passwordHash: hashPassword('password123'),
    createdAt: '2026-01-01T00:00:00.000Z'
  }
]

/**
 * Safely parse JSON from localStorage with fallback.
 */
function safeGet(key, defaultValue) {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null || raw === undefined) return defaultValue
    return JSON.parse(raw)
  } catch {
    return defaultValue
  }
}

/**
 * Safely stringify and write to localStorage.
 */
function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn(`LocalStorage write failed for key "${key}":`, e)
  }
}

/**
 * Retrieve registered accounts from localStorage.
 */
export function getRegisteredAccounts() {
  const accounts = safeGet(AUTH_STORAGE_KEYS.AUTH_ACCOUNTS, null)
  if (Array.isArray(accounts) && accounts.length > 0) {
    return accounts
  }
  // Initialize with default demo accounts if none exist
  safeSet(AUTH_STORAGE_KEYS.AUTH_ACCOUNTS, DEFAULT_ACCOUNTS)
  return DEFAULT_ACCOUNTS
}

/**
 * Save registered accounts list.
 */
export function saveRegisteredAccounts(accounts) {
  safeSet(AUTH_STORAGE_KEYS.AUTH_ACCOUNTS, Array.isArray(accounts) ? accounts : [])
}

/**
 * Get the currently active auth session.
 */
export function getAuthSession() {
  const session = safeGet(AUTH_STORAGE_KEYS.AUTH_SESSION, null)
  if (session && session.loggedIn && session.username) {
    return session
  }
  return null
}

/**
 * Get current user object or null.
 */
export function getCurrentUser() {
  return getAuthSession()
}

/**
 * Get current user ID or null.
 */
export function getCurrentUserId() {
  const session = getAuthSession()
  return session ? session.id : null
}

/**
 * Save the active auth session and user info.
 */
export function saveAuthSession(session) {
  if (!session) {
    clearAuthSession()
    return
  }
  const sessionData = {
    id: session.id || `user-${Date.now()}`,
    username: session.username,
    email: session.email,
    fullName: session.fullName || session.username,
    loggedIn: true,
    token: session.token || `demo-token-${Date.now()}`,
    lastLogin: new Date().toISOString()
  }

  const userData = {
    id: sessionData.id,
    username: sessionData.username,
    email: sessionData.email,
    fullName: sessionData.fullName,
    loggedIn: true
  }

  safeSet(AUTH_STORAGE_KEYS.AUTH_SESSION, sessionData)
  safeSet(AUTH_STORAGE_KEYS.AUTH_USER, userData)
}

/**
 * Clear the auth session (Logout).
 * Note: Keeps all other Quiz Battle data (History, Leaderboard, Personal Best, Theme, Sound).
 */
export function clearAuthSession() {
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEYS.AUTH_SESSION)
    window.localStorage.removeItem(AUTH_STORAGE_KEYS.AUTH_USER)
  } catch (e) {
    console.warn('Failed to clear auth session:', e)
  }
}

/**
 * Email format validation.
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false
  const trimmed = email.trim()
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(trimmed)
}

/**
 * Username validation (2-20 characters, alphanumeric & underscore).
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') return false
  const trimmed = username.trim()
  return trimmed.length >= 2 && trimmed.length <= 20 && /^[a-zA-Z0-9_]+$/.test(trimmed)
}

/**
 * Password validation (minimum 8 characters).
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') return false
  return password.length >= 8
}

/**
 * Attempt user login.
 * @param {Object} credentials - { identifier, password, rememberMe }
 * @returns {Object} - { success: boolean, session?: Object, user?: Object, error?: string }
 */
export function loginUser({ identifier, password, rememberMe = true }) {
  const trimmedId = (identifier || '').trim()
  const trimmedPass = (password || '')

  if (!trimmedId) {
    return { success: false, error: 'Please enter your username or email.' }
  }
  if (!trimmedPass) {
    return { success: false, error: 'Please enter your password.' }
  }

  const accounts = getRegisteredAccounts()
  const lowerId = trimmedId.toLowerCase()

  // Find user by either username or email
  const foundUser = accounts.find(
    (acc) => acc.username.toLowerCase() === lowerId || acc.email.toLowerCase() === lowerId
  )

  if (!foundUser) {
    return {
      success: false,
      error: 'Account not found with this username or email. Please check your credentials or create an account.'
    }
  }

  // Validate hashed password
  const inputHash = hashPassword(trimmedPass)
  if (foundUser.passwordHash !== inputHash) {
    return { success: false, error: 'Incorrect password. Please try again.' }
  }

  const session = {
    id: foundUser.id,
    username: foundUser.username,
    email: foundUser.email,
    fullName: foundUser.fullName,
    loggedIn: true,
    token: `demo-token-${Date.now()}`
  }

  saveAuthSession(session)

  // Automatically update player name for seamless integration
  try {
    window.localStorage.setItem('quiz-player-name', foundUser.username)
    window.localStorage.setItem(`quiz-player-name_${foundUser.id}`, foundUser.username)
  } catch {
    // ignore
  }

  return { success: true, session, user: foundUser }
}

/**
 * Attempt new user registration.
 * @param {Object} data - { fullName, username, email, password, confirmPassword }
 * @returns {Object} - { success: boolean, session?: Object, user?: Object, error?: string, fieldErrors?: Object }
 */
export function registerUser({ fullName, username, email, password, confirmPassword }) {
  const fName = (fullName || '').trim()
  const uName = (username || '').trim()
  const em = (email || '').trim().toLowerCase()
  const pass = password || ''
  const confPass = confirmPassword || ''

  const fieldErrors = {}

  if (!fName || fName.length < 2) {
    fieldErrors.fullName = 'Full name must be at least 2 characters.'
  }

  if (!validateUsername(uName)) {
    fieldErrors.username = 'Username must be 2–20 characters (letters, numbers, underscore).'
  }

  if (!validateEmail(em)) {
    fieldErrors.email = 'Please enter a valid email address (e.g., name@example.com).'
  }

  if (!validatePassword(pass)) {
    fieldErrors.password = 'Password must be at least 8 characters.'
  }

  if (pass !== confPass) {
    fieldErrors.confirmPassword = 'Passwords do not match.'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: 'Please fix the errors below.',
      fieldErrors
    }
  }

  const accounts = getRegisteredAccounts()

  // Check unique username
  const existingUsername = accounts.find((acc) => acc.username.toLowerCase() === uName.toLowerCase())
  if (existingUsername) {
    return {
      success: false,
      error: 'This username is already taken. Please choose another.',
      fieldErrors: { username: 'Username already in use.' }
    }
  }

  // Check unique email
  const existingEmail = accounts.find((acc) => acc.email.toLowerCase() === em)
  if (existingEmail) {
    return {
      success: false,
      error: 'An account with this email already exists. Please log in instead.',
      fieldErrors: { email: 'Email already registered.' }
    }
  }

  const newAccount = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    fullName: fName,
    username: uName,
    email: em,
    passwordHash: hashPassword(pass),
    createdAt: new Date().toISOString()
  }

  const updatedAccounts = [...accounts, newAccount]
  saveRegisteredAccounts(updatedAccounts)

  const session = {
    id: newAccount.id,
    username: newAccount.username,
    email: newAccount.email,
    fullName: newAccount.fullName,
    loggedIn: true,
    token: `demo-token-${Date.now()}`
  }

  saveAuthSession(session)

  // Automatically sync player name
  try {
    window.localStorage.setItem('quiz-player-name', newAccount.username)
    window.localStorage.setItem(`quiz-player-name_${newAccount.id}`, newAccount.username)
  } catch {
    // ignore
  }

  return { success: true, session, user: newAccount }
}
