/**
 * Utility functions for question shuffling, filtering, category extraction, and hint elimination.
 */

/**
 * Fisher-Yates shuffle algorithm.
 * Returns a new shuffled copy of the provided array.
 *
 * @template T
 * @param {T[]} array - The array to shuffle.
 * @returns {T[]} A new array with elements shuffled in random order.
 */
export function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = temp
  }
  return shuffled
}

/**
 * Prepares a question by creating a shallow copy with its answer options shuffled.
 * This guarantees the correct answer is randomly distributed among positions A, B, C, D.
 *
 * @param {Object} question - The raw question object.
 * @returns {Object} A new question object with randomized options order.
 */
export function prepareQuestion(question) {
  if (!question || !Array.isArray(question.options)) {
    return question
  }
  return {
    ...question,
    options: shuffleArray(question.options)
  }
}

/**
 * Extracts unique categories from the question dataset.
 *
 * @param {Array} allQuestions - The complete dataset.
 * @returns {string[]} List of unique categories starting with 'All'.
 */
export function getCategories(allQuestions) {
  if (!Array.isArray(allQuestions) || allQuestions.length === 0) {
    return ['All']
  }
  const uniqueCats = Array.from(
    new Set(allQuestions.map((q) => q.category).filter(Boolean))
  ).sort()
  return ['All', ...uniqueCats]
}

/**
 * Randomly selects `count` unique questions from `allQuestions` matching the given `difficulty` and `category`.
 *
 * @param {Array} allQuestions - The complete dataset of questions.
 * @param {Object|string} options - Configuration object { difficulty, category, count } or difficulty string for backwards compatibility.
 * @param {number} [legacyCount] - Legacy parameter for question count when options is a string.
 * @returns {Array} Exactly `count` (or max available) unique questions with randomized option positions.
 */
export function selectRandomQuestions(allQuestions, options = {}, legacyCount = 20) {
  if (!Array.isArray(allQuestions) || allQuestions.length === 0) {
    return []
  }

  // Handle both (allQuestions, 'Easy', 20) and (allQuestions, { difficulty: 'Easy', category: 'All', count: 20 })
  let difficulty = 'All'
  let category = 'All'
  let count = 20

  if (typeof options === 'string') {
    difficulty = options
    count = typeof legacyCount === 'number' ? legacyCount : 20
  } else if (typeof options === 'object' && options !== null) {
    difficulty = options.difficulty || 'All'
    category = options.category || 'All'
    count = typeof options.count === 'number' ? options.count : 20
  }

  const normalizedDifficulty = (difficulty || 'All').toLowerCase()
  const normalizedCategory = (category || 'All').toLowerCase()

  // Filter pool by difficulty AND category
  const filteredPool = allQuestions.filter((item) => {
    const itemDiff = (item.difficulty || '').toLowerCase()
    const itemCat = (item.category || '').toLowerCase()

    const diffMatch = normalizedDifficulty === 'all' || itemDiff === normalizedDifficulty
    const catMatch = normalizedCategory === 'all' || itemCat === normalizedCategory

    return diffMatch && catMatch
  })

  // Handle case where pool is smaller than requested count
  if (filteredPool.length < count) {
    console.warn(
      `Not enough questions available for Category "${category}" + Difficulty "${difficulty}". Requested: ${count}, Available: ${filteredPool.length}`
    )
    if (filteredPool.length === 0) {
      return []
    }
  }

  // Fisher-Yates shuffle on the filtered pool
  const randomizedPool = shuffleArray(filteredPool)

  // Select count unique questions
  const selectedPool = randomizedPool.slice(0, Math.min(count, randomizedPool.length))

  // Randomize answer options for each selected question
  const preparedQuestions = selectedPool.map(prepareQuestion)

  return preparedQuestions
}

/**
 * Calculates eliminated wrong options for the hint system.
 * Eliminates up to maxEliminate (1 or 2) incorrect options without removing the correct answer.
 *
 * @param {Object} question - The current question object.
 * @param {number} [maxEliminate=2] - Number of wrong options to eliminate.
 * @returns {string[]} Array of eliminated option text strings.
 */
export function getEliminatedOptions(question, maxEliminate = 2) {
  if (!question || !Array.isArray(question.options) || !question.answer) {
    return []
  }
  const wrongOptions = question.options.filter((opt) => opt !== question.answer)
  if (wrongOptions.length === 0) {
    return []
  }
  const shuffledWrong = shuffleArray(wrongOptions)
  return shuffledWrong.slice(0, Math.min(maxEliminate, wrongOptions.length - 1 || 1))
}
