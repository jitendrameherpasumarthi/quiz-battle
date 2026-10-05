/**
 * Utility functions for computing user progress, trends, topic analytics, and comparisons from Quiz History records.
 */

/**
 * Filters history records by time period ('all', '7days', '30days').
 *
 * @param {Array} history - Array of quiz history records.
 * @param {string} filter - 'all' | '7days' | '30days'
 * @returns {Array} Filtered list of history records.
 */
export function filterHistoryByTime(history, filter = 'all') {
  if (!Array.isArray(history) || history.length === 0) return []
  if (filter === 'all') return history

  const now = Date.now()
  const days = filter === '7days' ? 7 : filter === '30days' ? 30 : 0
  if (days === 0) return history

  const cutoff = now - days * 24 * 60 * 60 * 1000

  return history.filter((item) => {
    if (!item.date) return true
    try {
      const itemTime = new Date(item.date).getTime()
      return isNaN(itemTime) || itemTime >= cutoff
    } catch {
      return true
    }
  })
}

/**
 * Calculates overall statistics from history records.
 * Average accuracy is computed as (totalCorrect / totalQuestions) * 100.
 *
 * @param {Array} history - List of quiz history records.
 * @returns {Object} Overall summary stats.
 */
export function calculateOverallStats(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return {
      totalQuizzes: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      totalSkipped: 0,
      avgAccuracy: 0,
      avgScore: 0,
      bestStreak: 0
    }
  }

  let totalQuestions = 0
  let totalCorrect = 0
  let totalIncorrect = 0
  let totalSkipped = 0
  let totalScore = 0
  let bestStreak = 0

  history.forEach((item) => {
    const qCount = typeof item.questionCount === 'number' ? item.questionCount : (item.total || 0)
    totalQuestions += qCount
    totalCorrect += (typeof item.correct === 'number' ? item.correct : 0)
    totalIncorrect += (typeof item.incorrect === 'number' ? item.incorrect : 0)
    totalSkipped += (typeof item.skipped === 'number' ? item.skipped : 0)
    totalScore += (typeof item.score === 'number' ? item.score : 0)
    if (typeof item.bestStreak === 'number' && item.bestStreak > bestStreak) {
      bestStreak = item.bestStreak
    }
  })

  const totalQuizzes = history.length
  const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
  const avgScore = totalQuizzes > 0 ? Math.round(totalScore / totalQuizzes) : 0

  return {
    totalQuizzes,
    totalQuestions,
    totalCorrect,
    totalIncorrect,
    totalSkipped,
    avgAccuracy,
    avgScore,
    bestStreak
  }
}

/**
 * Calculates per-category aggregated statistics and accuracy.
 *
 * @param {Array} history - List of history records.
 * @returns {Array} List of category analytics objects sorted by accuracy descending.
 */
export function calculateCategoryStats(history) {
  if (!Array.isArray(history) || history.length === 0) return []

  const map = {}

  history.forEach((item) => {
    const category = item.category || 'General'
    if (!map[category]) {
      map[category] = {
        category,
        quizzes: 0,
        totalQuestions: 0,
        correct: 0,
        incorrect: 0,
        skipped: 0
      }
    }

    const qCount = typeof item.questionCount === 'number' ? item.questionCount : (item.total || 0)
    map[category].quizzes += 1
    map[category].totalQuestions += qCount
    map[category].correct += (typeof item.correct === 'number' ? item.correct : 0)
    map[category].incorrect += (typeof item.incorrect === 'number' ? item.incorrect : 0)
    map[category].skipped += (typeof item.skipped === 'number' ? item.skipped : 0)
  })

  return Object.values(map).map((cat) => {
    const accuracy = cat.totalQuestions > 0 ? Math.round((cat.correct / cat.totalQuestions) * 100) : 0
    return {
      ...cat,
      accuracy
    }
  }).sort((a, b) => b.accuracy - a.accuracy || b.totalQuestions - a.totalQuestions)
}

/**
 * Formats a short date for charts (e.g., 'Sep 14').
 */
function formatShortDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

/**
 * Generates chronological chart data points for Accuracy Over Time (up to 20 latest quizzes).
 *
 * @param {Array} history - List of history records (newest first).
 * @returns {Array} Chronological data points.
 */
export function calculateAccuracyTrend(history) {
  if (!Array.isArray(history) || history.length === 0) return []

  // History is newest first, so take latest 20 and reverse to chronological
  const chronological = [...history].slice(0, 20).reverse()

  return chronological.map((item, idx) => {
    const qCount = typeof item.questionCount === 'number' ? item.questionCount : (item.total || 0)
    const acc = typeof item.accuracy === 'number'
      ? item.accuracy
      : (qCount > 0 ? Math.round(((item.correct || 0) / qCount) * 100) : 0)

    return {
      quizNum: idx + 1,
      quizLabel: `Quiz ${idx + 1}`,
      date: formatShortDate(item.date),
      accuracy: acc,
      category: item.category || 'All',
      difficulty: item.difficulty || 'All',
      score: item.score || 0
    }
  })
}

/**
 * Generates chronological chart data points for Score Over Time (up to 20 latest quizzes).
 *
 * @param {Array} history - List of history records (newest first).
 * @returns {Array} Chronological data points.
 */
export function calculateScoreTrend(history) {
  if (!Array.isArray(history) || history.length === 0) return []

  const chronological = [...history].slice(0, 20).reverse()

  return chronological.map((item, idx) => ({
    quizNum: idx + 1,
    quizLabel: `Quiz ${idx + 1}`,
    date: formatShortDate(item.date),
    score: typeof item.score === 'number' ? item.score : 0,
    category: item.category || 'All',
    accuracy: item.accuracy || 0
  }))
}

/**
 * Determines the strongest topic based on highest accuracy with at least minQuestions.
 *
 * @param {Array} categoryStats - Category stats list from calculateCategoryStats.
 * @param {number} [minQuestions=5] - Minimum questions required for consideration.
 * @returns {Object|null} Strongest category or null.
 */
export function findStrongestTopic(categoryStats, minQuestions = 5) {
  if (!Array.isArray(categoryStats) || categoryStats.length === 0) return null

  const eligible = categoryStats.filter(
    (c) => (c.category || '').toLowerCase() !== 'all' && c.totalQuestions >= minQuestions
  )

  if (eligible.length === 0) return null

  // Sort by accuracy descending, then total questions descending
  const sorted = [...eligible].sort(
    (a, b) => b.accuracy - a.accuracy || b.totalQuestions - a.totalQuestions
  )
  return sorted[0] || null
}

/**
 * Determines the weakest topic (needs improvement) based on lowest accuracy with at least minQuestions.
 *
 * @param {Array} categoryStats - Category stats list from calculateCategoryStats.
 * @param {number} [minQuestions=5] - Minimum questions required for consideration.
 * @returns {Object|null} Weakest category or null.
 */
export function findWeakestTopic(categoryStats, minQuestions = 5) {
  if (!Array.isArray(categoryStats) || categoryStats.length === 0) return null

  const eligible = categoryStats.filter(
    (c) => (c.category || '').toLowerCase() !== 'all' && c.totalQuestions >= minQuestions
  )

  if (eligible.length === 0) return null

  // Sort by accuracy ascending, then total questions descending
  const sorted = [...eligible].sort(
    (a, b) => a.accuracy - b.accuracy || b.totalQuestions - a.totalQuestions
  )
  return sorted[0] || null
}

/**
 * Compares recent progress (Last 5 quizzes vs Previous 5 quizzes).
 *
 * @param {Array} history - List of history records (newest first).
 * @returns {Object} Comparison insights.
 */
export function calculateRecentProgress(history) {
  if (!Array.isArray(history) || history.length < 2) {
    return {
      hasComparison: false,
      message: 'Complete at least 2 quizzes to see progress comparisons.'
    }
  }

  let recentGroup = []
  let previousGroup = []
  let description = ''

  if (history.length >= 10) {
    recentGroup = history.slice(0, 5)
    previousGroup = history.slice(5, 10)
    description = 'Comparing last 5 quizzes vs previous 5 quizzes'
  } else {
    // Dynamically split into 2 equal halves
    const half = Math.floor(history.length / 2)
    recentGroup = history.slice(0, half)
    previousGroup = history.slice(half, half * 2)
    description = `Comparing last ${half} quiz${half === 1 ? '' : 'zes'} vs previous ${half} quiz${half === 1 ? '' : 'zes'}`
  }

  const calcGroupAccuracy = (group) => {
    let correct = 0
    let questions = 0
    group.forEach((item) => {
      questions += (typeof item.questionCount === 'number' ? item.questionCount : (item.total || 0))
      correct += (typeof item.correct === 'number' ? item.correct : 0)
    })
    return questions > 0 ? Math.round((correct / questions) * 100) : 0
  }

  const recentAcc = calcGroupAccuracy(recentGroup)
  const prevAcc = calcGroupAccuracy(previousGroup)
  const delta = recentAcc - prevAcc

  let feedback = ''
  let status = 'neutral' // 'improving' | 'declining' | 'neutral'

  if (delta > 0) {
    feedback = "🔥 You're improving! Keep up the great momentum."
    status = 'improving'
  } else if (delta < 0) {
    feedback = '📉 Your recent accuracy has decreased. Try practicing your weakest topic.'
    status = 'declining'
  } else {
    feedback = '⚖️ Your performance is steady. Push for higher streaks!'
    status = 'neutral'
  }

  return {
    hasComparison: true,
    recentAccuracy: recentAcc,
    previousAccuracy: prevAcc,
    delta,
    description,
    feedback,
    status,
    recentCount: recentGroup.length,
    previousCount: previousGroup.length
  }
}
