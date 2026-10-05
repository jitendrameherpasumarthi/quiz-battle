import questionsJson from './questions.json' with { type: 'json' }

/**
 * Complete Question Bank loaded from the Kaggle Computer Science Theory QA Dataset.
 * Contains 172 theoretical questions across Operating Systems, Data Structures & Algorithms,
 * Computer Networks, Databases, Machine Learning & AI, Computer Architecture, and Software Engineering.
 */
export const questionBank = questionsJson

/**
 * Loads the complete dataset asynchronously from the public data directory,
 * falling back to the bundled question bank if the fetch fails or in offline environments.
 *
 * @returns {Promise<Array>} The complete list of questions.
 */
export async function loadQuestionsDataset() {
  try {
    const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/'
    const datasetUrl = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}data/questions.json`
    const response = await fetch(datasetUrl)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    if (Array.isArray(data) && data.length > 0) {
      return data
    }
    return questionBank
  } catch (err) {
    console.warn('Could not load data/questions.json via fetch, using bundled question bank.', err)
    return questionBank
  }
}
