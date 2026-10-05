/**
 * LocalStorage utility for Quiz Battle data persistence.
 * Provides multi-user data isolation for personal stats (History, Progress,
 * Personal Best, Achievements, Player Name) while preserving a global Leaderboard.
 */

export const STORAGE_KEYS = {
  PLAYER_NAME: 'quiz-player-name',
  THEME: 'quiz-theme',
  SOUND: 'quiz-sound',
  LEADERBOARD: 'quiz-leaderboard',
  PERSONAL_BEST: 'quiz-personal-best',
  ACHIEVEMENTS: 'quiz-achievements',
  QUIZ_HISTORY: 'quiz-history',
  AUTH_USER: 'quiz-auth-user',
  AUTH_SESSION: 'quiz-auth-session'
}

/**
 * Safely parses JSON from localStorage with a fallback default value.
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
 * Safely stringifies and writes data to localStorage.
 */
function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn(`LocalStorage write failed for key "${key}":`, e)
  }
}

/**
 * Generates a resilient unique identifier.
 */
function generateUniqueId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${Date.now()}-${crypto.randomUUID()}`
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Retrieves the currently active user session from localStorage.
 */
export function getCurrentUser() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.AUTH_SESSION)
    if (raw) {
      const session = JSON.parse(raw)
      if (session && session.loggedIn) {
        return session
      }
    }
  } catch {
    // ignore
  }
  return null
}

/**
 * Retrieves the currently active user ID from localStorage.
 */
export function getCurrentUserId() {
  const user = getCurrentUser()
  return user ? user.id : null
}

/**
 * Generates a user-scoped storage key if a user is logged in or specified.
 * Falls back to the global key when no user is active (ensures backward compatibility).
 */
export function getUserScopedKey(baseKey, explicitUserId) {
  const userId = explicitUserId || getCurrentUserId()
  if (userId) {
    return `${baseKey}_${userId}`
  }
  return baseKey
}

// --- Player Name ---
export function getStoredPlayerName(explicitUserId) {
  try {
    const userId = explicitUserId || getCurrentUserId()
    if (userId) {
      const scopedKey = `${STORAGE_KEYS.PLAYER_NAME}_${userId}`
      const val = window.localStorage.getItem(scopedKey)
      if (val) return val
      const session = getCurrentUser()
      if (session && session.username) return session.username
    }
    return window.localStorage.getItem(STORAGE_KEYS.PLAYER_NAME) || ''
  } catch {
    return ''
  }
}

export function saveStoredPlayerName(name, explicitUserId) {
  try {
    const trimmed = (name || '').trim()
    const userId = explicitUserId || getCurrentUserId()
    if (userId) {
      window.localStorage.setItem(`${STORAGE_KEYS.PLAYER_NAME}_${userId}`, trimmed)
    }
    window.localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, trimmed)
  } catch {
    // ignore
  }
}

// --- Sound Preference (Global) ---
export function getStoredSoundEnabled() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.SOUND)
    if (raw === null) return true // Default ON
    return raw === 'true'
  } catch {
    return true
  }
}

export function saveStoredSoundEnabled(enabled) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.SOUND, enabled ? 'true' : 'false')
  } catch {
    // ignore
  }
}

// --- Global Leaderboard (Shared Across All Users) ---
export function getStoredLeaderboard() {
  const board = safeGet(STORAGE_KEYS.LEADERBOARD, [])
  return Array.isArray(board) ? board : []
}

export function saveLeaderboardEntry(entry) {
  const current = getStoredLeaderboard()
  const userId = entry.userId || getCurrentUserId() || undefined
  const newEntry = {
    id: Date.now().toString(),
    userId,
    playerName: entry.playerName || 'Anonymous',
    score: entry.score || 0,
    difficulty: entry.difficulty || 'All',
    category: entry.category || 'All',
    correct: entry.correct || 0,
    total: entry.total || 20,
    accuracy: entry.accuracy || 0,
    bestStreak: entry.bestStreak || 0,
    date: new Date().toLocaleDateString()
  }

  const updated = [...current, newEntry]
    .sort((a, b) => b.score - a.score || b.accuracy - a.accuracy)
    .slice(0, 20) // Keep top 20

  safeSet(STORAGE_KEYS.LEADERBOARD, updated)
  return updated
}

// --- Personal Best (Isolated per User) ---
export function getPersonalBest(playerName, explicitUserId) {
  const userId = explicitUserId || getCurrentUserId()
  const key = getUserScopedKey(STORAGE_KEYS.PERSONAL_BEST, userId)
  const nameKey = (playerName || '').trim().toLowerCase()

  const allBests = safeGet(key, null)
  if (allBests !== null) {
    if (nameKey && allBests[nameKey]) return allBests[nameKey]
    if (!nameKey) return Object.values(allBests)[0] || null
    return null
  }

  // Fallback to legacy global personal best if no user session
  if (!userId) {
    const globalBests = safeGet(STORAGE_KEYS.PERSONAL_BEST, {})
    return nameKey ? globalBests[nameKey] || null : null
  }

  return null
}

export function updatePersonalBest(playerName, stats, explicitUserId) {
  const userId = explicitUserId || getCurrentUserId()
  const key = getUserScopedKey(STORAGE_KEYS.PERSONAL_BEST, userId)
  const nameKey = (playerName || '').trim().toLowerCase()
  if (!nameKey) return { isNewRecord: false, best: stats, personalBest: stats }

  const allBests = safeGet(key, {})
  const existing = allBests[nameKey] || {
    bestScore: 0,
    bestAccuracy: 0,
    bestStreak: 0
  }

  const isNewRecord = (stats.score || 0) > (existing.bestScore || 0)

  const updated = {
    bestScore: Math.max(existing.bestScore || 0, stats.score || 0),
    bestAccuracy: Math.max(existing.bestAccuracy || 0, stats.accuracy || 0),
    bestStreak: Math.max(existing.bestStreak || 0, stats.bestStreak || 0),
    lastPlayed: new Date().toLocaleDateString()
  }

  allBests[nameKey] = updated
  safeSet(key, allBests)

  if (!userId) {
    safeSet(STORAGE_KEYS.PERSONAL_BEST, allBests)
  }

  return { isNewRecord, best: updated, personalBest: updated }
}

// --- Achievements (Isolated per User) ---
export function getStoredAchievements(explicitUserId) {
  const userId = explicitUserId || getCurrentUserId()
  const key = getUserScopedKey(STORAGE_KEYS.ACHIEVEMENTS, userId)

  const list = safeGet(key, null)
  if (list !== null) {
    return Array.isArray(list) ? list : []
  }

  if (!userId) {
    const globalList = safeGet(STORAGE_KEYS.ACHIEVEMENTS, [])
    return Array.isArray(globalList) ? globalList : []
  }

  return []
}

export function unlockAchievement(achievementId, explicitUserId) {
  const userId = explicitUserId || getCurrentUserId()
  const key = getUserScopedKey(STORAGE_KEYS.ACHIEVEMENTS, userId)

  const current = getStoredAchievements(userId)
  if (!current.includes(achievementId)) {
    const updated = [...current, achievementId]
    safeSet(key, updated)
    if (!userId) {
      safeSet(STORAGE_KEYS.ACHIEVEMENTS, updated)
    }
    return { isNew: true, achievements: updated }
  }
  return { isNew: false, achievements: current }
}

// --- Quiz History (Isolated per User) ---
export function getQuizHistory(explicitUserId) {
  const userId = explicitUserId || getCurrentUserId()
  const key = getUserScopedKey(STORAGE_KEYS.QUIZ_HISTORY, userId)

  const history = safeGet(key, null)
  if (history !== null) {
    return Array.isArray(history) ? history : []
  }

  // Fallback to legacy global history only if unauthenticated (e.g. standalone test)
  if (!userId) {
    const globalHistory = safeGet(STORAGE_KEYS.QUIZ_HISTORY, [])
    return Array.isArray(globalHistory) ? globalHistory : []
  }

  return []
}

export function saveQuizHistory(history, explicitUserId) {
  const userId = explicitUserId || getCurrentUserId()
  const key = getUserScopedKey(STORAGE_KEYS.QUIZ_HISTORY, userId)

  const list = Array.isArray(history) ? history.slice(0, 20) : []
  safeSet(key, list)
  if (!userId) {
    safeSet(STORAGE_KEYS.QUIZ_HISTORY, list)
  }
  return list
}

export function addQuizHistory(record, explicitUserId) {
  const userId = explicitUserId || getCurrentUserId()
  const key = getUserScopedKey(STORAGE_KEYS.QUIZ_HISTORY, userId)
  const current = getQuizHistory(userId)
  const uniqueId = record.id || generateUniqueId()

  const currentUser = getCurrentUser()
  const effectiveUserId = record.userId || userId || undefined
  const effectiveUsername = record.username || (currentUser ? currentUser.username : undefined)

  const newRecord = {
    id: uniqueId,
    userId: effectiveUserId,
    username: effectiveUsername,
    playerName: record.playerName || (currentUser ? currentUser.username : 'Player 1'),
    mode: record.mode || 'Practice',
    category: record.category || 'All',
    difficulty: record.difficulty || 'All',
    questionCount: typeof record.questionCount === 'number'
      ? record.questionCount
      : (typeof record.total === 'number' ? record.total : 0),
    correct: typeof record.correct === 'number' ? record.correct : 0,
    incorrect: typeof record.incorrect === 'number' ? record.incorrect : 0,
    skipped: typeof record.skipped === 'number' ? record.skipped : 0,
    accuracy: typeof record.accuracy === 'number' ? record.accuracy : 0,
    score: typeof record.score === 'number' ? record.score : 0,
    bestStreak: typeof record.bestStreak === 'number' ? record.bestStreak : 0,
    livesLeft: typeof record.livesLeft === 'number'
      ? record.livesLeft
      : (typeof record.lives === 'number' ? record.lives : 0),
    date: record.date || new Date().toISOString(),
    // Optional Battle Mode details
    player1Name: record.player1Name,
    player2Name: record.player2Name,
    player1Score: record.player1Score,
    player2Score: record.player2Score,
    player1Accuracy: record.player1Accuracy,
    player2Accuracy: record.player2Accuracy,
    player1Correct: record.player1Correct,
    player2Correct: record.player2Correct,
    winner: record.winner,
    // Optional Review Questions for question-by-question past quiz review
    reviewQuestions: Array.isArray(record.reviewQuestions)
      ? record.reviewQuestions.map((rq, idx) => ({
          questionId: rq.questionId || `q-${idx}`,
          question: rq.question || '',
          options: Array.isArray(rq.options) ? rq.options : [],
          correctAnswer: rq.correctAnswer || '',
          userAnswer: rq.userAnswer !== undefined ? rq.userAnswer : null,
          isCorrect: Boolean(rq.isCorrect),
          isSkipped: Boolean(rq.isSkipped),
          isTimeout: Boolean(rq.isTimeout),
          fact: rq.fact || '',
          category: rq.category,
          difficulty: rq.difficulty
        }))
      : undefined
  }

  // Prevent duplicate insertion if an entry with exact same id exists
  const existingFiltered = current.filter((item) => item.id !== newRecord.id)
  const updated = [newRecord, ...existingFiltered].slice(0, 20)

  safeSet(key, updated)
  if (!userId) {
    safeSet(STORAGE_KEYS.QUIZ_HISTORY, updated)
  }
  return updated
}

export function clearQuizHistory(explicitUserId) {
  const userId = explicitUserId || getCurrentUserId()
  const key = getUserScopedKey(STORAGE_KEYS.QUIZ_HISTORY, userId)

  safeSet(key, [])
  if (!userId) {
    safeSet(STORAGE_KEYS.QUIZ_HISTORY, [])
  }
  return []
}
