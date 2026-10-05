import { getStoredAchievements, unlockAchievement } from './storageUtils.js'


export const ACHIEVEMENTS = [
  {
    id: 'on_fire',
    icon: '🔥',
    title: 'ON FIRE',
    description: 'Get 5 correct answers in a row in a single battle.'
  },
  {
    id: 'sharpshooter',
    icon: '🎯',
    title: 'SHARPSHOOTER',
    description: 'Finish a quiz with 90% or higher accuracy.'
  },
  {
    id: 'perfect_mind',
    icon: '🧠',
    title: 'PERFECT MIND',
    description: 'Achieve a flawless 100% score in a round.'
  },
  {
    id: 'speed_demon',
    icon: '⚡',
    title: 'SPEED DEMON',
    description: 'Answer questions with an average time under 5 seconds.'
  },
  {
    id: 'survivor',
    icon: '❤️',
    title: 'SURVIVOR',
    description: 'Finish a quiz with exactly 1 life remaining.'
  },
  {
    id: 'category_master',
    icon: '🏅',
    title: 'CATEGORY MASTER',
    description: 'Score 100% in a dedicated category quiz.'
  },
  {
    id: 'quiz_master',
    icon: '🏆',
    title: 'QUIZ MASTER',
    description: 'Complete 10 total quizzes on this device.'
  },
  {
    id: 'battle_champ',
    icon: '⚔️',
    title: 'BATTLE CHAMPION',
    description: 'Win a 2-Player local battle against a friend.'
  }
]

/**
 * Checks round statistics and unlocks any matching achievements.
 *
 * @param {Object} stats - The game results stats.
 * @returns {Array} List of newly unlocked achievement objects.
 */
export function evaluateAchievements(stats) {
  const newlyUnlocked = []

  // 1. On Fire (5 streak)
  if ((stats.bestStreak || 0) >= 5) {
    const res = unlockAchievement('on_fire')
    if (res.isNew) newlyUnlocked.push(ACHIEVEMENTS.find((a) => a.id === 'on_fire'))
  }

  // 2. Sharpshooter (>= 90% accuracy)
  if ((stats.accuracy || 0) >= 90 && (stats.total || 0) >= 10) {
    const res = unlockAchievement('sharpshooter')
    if (res.isNew) newlyUnlocked.push(ACHIEVEMENTS.find((a) => a.id === 'sharpshooter'))
  }

  // 3. Perfect Mind (100% accuracy)
  if ((stats.correct || 0) === (stats.total || 0) && (stats.total || 0) >= 10) {
    const res = unlockAchievement('perfect_mind')
    if (res.isNew) newlyUnlocked.push(ACHIEVEMENTS.find((a) => a.id === 'perfect_mind'))
  }

  // 4. Speed Demon (avg response time < 5s)
  if (stats.avgTime && stats.avgTime < 5 && (stats.correct || 0) >= 5) {
    const res = unlockAchievement('speed_demon')
    if (res.isNew) newlyUnlocked.push(ACHIEVEMENTS.find((a) => a.id === 'speed_demon'))
  }

  // 5. Survivor (finished with 1 life)
  if (stats.lives === 1 && (stats.total || 0) >= 10) {
    const res = unlockAchievement('survivor')
    if (res.isNew) newlyUnlocked.push(ACHIEVEMENTS.find((a) => a.id === 'survivor'))
  }

  // 6. Category Master (100% in a specific category)
  if (stats.category && stats.category !== 'All' && (stats.correct || 0) === (stats.total || 0)) {
    const res = unlockAchievement('category_master')
    if (res.isNew) newlyUnlocked.push(ACHIEVEMENTS.find((a) => a.id === 'category_master'))
  }

  // 7. Battle Champion (won 2-player battle)
  if (stats.isBattleWinner) {
    const res = unlockAchievement('battle_champ')
    if (res.isNew) newlyUnlocked.push(ACHIEVEMENTS.find((a) => a.id === 'battle_champ'))
  }

  // 8. Quiz Master (10 games played in leaderboard or storage)
  const totalGames = (stats.totalGamesPlayed || 0) + 1
  if (totalGames >= 10) {
    const res = unlockAchievement('quiz_master')
    if (res.isNew) newlyUnlocked.push(ACHIEVEMENTS.find((a) => a.id === 'quiz_master'))
  }

  return newlyUnlocked.filter(Boolean)
}
