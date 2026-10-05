import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  FiActivity,
  FiAlertTriangle,
  FiArrowRight,
  FiAward,
  FiBarChart2,
  FiBookOpen,
  FiCheckSquare,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCode,
  FiCpu,
  FiDatabase,
  FiEdit3,
  FiGlobe,
  FiGrid,
  FiHelpCircle,
  FiHome,
  FiLayers,
  FiList,
  FiMonitor,
  FiMoon,
  FiPlay,
  FiRotateCcw,
  FiServer,
  FiSettings,
  FiShield,
  FiSun,
  FiTerminal,
  FiToggleRight,
  FiTrash2,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiVolume2,
  FiVolumeX,
  FiX,
  FiZap,
  FiLogOut,
  FiMenu
} from 'react-icons/fi'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts'
import { questionBank, loadQuestionsDataset } from './data/questions'
import {
  selectRandomQuestions,
  getCategories,
  getEliminatedOptions
} from './utils/questionUtils'
import {
  getStoredPlayerName,
  saveStoredPlayerName,
  getStoredSoundEnabled,
  saveStoredSoundEnabled,
  getStoredLeaderboard,
  saveLeaderboardEntry,
  getPersonalBest,
  updatePersonalBest,
  getStoredAchievements,
  getQuizHistory,
  addQuizHistory,
  clearQuizHistory
} from './utils/storageUtils'
import {
  filterHistoryByTime,
  calculateOverallStats,
  calculateCategoryStats,
  calculateAccuracyTrend,
  calculateScoreTrend,
  findStrongestTopic,
  findWeakestTopic,
  calculateRecentProgress
} from './utils/progressUtils'
import { soundEffects } from './utils/soundUtils'
import { triggerConfetti } from './utils/confettiUtils'
import { ACHIEVEMENTS, evaluateAchievements } from './utils/achievementUtils'
import { getAuthSession, clearAuthSession } from './utils/authUtils'
import LoginPage from './components/auth/LoginPage'
import RegisterPage from './components/auth/RegisterPage'
import ForgotPassword from './components/auth/ForgotPassword'
import LogoutModal from './components/auth/LogoutModal'
import MobileNavigationDrawer from './components/navigation/MobileNavigationDrawer'
import './App.css'

function ChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="chart-custom-tooltip">
        <div className="chart-tooltip-header">
          <strong>{data.quizLabel || label}</strong>
          {data.date && <small> &bull; {data.date}</small>}
        </div>
        <div className="chart-tooltip-body">
          {payload.map((entry, idx) => (
            <div key={idx} className="chart-tooltip-row">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <strong>
                {entry.value}
                {entry.name && entry.name.toLowerCase().includes('accuracy') ? '%' : ' pts'}
              </strong>
            </div>
          ))}
          {data.category && (
            <div className="chart-tooltip-cat">
              <span>Category: {data.category}</span>
            </div>
          )}
        </div>
      </div>
    )
  }
  return null
}

function CategoryBarTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="chart-custom-tooltip">
        <div className="chart-tooltip-header">
          <strong>{data.category}</strong>
        </div>
        <div className="chart-tooltip-body">
          <div className="chart-tooltip-row">
            <span>Accuracy:</span>
            <strong style={{ color: 'var(--yellow)' }}>{data.accuracy}%</strong>
          </div>
          <div className="chart-tooltip-row">
            <span>Correct / Total:</span>
            <span>{data.correct} / {data.totalQuestions}</span>
          </div>
          <div className="chart-tooltip-row">
            <span>Quizzes Played:</span>
            <span>{data.quizzes}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

function formatHistoryDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return (
      d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) +
      ' • ' +
      d.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit'
      })
    )
  } catch {
    return dateStr
  }
}

function getCategoryIcon(categoryName) {
  const cat = (categoryName || '').toLowerCase()
  if (cat === 'all') return '▦'
  if (cat.includes('algorithm')) return '</>'
  if (cat.includes('architecture')) return '⚡'
  if (cat.includes('network')) return '🌐'
  if (cat.includes('science')) return '🧠'
  if (cat.includes('structure')) return '📦'
  if (cat.includes('database')) return '🗄️'
  if (cat.includes('logic')) return '🔲'
  if (cat.includes('learning') || cat.includes('ai')) return '🤖'
  if (cat.includes('operating') || cat.includes('system')) return '💻'
  if (cat.includes('programming')) return '⌨️'
  if (cat.includes('security')) return '🔒'
  if (cat.includes('software') || cat.includes('engineering')) return '⚙️'
  return '💡'
}

function App() {
  const [allQuestions, setAllQuestions] = useState(questionBank)
  const [loadingState, setLoadingState] = useState('idle')

  // 3-Second Intro / Splash Screen State (shows on every fresh website open/refresh)
  const [showIntro, setShowIntro] = useState(true)
  const [introStage, setIntroStage] = useState(1)
  const [introExiting, setIntroExiting] = useState(false)

  // Authentication State
  const [authSession, setAuthSession] = useState(() => getAuthSession())
  const [authView, setAuthView] = useState('login')
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)

  // Scroll & Focus Refs
  const mainScrollRef = useRef(null)
  const categoryRef = useRef(null)

  // Theme & Audio state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('quiz-theme') || 'light'
  })
  const [soundEnabled, setSoundEnabled] = useState(() => getStoredSoundEnabled())

  // Game Setup state
  const [playerName, setPlayerName] = useState(() => getStoredPlayerName(authSession?.id) || authSession?.username || '')
  const [player2Name, setPlayer2Name] = useState('Player 2')
  const [gameMode, setGameMode] = useState('practice')
  const [category, setCategory] = useState('All')
  const [difficulty, setDifficulty] = useState('All')
  const [questionCount, setQuestionCount] = useState(10)
  const [timerDuration, setTimerDuration] = useState(15)

  // In-Game state
  const [gameState, setGameState] = useState('lobby')
  const [roundQuestions, setRoundQuestions] = useState([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [lives, setLives] = useState(3)
  const [hintsRemaining, setHintsRemaining] = useState(3)
  const [eliminatedOptions, setEliminatedOptions] = useState([])
  const [timeLeft, setTimeLeft] = useState(15)
  const [userAnswers, setUserAnswers] = useState([])

  // 2-Player Battle state
  const [battleTurn, setBattleTurn] = useState(1)
  const [player1Stats, setPlayer1Stats] = useState(null)
  const [player2Stats, setPlayer2Stats] = useState(null)

  // Error & Feedback state
  const [errorMessage, setErrorMessage] = useState('')
  const [nameError, setNameError] = useState('')

  // Modals state
  const [modalOpen, setModalOpen] = useState(null)
  const [quitModalOpen, setQuitModalOpen] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null)
  const [reviewModalItem, setReviewModalItem] = useState(null)
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState(0)

  // Progress Filter state
  const [progressTimeFilter, setProgressTimeFilter] = useState('all')

  // Achievements & Record feedback
  const [newAchievements, setNewAchievements] = useState([])
  const [isNewRecord, setIsNewRecord] = useState(false)

  // LocalStorage data state
  const [quizHistory, setQuizHistory] = useState(() => getQuizHistory(authSession?.id))
  const [personalBest, setPersonalBest] = useState(() => getPersonalBest(getStoredPlayerName(authSession?.id) || authSession?.username || 'Player', authSession?.id))

  // Mobile Navigation Drawer State (<1024px)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // Intro Slideshow Sequence (runs on fresh load/refresh for ~3 seconds)
  useEffect(() => {
    if (!showIntro) return

    const timer1 = setTimeout(() => {
      setIntroStage(2)
    }, 1000)

    const timer2 = setTimeout(() => {
      setIntroStage(3)
    }, 2000)

    const timer3 = setTimeout(() => {
      setIntroExiting(true)
    }, 3000)

    const timer4 = setTimeout(() => {
      setShowIntro(false)
      setIntroExiting(false)
    }, 3500)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
    }
  }, [showIntro])

  const handleSkipIntro = () => {
    setIntroExiting(false)
    setShowIntro(false)
    soundEffects.playClick(soundEnabled)
  }

  // Auth Handlers
  const handleLoginSuccess = (session) => {
    setAuthSession(session)
    setAuthView('login')
    const currentName = getStoredPlayerName(session?.id) || session?.username || 'Player'
    setPlayerName(currentName)
    saveStoredPlayerName(currentName, session?.id)
    const userHistory = getQuizHistory(session?.id)
    setQuizHistory(userHistory)
    setPersonalBest(getPersonalBest(currentName, session?.id))

    // Play 3-second Intro sequence upon entering application
    setIntroStage(1)
    setIntroExiting(false)
    setShowIntro(true)
  }

  const handleLogoutConfirm = () => {
    clearAuthSession()
    setAuthSession(null)
    setAuthView('login')
    setLogoutModalOpen(false)
    setShowIntro(false)
    setGameState('lobby')
    setQuizHistory([])
    setPersonalBest(null)
    setPlayerName('')
    setNewAchievements([])
    setIsNewRecord(false)
    soundEffects.playClick(soundEnabled)
  }

  // Load dataset on mount
  useEffect(() => {
    let isMounted = true
    setLoadingState('loading')

    loadQuestionsDataset()
      .then((loaded) => {
        if (!isMounted) return
        if (loaded && loaded.length > 0) {
          setAllQuestions(loaded)
          setLoadingState('success')
        } else {
          setAllQuestions(questionBank)
          setLoadingState('success')
        }
      })
      .catch(() => {
        if (!isMounted) return
        setAllQuestions(questionBank)
        setLoadingState('fallback')
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Sync theme to root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (theme === 'dark') {
      document.body.classList.add('dark')
    } else {
      document.body.classList.remove('dark')
    }
    localStorage.setItem('quiz-theme', theme)
  }, [theme])

  // Sync personal best on player name change or user change
  useEffect(() => {
    if (authSession) {
      const currentName = getStoredPlayerName(authSession.id) || authSession.username || playerName || 'Player'
      setPersonalBest(getPersonalBest(currentName, authSession.id))
    } else {
      setPersonalBest(getPersonalBest(playerName || 'Player'))
    }
  }, [playerName, authSession])

  // Sync state whenever auth session changes
  useEffect(() => {
    if (authSession?.id) {
      const currentName = getStoredPlayerName(authSession.id) || authSession.username || 'Player'
      setPlayerName(currentName)
      setQuizHistory(getQuizHistory(authSession.id))
      setPersonalBest(getPersonalBest(currentName, authSession.id))
    } else if (!authSession) {
      setQuizHistory([])
      setPersonalBest(null)
    }
  }, [authSession?.id])

  const toggleTheme = () => {
    soundEffects.playClick(soundEnabled)
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const toggleSound = () => {
    const nextVal = !soundEnabled
    setSoundEnabled(nextVal)
    saveStoredSoundEnabled(nextVal)
    if (nextVal) soundEffects.playClick(true)
  }

  const categories = useMemo(() => getCategories(allQuestions), [allQuestions])

  const availableQuestionsCount = useMemo(() => {
    return allQuestions.filter((q) => {
      const matchCat = category === 'All' || q.category === category
      const matchDiff = difficulty === 'All' || q.difficulty === difficulty
      return matchCat && matchDiff
    }).length
  }, [allQuestions, category, difficulty])

  const actualQuestionCount = Math.min(questionCount, availableQuestionsCount)

  const getMultiplier = (streakVal) => {
    if (streakVal >= 10) return 2.0
    if (streakVal >= 6) return 1.5
    if (streakVal >= 3) return 1.25
    return 1.0
  }

  // --- PROGRESS DASHBOARD ANALYTICS ---
  const filteredHistoryForProgress = useMemo(() => {
    return filterHistoryByTime(quizHistory, progressTimeFilter)
  }, [quizHistory, progressTimeFilter])

  const overallProgressStats = useMemo(() => {
    return calculateOverallStats(filteredHistoryForProgress)
  }, [filteredHistoryForProgress])

  const categoryProgressStats = useMemo(() => {
    return calculateCategoryStats(filteredHistoryForProgress)
  }, [filteredHistoryForProgress])

  const accuracyTrendData = useMemo(() => {
    return calculateAccuracyTrend(filteredHistoryForProgress)
  }, [filteredHistoryForProgress])

  const scoreTrendData = useMemo(() => {
    return calculateScoreTrend(filteredHistoryForProgress)
  }, [filteredHistoryForProgress])

  const strongestTopic = useMemo(() => {
    return findStrongestTopic(categoryProgressStats)
  }, [categoryProgressStats])

  const weakestTopic = useMemo(() => {
    return findWeakestTopic(categoryProgressStats)
  }, [categoryProgressStats])

  const recentProgressComparison = useMemo(() => {
    return calculateRecentProgress(filteredHistoryForProgress)
  }, [filteredHistoryForProgress])

  // Navigation scroll actions
  const scrollToTop = () => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const scrollToCategories = () => {
    if (categoryRef.current) {
      categoryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    soundEffects.playClick(soundEnabled)
  }

  // Start Game Handler
  const startGame = useCallback(() => {
    setNameError('')
    setErrorMessage('')

    // Validate player names
    const p1Trimmed = (playerName || '').trim()
    if (p1Trimmed.length < 2 || p1Trimmed.length > 20) {
      setNameError('Player name must be between 2 and 20 characters.')
      return
    }
    saveStoredPlayerName(p1Trimmed)

    if (gameMode === 'battle') {
      const p2Trimmed = (player2Name || '').trim()
      if (p2Trimmed.length < 2 || p2Trimmed.length > 20) {
        setNameError('Player 2 name must be between 2 and 20 characters.')
        return
      }
    }

    // Select random questions
    const selected = selectRandomQuestions(allQuestions, {
      difficulty,
      category,
      count: questionCount
    })

    if (selected.length === 0) {
      setErrorMessage(
        `No questions are currently available for Category "${category}" with Difficulty "${difficulty}".`
      )
      return
    }

    setRoundQuestions(selected)
    setGameState('playing')
    setQuestionIndex(0)
    setSelectedAnswer(null)
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setLives(3)
    setHintsRemaining(3)
    setEliminatedOptions([])
    setTimeLeft(timerDuration)
    setUserAnswers([])
    setBattleTurn(1)
    setPlayer1Stats(null)
    setPlayer2Stats(null)
    setNewAchievements([])
    setIsNewRecord(false)
    setQuitModalOpen(false)

    scrollToTop()
    soundEffects.playClick(soundEnabled)
  }, [
    allQuestions,
    category,
    difficulty,
    gameMode,
    playerName,
    player2Name,
    questionCount,
    timerDuration,
    soundEnabled
  ])

  // "GO TO HOME" Reset Action
  const goToHome = () => {
    setGameState('lobby')
    setQuestionIndex(0)
    setSelectedAnswer(null)
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setLives(3)
    setHintsRemaining(3)
    setEliminatedOptions([])
    setTimeLeft(timerDuration)
    setRoundQuestions([])
    setUserAnswers([])
    setPlayer1Stats(null)
    setPlayer2Stats(null)
    setErrorMessage('')
    setNameError('')
    setNewAchievements([])
    setIsNewRecord(false)
    setModalOpen(null)
    setQuitModalOpen(false)
    scrollToTop()
    soundEffects.playClick(soundEnabled)
  }

  // Quit Quiz Handler
  const confirmQuit = () => {
    setQuitModalOpen(false)
    setGameState('lobby')
    setQuestionIndex(0)
    setSelectedAnswer(null)
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setLives(3)
    setHintsRemaining(3)
    setEliminatedOptions([])
    setTimeLeft(timerDuration)
    setRoundQuestions([])
    setUserAnswers([])
    setPlayer1Stats(null)
    setPlayer2Stats(null)
    setBattleTurn(1)
    setErrorMessage('')
    setNameError('')
    setNewAchievements([])
    setIsNewRecord(false)
    setModalOpen(null)
    scrollToTop()
    soundEffects.playClick(soundEnabled)
  }

  // Handle ESC key for modals and drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (mobileDrawerOpen) {
          setMobileDrawerOpen(false)
        } else if (logoutModalOpen) {
          setLogoutModalOpen(false)
        } else if (clearConfirmOpen) {
          setClearConfirmOpen(false)
        } else if (reviewModalItem) {
          setReviewModalItem(null)
        } else if (selectedHistoryItem) {
          setSelectedHistoryItem(null)
        } else if (quitModalOpen) {
          setQuitModalOpen(false)
        } else if (modalOpen) {
          setModalOpen(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileDrawerOpen, logoutModalOpen, clearConfirmOpen, reviewModalItem, selectedHistoryItem, quitModalOpen, modalOpen])

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileDrawerOpen])

  // Clear Quiz History Action
  const handleClearHistory = () => {
    clearQuizHistory()
    setQuizHistory([])
    setClearConfirmOpen(false)
    setSelectedHistoryItem(null)
    setReviewModalItem(null)
    soundEffects.playClick(soundEnabled)
  }

  const question = roundQuestions[questionIndex]
  const progress = roundQuestions.length > 0
    ? ((questionIndex + (selectedAnswer ? 1 : 0)) / roundQuestions.length) * 100
    : 0

  // Timer Effect
  useEffect(() => {
    if (gameState !== 'playing' || selectedAnswer || quitModalOpen || modalOpen) return undefined

    if (timeLeft <= 4 && timeLeft > 0) {
      soundEffects.playWarning(soundEnabled)
    }

    if (timeLeft === 0) {
      setSelectedAnswer('TIME_UP')
      setStreak(0)
      setLives((prev) => Math.max(0, prev - 1))
      soundEffects.playWrong(soundEnabled)

      if (question) {
        setUserAnswers((prev) => [
          ...prev,
          {
            question,
            selectedAnswer: 'TIME_UP',
            isCorrect: false,
            isSkipped: false,
            isTimeout: true
          }
        ])
      }
      return undefined
    }

    const timer = window.setTimeout(() => setTimeLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [gameState, selectedAnswer, timeLeft, question, soundEnabled, quitModalOpen, modalOpen])

  // Choose Answer Handler
  const chooseAnswer = (answer) => {
    if (selectedAnswer || !question || eliminatedOptions.includes(answer)) return

    const isAnsCorrect = answer === question.answer
    const currentMult = getMultiplier(streak)
    const nextStreak = isAnsCorrect ? streak + 1 : 0

    setSelectedAnswer(answer)
    setStreak(nextStreak)
    setBestStreak((val) => Math.max(val, nextStreak))

    if (isAnsCorrect) {
      const addedPoints = Math.round((100 + streak * 25) * currentMult)
      setScore((val) => val + addedPoints)
      soundEffects.playCorrect(soundEnabled)
    } else {
      setLives((prev) => Math.max(0, prev - 1))
      soundEffects.playWrong(soundEnabled)
    }

    setUserAnswers((prev) => [
      ...prev,
      {
        question,
        selectedAnswer: answer,
        isCorrect: isAnsCorrect,
        isSkipped: false,
        isTimeout: false
      }
    ])
  }

  // Hint Handler
  const useHint = () => {
    if (hintsRemaining <= 0 || selectedAnswer || !question || eliminatedOptions.length > 0) return
    const eliminated = getEliminatedOptions(question, 2)
    setEliminatedOptions(eliminated)
    setHintsRemaining((prev) => Math.max(0, prev - 1))
    soundEffects.playHint(soundEnabled)
  }

  // Skip Handler
  const skipQuestion = () => {
    if (selectedAnswer || !question) return
    setSelectedAnswer('SKIPPED')
    setStreak(0)
    soundEffects.playSkip(soundEnabled)

    setUserAnswers((prev) => [
      ...prev,
      {
        question,
        selectedAnswer: 'SKIPPED',
        isCorrect: false,
        isSkipped: true,
        isTimeout: false
      }
    ])
  }

  // Finish Round / Next Question Handler
  const nextQuestion = () => {
    soundEffects.playClick(soundEnabled)

    const isLastQuestion = questionIndex === roundQuestions.length - 1
    const isOutOfLives = lives <= 0

    if (isLastQuestion || isOutOfLives) {
      if (gameMode === 'battle') {
        if (battleTurn === 1) {
          const p1Correct = userAnswers.filter((a) => a.isCorrect).length
          const p1Total = roundQuestions.length
          const p1Acc = p1Total > 0 ? Math.round((p1Correct / p1Total) * 100) : 0

          setPlayer1Stats({
            playerName: (playerName || 'Player 1').trim(),
            score,
            bestStreak,
            correct: p1Correct,
            total: p1Total,
            accuracy: p1Acc,
            userAnswers: [...userAnswers]
          })

          setBattleTurn(2)
          setQuestionIndex(0)
          setSelectedAnswer(null)
          setScore(0)
          setStreak(0)
          setBestStreak(0)
          setLives(3)
          setHintsRemaining(3)
          setEliminatedOptions([])
          setTimeLeft(timerDuration)
          setUserAnswers([])
          scrollToTop()
          return
        } else {
          const p2Correct = userAnswers.filter((a) => a.isCorrect).length
          const p2Total = roundQuestions.length
          const p2Acc = p2Total > 0 ? Math.round((p2Correct / p2Total) * 100) : 0

          const p2Data = {
            playerName: (player2Name || 'Player 2').trim(),
            score,
            bestStreak,
            correct: p2Correct,
            total: p2Total,
            accuracy: p2Acc,
            userAnswers: [...userAnswers]
          }
          setPlayer2Stats(p2Data)
          setGameState('battle-results')

          // Record 2-Player Battle in Quiz History
          if (player1Stats) {
            const winnerName =
              player1Stats.score > p2Data.score
                ? player1Stats.playerName
                : p2Data.score > player1Stats.score
                ? p2Data.playerName
                : 'Tie'

            const battleReviewQuestions = player1Stats.userAnswers.map((ans, idx) => ({
              questionId: ans.question.id || `q-${idx}`,
              question: ans.question.question,
              options: ans.question.options || [],
              correctAnswer: ans.question.answer,
              userAnswer: ans.selectedAnswer,
              isCorrect: ans.isCorrect,
              isSkipped: ans.isSkipped || false,
              isTimeout: ans.isTimeout || false,
              fact: ans.question.fact || '',
              category: ans.question.category || category,
              difficulty: ans.question.difficulty || difficulty
            }))

            const battleRecord = {
              id: `battle-${Date.now()}`,
              playerName: `${player1Stats.playerName} vs ${p2Data.playerName}`,
              mode: '2-Player Battle',
              category,
              difficulty,
              questionCount: roundQuestions.length,
              correct: player1Stats.correct + p2Data.correct,
              incorrect:
                roundQuestions.length * 2 - (player1Stats.correct + p2Data.correct),
              skipped: 0,
              accuracy: Math.round(
                ((player1Stats.correct + p2Data.correct) /
                  (roundQuestions.length * 2)) *
                  100
              ),
              score: player1Stats.score + p2Data.score,
              bestStreak: Math.max(player1Stats.bestStreak, p2Data.bestStreak),
              livesLeft: 0,
              date: new Date().toISOString(),
              player1Name: player1Stats.playerName,
              player1Score: player1Stats.score,
              player1Accuracy: player1Stats.accuracy,
              player2Name: p2Data.playerName,
              player2Score: p2Data.score,
              player2Accuracy: p2Data.accuracy,
              winner: winnerName,
              reviewQuestions: battleReviewQuestions
            }

            const updatedHistory = addQuizHistory(battleRecord)
            setQuizHistory(updatedHistory)
          }

          soundEffects.playVictory(soundEnabled)
          triggerConfetti()
          scrollToTop()
          return
        }
      }

      // Single Player / Practice Mode Complete
      const totalQ = roundQuestions.length
      const correctCount = userAnswers.filter((a) => a.isCorrect).length
      const skippedCount = userAnswers.filter((a) => a.isSkipped).length
      const incorrectCount = totalQ - correctCount - skippedCount
      const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0
      const activePlayerName = (playerName || 'Player').trim()

      const reviewQuestions = userAnswers.map((ans, idx) => ({
        questionId: ans.question.id || `q-${idx}`,
        question: ans.question.question,
        options: ans.question.options || [],
        correctAnswer: ans.question.answer,
        userAnswer: ans.selectedAnswer,
        isCorrect: ans.isCorrect,
        isSkipped: ans.isSkipped || false,
        isTimeout: ans.isTimeout || false,
        fact: ans.question.fact || '',
        category: ans.question.category || category,
        difficulty: ans.question.difficulty || difficulty
      }))

      const historyRecord = {
        id: `quiz-${Date.now()}`,
        playerName: activePlayerName,
        mode: 'Practice',
        category,
        difficulty,
        questionCount: totalQ,
        correct: correctCount,
        incorrect: incorrectCount,
        skipped: skippedCount,
        accuracy,
        score,
        bestStreak,
        livesLeft: lives,
        date: new Date().toISOString(),
        reviewQuestions
      }

      const updatedHistory = addQuizHistory(historyRecord)
      setQuizHistory(updatedHistory)

      // Save Leaderboard
      saveLeaderboardEntry({
        playerName: activePlayerName,
        score,
        accuracy,
        category,
        difficulty
      })

      // Update Personal Best
      const pbResult = updatePersonalBest(activePlayerName, {
        score,
        accuracy,
        bestStreak
      })
      if (pbResult.isNewRecord) {
        setIsNewRecord(true)
      }
      setPersonalBest(pbResult.personalBest)

      // Evaluate Achievements
      const unlocked = evaluateAchievements({
        score,
        accuracy,
        streak: bestStreak,
        livesLeft: lives,
        category,
        difficulty,
        totalQuestions: totalQ
      })
      setNewAchievements(unlocked)

      setGameState('results')
      scrollToTop()

      if (accuracy >= 80 || score > 500) {
        soundEffects.playVictory(soundEnabled)
        triggerConfetti()
      } else {
        soundEffects.playClick(soundEnabled)
      }
      return
    }

    setQuestionIndex((val) => val + 1)
    setSelectedAnswer(null)
    setEliminatedOptions([])
    setTimeLeft(timerDuration)
  }

  const isCorrect = question && selectedAnswer === question.answer

  // Category performance calculations for Detailed Results
  const categoryStats = useMemo(() => {
    const statsMap = {}
    userAnswers.forEach((ans) => {
      const cat = ans.question.category || 'General'
      if (!statsMap[cat]) statsMap[cat] = { correct: 0, total: 0 }
      statsMap[cat].total += 1
      if (ans.isCorrect) statsMap[cat].correct += 1
    })
    return statsMap
  }, [userAnswers])

  const storedLeaderboard = useMemo(() => getStoredLeaderboard(), [modalOpen, gameState])
  const storedAchievements = useMemo(() => getStoredAchievements(authSession?.id), [modalOpen, gameState, authSession?.id])

  // --- UNAUTHENTICATED USER: DISPLAY LOGIN / REGISTER / FORGOT FLOW ---
  if (!authSession) {
    if (authView === 'register') {
      return (
        <RegisterPage
          onRegisterSuccess={handleLoginSuccess}
          onSwitchToLogin={() => setAuthView('login')}
          theme={theme}
          toggleTheme={toggleTheme}
          soundEffects={soundEffects}
          soundEnabled={soundEnabled}
        />
      )
    }
    if (authView === 'forgot') {
      return (
        <ForgotPassword
          onSwitchToLogin={() => setAuthView('login')}
          theme={theme}
          toggleTheme={toggleTheme}
          soundEffects={soundEffects}
          soundEnabled={soundEnabled}
        />
      )
    }
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onSwitchToRegister={() => setAuthView('register')}
        onSwitchToForgot={() => setAuthView('forgot')}
        theme={theme}
        toggleTheme={toggleTheme}
        soundEffects={soundEffects}
        soundEnabled={soundEnabled}
      />
    )
  }

  return (
    <main className="app-shell">
      {/* 3-SECOND INTRO / SPLASH SCREEN */}
      {showIntro && (
        <div className={`intro-overlay ${introExiting ? 'exiting' : ''}`} role="dialog" aria-modal="true" aria-label="Welcome Introduction">
          <div className="intro-particles-bg" />
          <div className="intro-ambient-glow" />

          <div className="intro-stage-container">
            {introStage === 1 && (
              <div className="intro-stage intro-stage-1">
                <div className="intro-brain-icon">🧠</div>
                <h1 className="intro-title">
                  QUIZ <span className="intro-highlight">BATTLE</span>
                </h1>
                <p className="intro-subtitle">Test your Computer Science knowledge</p>
              </div>
            )}

            {introStage === 2 && (
              <div className="intro-stage intro-stage-2">
                <div className="intro-brain-icon">🎯</div>
                <h1 className="intro-title">
                  Challenge <span className="intro-highlight">Your Mind</span>
                </h1>
                <div className="intro-symbols-row">
                  <span className="intro-symbol-chip">&lt;/&gt; Code</span>
                  <span className="intro-symbol-chip">💡 Ideas</span>
                  <span className="intro-symbol-chip">⚡ Speed</span>
                  <span className="intro-symbol-chip">📚 Theory</span>
                  <span className="intro-symbol-chip">🤖 AI</span>
                </div>
                <p className="intro-subtitle">Algorithmic intuition &amp; theory duels</p>
              </div>
            )}

            {introStage === 3 && (
              <div className="intro-stage intro-stage-3">
                <div className="intro-brain-icon">📈</div>
                <h1 className="intro-title">
                  PLAY &bull; <span className="intro-highlight">LEARN</span> &bull; GROW
                </h1>
                <p className="intro-subtitle">Get ready to test your skills!</p>
              </div>
            )}

            <div className="intro-dots-row">
              <span className={`intro-dot ${introStage === 1 ? 'active' : ''}`} />
              <span className={`intro-dot ${introStage === 2 ? 'active' : ''}`} />
              <span className={`intro-dot ${introStage === 3 ? 'active' : ''}`} />
            </div>
          </div>

          <button
            className="intro-skip-btn"
            type="button"
            onClick={handleSkipIntro}
            title="Skip Intro"
          >
            SKIP &rarr;
          </button>
        </div>
      )}

      {/* Background Ambient Layers */}
      <div className="bg-ambient-layer" aria-hidden="true">
        <div className="bg-dot-pattern" />
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
      </div>

      {/* =========================================================================
          SCREEN 1: HOME / QUIZ SETUP DASHBOARD (gameState === 'lobby')
          ========================================================================= */}
      {gameState === 'lobby' && (
        <>
          {/* Topbar Header */}
          <header className="topbar">
        <div className="brand-container" onClick={goToHome} role="button" tabIndex={0}>
          <div className="brand-icon-wrapper">
            <span>🧠</span>
          </div>
          <div className="brand-text-block">
            <span className="brand-name">
              QUIZ <span className="brand-highlight">BATTLE</span>
            </span>
            <span className="brand-tagline">Learn &bull; Compete &bull; Grow</span>
          </div>
        </div>

        <div className="dataset-live-badge">
          <span className="live-pulse-dot" />
          <span>Computer Science Theory ({allQuestions.length} Questions)</span>
        </div>

        <div className="topbar-actions">
          {/* Mobile Navigation Menu Button (<1024px) */}
          <button
            className="mobile-menu-btn"
            type="button"
            onClick={() => {
              setMobileDrawerOpen(true)
              soundEffects.playClick(soundEnabled)
            }}
            aria-label="Open navigation"
            aria-expanded={mobileDrawerOpen}
            aria-controls="mobile-nav-drawer"
            title="Open Navigation Menu"
          >
            <FiMenu className="mobile-menu-icon" />
            <span className="mobile-menu-label">MENU</span>
          </button>

          {gameState !== 'lobby' && (
            <button
              className="nav-pill-btn"
              type="button"
              onClick={goToHome}
              title="Go to Home"
            >
              <FiHome />
              <span className="btn-text">Home</span>
            </button>
          )}

          <button
            className={`nav-pill-btn ${modalOpen === 'history' ? 'active' : ''}`}
            type="button"
            onClick={() => {
              setQuizHistory(getQuizHistory(authSession?.id))
              setModalOpen('history')
            }}
            title="View Quiz History"
          >
            <FiClock />
            <span className="btn-text">History</span>
          </button>

          <button
            className={`nav-pill-btn ${modalOpen === 'progress' ? 'active' : ''}`}
            type="button"
            onClick={() => {
              setQuizHistory(getQuizHistory(authSession?.id))
              setModalOpen('progress')
            }}
            title="View My Progress"
          >
            <FiTrendingUp />
            <span className="btn-text">Progress</span>
          </button>

          <button
            className={`nav-pill-btn ${modalOpen === 'leaderboard' ? 'active' : ''}`}
            type="button"
            onClick={() => setModalOpen('leaderboard')}
            title="View Global Leaderboard"
          >
            <FiAward />
            <span className="btn-text">Rankings</span>
          </button>

          <button
            className={`nav-pill-btn ${modalOpen === 'achievements' ? 'active' : ''}`}
            type="button"
            onClick={() => setModalOpen('achievements')}
            title="View Badges & Achievements"
          >
            <FiCheckSquare />
            <span className="btn-text">Badges</span>
          </button>

          <button
            className="nav-icon-btn"
            type="button"
            onClick={toggleSound}
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {soundEnabled ? <FiVolume2 /> : <FiVolumeX />}
          </button>

          <button
            className="theme-toggle-btn"
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <FiSun /> : <FiMoon />}
            <span>{theme === 'dark' ? 'LIGHT' : 'DARK'}</span>
          </button>

          <button
            className="nav-icon-btn"
            type="button"
            title="How to play"
            onClick={() => setModalOpen('help')}
          >
            <FiHelpCircle />
          </button>

          {/* Logged-In User Profile Badge */}
          <div className="user-profile-badge" title={`Signed in as ${authSession?.username || playerName}`}>
            <span className="user-profile-avatar">
              <FiUser />
            </span>
            <span>{authSession?.username || playerName || 'User'}</span>
          </div>

          {/* Logout Button */}
          <button
            className="logout-nav-btn"
            type="button"
            onClick={() => setLogoutModalOpen(true)}
            title="Logout from Quiz Battle"
          >
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* --- DESKTOP FIXED-SIDEBAR & CENTER-SCROLL LAYOUT --- */}
      <div className="desktop-layout-wrapper">
        {/* LEFT SIDEBAR (FIXED - PERMANENTLY AVAILABLE) */}
        <aside className="left-sidebar-fixed" aria-label="Main Navigation & Shortcuts">
          <p className="sidebar-section-title">NAVIGATION</p>
          <div className="sidebar-nav-group">
            <button
              className={`sidebar-nav-btn ${gameState === 'lobby' && !modalOpen ? 'active' : ''}`}
              type="button"
              onClick={goToHome}
              title="Home Dashboard"
            >
              <FiHome />
              <span>Home</span>
            </button>

            <button
              className={`sidebar-nav-btn ${modalOpen === 'history' ? 'active' : ''}`}
              type="button"
              onClick={() => {
                setQuizHistory(getQuizHistory(authSession?.id))
                setModalOpen('history')
              }}
              title="Quiz History"
            >
              <FiClock />
              <span>Quiz History</span>
              {quizHistory.length > 0 && (
                <span className="sidebar-badge">{quizHistory.length}</span>
              )}
            </button>

            <button
              className={`sidebar-nav-btn ${modalOpen === 'progress' ? 'active' : ''}`}
              type="button"
              onClick={() => {
                setQuizHistory(getQuizHistory(authSession?.id))
                setModalOpen('progress')
              }}
              title="My Progress Dashboard"
            >
              <FiTrendingUp />
              <span>My Progress</span>
              {quizHistory.length > 0 && (
                <span className="sidebar-badge">{overallProgressStats.avgAccuracy}%</span>
              )}
            </button>

            <button
              className={`sidebar-nav-btn ${modalOpen === 'leaderboard' ? 'active' : ''}`}
              type="button"
              onClick={() => setModalOpen('leaderboard')}
              title="Leaderboard Rankings"
            >
              <FiAward />
              <span>Leaderboard</span>
            </button>

            <button
              className={`sidebar-nav-btn ${modalOpen === 'achievements' ? 'active' : ''}`}
              type="button"
              onClick={() => setModalOpen('achievements')}
              title="Badges & Achievements"
            >
              <FiCheckSquare />
              <span>Achievements</span>
            </button>
          </div>

          <div className="sidebar-divider" />

          <p className="sidebar-section-title">FEATURE SHORTCUTS</p>
          <div className="sidebar-nav-group">
            <button
              className="sidebar-feature-card"
              type="button"
              onClick={scrollToCategories}
              title="Scroll to Category Selector"
            >
              <span className="sidebar-feat-icon">🎮</span>
              <div className="sidebar-feat-text">
                <h5>Categories</h5>
                <p>Browse 13+ CS topics</p>
              </div>
            </button>

            <button
              className="sidebar-feature-card"
              type="button"
              onClick={() => {
                setGameMode('battle')
                setErrorMessage('')
                scrollToTop()
                soundEffects.playClick(soundEnabled)
              }}
              title="Switch to 2-Player Battle Mode"
            >
              <span className="sidebar-feat-icon">👥</span>
              <div className="sidebar-feat-text">
                <h5>Battle Mode</h5>
                <p>2-player head-to-head</p>
              </div>
            </button>

            <button
              className="sidebar-feature-card"
              type="button"
              onClick={() => {
                setQuizHistory(getQuizHistory())
                setModalOpen('progress')
              }}
              title="View Track Progress"
            >
              <span className="sidebar-feat-icon">⭐</span>
              <div className="sidebar-feat-text">
                <h5>Track Progress</h5>
                <p>Improve mastery</p>
              </div>
            </button>
          </div>
        </aside>

        {/* CENTER SCROLLABLE MAIN CONTENT AREA */}
        <div className="main-center-scroll" ref={mainScrollRef}>
          <div className="center-content-container">
            {/* --- LOBBY VIEW --- */}
            {gameState === 'lobby' && (
              <div className="view-enter" style={{ width: '100%' }}>
                {/* Main Quiz Setup Card */}
                <div className="lobby-card">
                  {/* Mode Switcher Segmented Tabs */}
                  <div className="mode-segmented-control" role="tablist">
                    <button
                      className={`segmented-tab-btn ${gameMode === 'practice' ? 'active' : ''}`}
                      type="button"
                      role="tab"
                      aria-selected={gameMode === 'practice'}
                      onClick={() => {
                        setGameMode('practice')
                        setErrorMessage('')
                      }}
                    >
                      ⚡ PRACTICE MODE
                    </button>
                    <button
                      className={`segmented-tab-btn ${gameMode === 'battle' ? 'active' : ''}`}
                      type="button"
                      role="tab"
                      aria-selected={gameMode === 'battle'}
                      onClick={() => {
                        setGameMode('battle')
                        setErrorMessage('')
                      }}
                    >
                      ⚔️ 2-PLAYER BATTLE
                    </button>
                  </div>

                  {/* Player Name Form */}
                  <div className="player-input-section">
                    {gameMode === 'practice' ? (
                      <div>
                        <label className="field-label" htmlFor="player-name-input">
                          <span className="field-label-text">
                            <FiUser /> PLAYER NAME
                          </span>
                        </label>
                        <div className="input-with-icon" style={{ marginTop: '6px' }}>
                          <input
                            id="player-name-input"
                            className="modern-text-input"
                            type="text"
                            maxLength={20}
                            value={playerName}
                            onChange={(e) => {
                              setPlayerName(e.target.value)
                              if (nameError) setNameError('')
                            }}
                            placeholder="Enter your player name..."
                          />
                          <FiEdit3 className="input-edit-icon" />
                        </div>
                      </div>
                    ) : (
                      <div className="input-row-2p">
                        <div>
                          <label className="field-label" htmlFor="p1-input">
                            <span className="field-label-text">
                              <FiUser /> PLAYER 1
                            </span>
                          </label>
                          <div className="input-with-icon" style={{ marginTop: '6px' }}>
                            <input
                              id="p1-input"
                              className="modern-text-input"
                              type="text"
                              maxLength={20}
                              value={playerName}
                              onChange={(e) => {
                                setPlayerName(e.target.value)
                                if (nameError) setNameError('')
                              }}
                              placeholder="Player 1..."
                            />
                            <FiEdit3 className="input-edit-icon" />
                          </div>
                        </div>

                        <div>
                          <label className="field-label" htmlFor="p2-input">
                            <span className="field-label-text">
                              <FiUsers /> PLAYER 2
                            </span>
                          </label>
                          <div className="input-with-icon" style={{ marginTop: '6px' }}>
                            <input
                              id="p2-input"
                              className="modern-text-input"
                              type="text"
                              maxLength={20}
                              value={player2Name}
                              onChange={(e) => {
                                setPlayer2Name(e.target.value)
                                if (nameError) setNameError('')
                              }}
                              placeholder="Player 2..."
                            />
                            <FiEdit3 className="input-edit-icon" />
                          </div>
                        </div>
                      </div>
                    )}
                    {nameError && (
                      <div className="validation-error-msg">
                        <FiAlertTriangle /> {nameError}
                      </div>
                    )}
                  </div>

                  {/* Category Selector with ref for smooth scrolling */}
                  <div className="lobby-picker-section" ref={categoryRef} id="category-section">
                    <div className="field-label">
                      <span>CATEGORY</span>
                      <small style={{ color: 'var(--text-muted)' }}>{category}</small>
                    </div>
                    <div className="category-pills-wrap" aria-label="Select Category">
                      {categories.map((cat) => {
                        const iconSymbol = getCategoryIcon(cat)
                        return (
                          <button
                            key={cat}
                            type="button"
                            className={`cat-pill-btn ${category === cat ? 'selected' : ''}`}
                            onClick={() => {
                              setCategory(cat)
                              setErrorMessage('')
                            }}
                          >
                            <span className="cat-icon">{iconSymbol}</span>
                            <span>{cat}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* CENTRAL BRAIN / MIND VISUAL */}
                  <div className="central-mind-container" aria-hidden="true">
                    <div className="mind-visual-orbit">
                      <div className="orbit-glow-center" />
                      <div className="orbit-ring" />

                      <div className="orbit-chip chip-sparkle-top">✨</div>
                      <div className="orbit-chip chip-idea">💡 Idea</div>
                      <div className="orbit-chip chip-code">&lt;/&gt; Code</div>
                      <div className="orbit-chip chip-speed">⚡ Fast</div>
                      <div className="orbit-chip chip-book">📚 CS</div>
                      <div className="orbit-chip chip-sparkle-bottom">✨</div>

                      <div className="mind-core-brain">
                        <span>🧠</span>
                      </div>
                    </div>
                  </div>

                  {/* Difficulty Selector */}
                  <div className="lobby-picker-section">
                    <div className="field-label">
                      <span>DIFFICULTY</span>
                      <small style={{ color: 'var(--text-muted)' }}>{difficulty}</small>
                    </div>
                    <div className="difficulty-cards-grid" aria-label="Select Difficulty">
                      {[
                        { level: 'Easy', emoji: '😊' },
                        { level: 'Medium', emoji: '😐' },
                        { level: 'Hard', emoji: '😈' },
                        { level: 'All', emoji: '⭐' }
                      ].map(({ level, emoji }) => (
                        <button
                          key={level}
                          type="button"
                          className={`diff-card-btn ${difficulty === level ? 'selected' : ''}`}
                          onClick={() => {
                            setDifficulty(level)
                            setErrorMessage('')
                          }}
                        >
                          <span className="diff-emoji">{emoji}</span>
                          <span className="diff-name">{level}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Questions & Timer Controls */}
                  <div className="controls-row-2col">
                    <div className="lobby-picker-section">
                      <div className="field-label">
                        <span>QUESTIONS</span>
                        <small style={{ color: 'var(--text-muted)' }}>{questionCount} Qs</small>
                      </div>
                      <div className="segmented-pills-row">
                        {[10, 20, 30].map((count) => (
                          <button
                            key={count}
                            type="button"
                            className={`segmented-pill-btn ${questionCount === count ? 'selected' : ''}`}
                            onClick={() => {
                              setQuestionCount(count)
                              setErrorMessage('')
                            }}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="lobby-picker-section">
                      <div className="field-label">
                        <span>TIMER</span>
                        <small style={{ color: 'var(--text-muted)' }}>{timerDuration}s / Q</small>
                      </div>
                      <div className="segmented-pills-row">
                        {[10, 15, 30].map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={`segmented-pill-btn ${timerDuration === t ? 'selected' : ''}`}
                            onClick={() => setTimerDuration(t)}
                          >
                            {t}s
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pool Warnings / Info */}
                  {availableQuestionsCount === 0 ? (
                    <div className="pool-warning-card">
                      <div className="pool-warning-title">
                        <FiAlertTriangle /> No questions available
                      </div>
                      <p className="pool-warning-desc">
                        No questions found for {category === 'All' ? 'all categories' : `"${category}"`} with {difficulty === 'All' ? 'all difficulties' : `"${difficulty}"`}.
                      </p>
                    </div>
                  ) : availableQuestionsCount < questionCount ? (
                    <div className="pool-info-card">
                      <div className="pool-info-title">
                        <FiZap /> {availableQuestionsCount} questions available
                      </div>
                      <p className="pool-info-desc">
                        Only <strong>{availableQuestionsCount}</strong> questions match your selection. This round will use all {availableQuestionsCount} available questions without repeats.
                      </p>
                    </div>
                  ) : null}

                  {/* Personal Best Info Card */}
                  {personalBest && (
                    <div className="pb-card-modern">
                      <div className="pb-left-group">
                        <div className="pb-trophy-icon">🏆</div>
                        <div className="pb-text-meta">
                          <h5>PERSONAL BEST ({playerName || 'PLAYER'})</h5>
                          <div className="pb-sub-stats">
                            <span>{personalBest.bestAccuracy}% accuracy</span>
                            <span style={{ margin: '0 6px' }}>&bull;</span>
                            <span>{personalBest.bestStreak} best streak</span>
                          </div>
                        </div>
                      </div>
                      <div className="pb-score-highlight">
                        <span className="pb-score-val">{personalBest.bestScore}</span>
                        <span className="pb-score-unit">pts</span>
                      </div>
                    </div>
                  )}

                  {/* Information Strip (Dynamic Metrics Row) */}
                  <div className="info-metrics-strip" aria-label="Dataset Statistics">
                    <div className="info-metric-item">
                      <span className="info-metric-icon">🟢</span>
                      <div className="info-metric-text">
                        <span className="info-metric-title">{allQuestions.length}+ Questions</span>
                        <span className="info-metric-sub">Available in Pool</span>
                      </div>
                    </div>
                    <div className="info-metric-item">
                      <span className="info-metric-icon">🎲</span>
                      <div className="info-metric-text">
                        <span className="info-metric-title">Random Select</span>
                        <span className="info-metric-sub">No Duplicate Runs</span>
                      </div>
                    </div>
                    <div className="info-metric-item">
                      <span className="info-metric-icon">🧠</span>
                      <div className="info-metric-text">
                        <span className="info-metric-title">Real CS QA</span>
                        <span className="info-metric-sub">Theory &amp; Concepts</span>
                      </div>
                    </div>
                    <div className="info-metric-item">
                      <span className="info-metric-icon">📈</span>
                      <div className="info-metric-text">
                        <span className="info-metric-title">Track Progress</span>
                        <span className="info-metric-sub">Improve &amp; Grow</span>
                      </div>
                    </div>
                  </div>

                  {/* Start Quiz Primary Standout CTA Button */}
                  <div className="start-cta-wrap">
                    {loadingState === 'loading' ? (
                      <p className="source-note">Loading question bank...</p>
                    ) : loadingState === 'error' ? (
                      <div className="feedback feedback-bad">
                        <strong>Unable to load question bank.</strong>
                        <p>Please check your connection and refresh.</p>
                      </div>
                    ) : (
                      <>
                        <button
                          className="start-quiz-cta-btn"
                          type="button"
                          onClick={startGame}
                          disabled={availableQuestionsCount === 0}
                        >
                          <FiPlay />
                          <span>
                            {gameMode === 'practice'
                              ? `START QUIZ (${actualQuestionCount} QS)`
                              : `START BATTLE (${actualQuestionCount} QS)`}
                          </span>
                          <span className="cta-icon-sparkle">✨</span>
                        </button>
                        {errorMessage && (
                          <div className="feedback feedback-bad" style={{ marginTop: '12px', width: '100%' }}>
                            <p>{errorMessage}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Online Multiplayer Coming Soon Badge */}
                  <div className="online-badge-card">
                    <span className="online-icon">🌐</span>
                    <div className="online-info">
                      <strong>Online Multiplayer</strong>
                      <span>Real-time cross-device battles coming soon</span>
                    </div>
                  </div>

                  <p className="source-note centered">
                    Built with the complete Kaggle Computer Science Theory Q&amp;A dataset ({allQuestions.length} Questions)
                  </p>
                </div>
              </div>
            )}

            {/* Footer */}
            <footer>
              <div className="footer-tech-stack">
                <span className="tech-tag">⚛️ React</span>
                <span>&bull;</span>
                <span className="tech-tag">▲ Vite</span>
                <span>&bull;</span>
                <span className="tech-tag">JS JavaScript</span>
                <span>&bull;</span>
                <span className="tech-tag">🎨 CSS3</span>
              </div>
              <div className="footer-dataset-text">
                🗄️ Powered by Kaggle Computer Science Theory Dataset ({allQuestions.length} Questions)
              </div>
            </footer>
          </div>
        </div>

        {/* RIGHT SIDEBAR (FIXED - ILLUSTRATION & KNOWLEDGE INFO) */}
        <aside className="right-sidebar-fixed" aria-label="CS Knowledge & Illustration">
          <div className="right-knowledge-card">
            <div className="knowledge-header">
              <span style={{ fontSize: '18px' }}>🧠</span>
              <h4>CS KNOWLEDGE</h4>
            </div>

            <div className="knowledge-stats-grid">
              <div className="knowledge-stat-item">
                <span className="k-stat-val">{allQuestions.length}+</span>
                <span className="k-stat-label">QUESTIONS</span>
              </div>
              <div className="knowledge-stat-item">
                <span className="k-stat-val">{categories.length - 1}+</span>
                <span className="k-stat-label">TOPICS</span>
              </div>
            </div>
          </div>

          <div className="illustration-art-container">
            <div className="mini-laptop-mock">
              <div className="mock-screen-bar">
                <span className="mock-dot r" />
                <span className="mock-dot y" />
                <span className="mock-dot g" />
              </div>
              <div className="mock-code-lines">
                <div className="mock-code-line w-80" />
                <div className="mock-code-line w-60" />
                <div className="mock-code-line w-90" />
                <div className="mock-code-line w-40" />
              </div>
            </div>
            <div className="mini-laptop-base" />
            <div className="illustration-chips">
              <span className="ill-chip">💡 AI / ML</span>
              <span className="ill-chip">💻 OS</span>
              <span className="ill-chip">📚 Theory</span>
              <span className="ill-chip">⚡ Fast</span>
            </div>
          </div>

          <div className="illustration-text" style={{ padding: '0 4px' }}>
            <h4>Master CS Concepts</h4>
            <p>Sharpen algorithmic intuition, systems design, and theory with curated questions.</p>
          </div>
        </aside>
      </div>
    </>
  )}

  {/* =========================================================================
      SCREEN 2: SEPARATE QUIZ ATTEMPT PAGE (gameState === 'playing')
      ========================================================================= */}
  {gameState === 'playing' && question && (
    <div className="quiz-attempt-page view-enter">
      {/* Quiz Top Header */}
      <header className="quiz-attempt-header">
        <div className="quiz-brand-left">
          <div className="quiz-brand-icon">🧠</div>
          <div className="quiz-brand-title">
            QUIZ <span>BATTLE</span>
          </div>
          {gameMode === 'battle' && (
            <span className="turn-badge" style={{ marginLeft: '8px' }}>
              ⚔️ Turn: {battleTurn === 1 ? playerName : player2Name}
            </span>
          )}
        </div>

        <div className="quiz-progress-counter">
          Question {questionIndex + 1} / {roundQuestions.length}
        </div>

        <div className="quiz-header-status-right">
          <div className="quiz-lives-wrap" title={`${lives} lives remaining`}>
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i}>{i < lives ? '❤️' : '🖤'}</span>
            ))}
          </div>

          <div className={`quiz-timer-badge ${timeLeft <= 5 ? 'urgent' : ''}`}>
            <FiClock />
            <span>{String(timeLeft).padStart(2, '0')}s</span>
          </div>
        </div>
      </header>

      {/* Anandh Blue Progress Bar */}
      <div className="quiz-progress-track">
        <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Focus Question Card */}
      <div className="quiz-focus-card">
        <div className="quiz-question-meta-row">
          <div className="quiz-meta-left">
            <span className="category-tag">{question.category}</span>
            <span className={`diff-pill ${question.difficulty.toLowerCase()}`}>
              {question.difficulty}
            </span>
          </div>

          <div className="quiz-meta-right">
            <span className="quiz-score-pill">
              <FiZap /> {score} pts
            </span>
            <span className="quiz-streak-pill">
              <FiAward /> {streak} streak
              {streak >= 3 && (
                <span className="multiplier-tag" style={{ marginLeft: '4px' }}>
                  {getMultiplier(streak)}x
                </span>
              )}
            </span>
          </div>
        </div>

        <h2 className="quiz-question-text">{question.question}</h2>

        {/* Answer Options Stack */}
        <div className="quiz-answers-stack">
          {question.options.map((option, index) => {
            const isEliminated = eliminatedOptions.includes(option)
            const optionState = selectedAnswer && option === question.answer
              ? 'correct'
              : selectedAnswer === option
              ? 'wrong'
              : isEliminated
              ? 'eliminated'
              : ''

            return (
              <button
                className={`quiz-option-button ${optionState}`}
                type="button"
                key={`${option}-${index}`}
                disabled={isEliminated || selectedAnswer !== null}
                onClick={() => chooseAnswer(option)}
              >
                <span className="quiz-option-letter">
                  {String.fromCharCode(65 + index)}
                </span>
                <span style={{ flex: 1 }}>{option}</span>
              </button>
            )
          })}
        </div>

        {/* In-Game Action Bar (Hint & Skip) */}
        {!selectedAnswer && (
          <div className="quiz-action-bar">
            <button
              className="quiz-action-btn"
              type="button"
              onClick={useHint}
              disabled={hintsRemaining <= 0 || eliminatedOptions.length > 0}
              title="Eliminate up to 2 incorrect choices"
            >
              💡 Hint ({hintsRemaining})
            </button>
            <button
              className="quiz-action-btn"
              type="button"
              onClick={skipQuestion}
              title="Skip to next question without losing a life"
            >
              ⏭ Skip
            </button>
          </div>
        )}

        {/* Post-Answer Feedback & Next Action */}
        {selectedAnswer && (
          <div className={`feedback ${isCorrect ? 'feedback-good' : 'feedback-bad'}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <strong>
                  {selectedAnswer === 'TIME_UP'
                    ? '⏰ Time got you! (-1 Life)'
                    : selectedAnswer === 'SKIPPED'
                    ? '⏭️ Question Skipped.'
                    : isCorrect
                    ? `Correct! +${streak >= 3 ? `(${getMultiplier(streak)}x Streak Multiplier)` : 'Big brain energy.'}`
                    : 'Not quite. (-1 Life)'}
                </strong>
                {question.fact && <p style={{ margin: '4px 0 0' }}>{question.fact}</p>}
              </div>
              <button
                className="primary-button"
                type="button"
                onClick={nextQuestion}
                style={{ padding: '10px 20px', fontSize: '13px' }}
              >
                {questionIndex === roundQuestions.length - 1 || lives <= 0
                  ? gameMode === 'battle' && battleTurn === 1
                    ? `Pass to ${player2Name}`
                    : 'See Results'
                  : 'Next Question'}{' '}
                <FiArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* Bottom Quit Button */}
        <div className="quiz-bottom-quit-wrap">
          <button
            className="quiz-quit-cta-btn"
            type="button"
            onClick={() => setQuitModalOpen(true)}
            title="Quit current quiz and return to lobby"
          >
            <FiX /> Quit Quiz
          </button>
        </div>
      </div>
    </div>
  )}

  {/* =========================================================================
      SCREEN 3A: SEPARATE RESULTS PAGE (gameState === 'results')
      ========================================================================= */}
  {gameState === 'results' && (
    <div className="results-page view-enter">
      <p className="eyebrow"><FiAward /> BATTLE COMPLETE</p>
      <h1>{lives === 0 ? 'Game Over.' : "That's a wrap."}</h1>

      {isNewRecord && <div className="record-badge">🎉 NEW PERSONAL BEST!</div>}

      <p className="results-copy">
        {lives === 0
          ? `You fought valiantly, ${playerName}, but ran out of bits.`
          : `Outstanding run, ${playerName}! You conquered the ${difficulty.toLowerCase()} gauntlet.`}
      </p>

      <div className="results-layout">
        <div className="result-grid">
          <div>
            <span>FINAL SCORE</span>
            <strong style={{ color: 'var(--orange)' }}>{score}</strong>
          </div>
          <div>
            <span>ACCURACY</span>
            <strong style={{ color: 'var(--yellow)' }}>
              {roundQuestions.length > 0
                ? Math.round(
                    (userAnswers.filter((a) => a.isCorrect).length / roundQuestions.length) * 100
                  )
                : 0}
              %
            </strong>
          </div>
          <div>
            <span>CORRECT / TOTAL</span>
            <strong style={{ color: 'var(--green)' }}>
              {userAnswers.filter((a) => a.isCorrect).length} / {roundQuestions.length}
            </strong>
          </div>
          <div>
            <span>BEST STREAK</span>
            <strong>{bestStreak} 🔥</strong>
          </div>
          <div>
            <span>SKIPPED</span>
            <strong>{userAnswers.filter((a) => a.isSkipped).length}</strong>
          </div>
          <div>
            <span>LIVES LEFT</span>
            <strong>{lives} ❤️</strong>
          </div>
        </div>

        {Object.keys(categoryStats).length > 0 && (
          <div className="category-breakdown">
            <h3>Topic Performance</h3>
            {Object.entries(categoryStats).map(([cat, stat]) => {
              const pct = Math.round((stat.correct / stat.total) * 100)
              return (
                <div className="cat-stat-row" key={cat}>
                  <div className="cat-stat-header">
                    <span>{cat}</span>
                    <span>
                      {stat.correct} / {stat.total} ({pct}%)
                    </span>
                  </div>
                  <div className="cat-progress-track">
                    <div className="cat-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {newAchievements.length > 0 && (
        <div className="feedback feedback-good" style={{ width: 'min(780px, 100%)', marginBottom: '24px' }}>
          <strong>🏆 New Achievements Unlocked!</strong>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {newAchievements.map((ach) => (
              <span key={ach.id} style={{ background: 'var(--yellow)', color: '#1e1b4b', padding: '4px 10px', borderRadius: '6px', fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: '700' }}>
                {ach.icon} {ach.title}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="results-actions">
        <button className="primary-button" type="button" onClick={startGame}>
          <FiRotateCcw /> Run it back
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => setModalOpen('review')}
        >
          <FiList /> Review Answers
        </button>
        <button className="secondary-button" type="button" onClick={goToHome}>
          <FiHome /> Go to home
        </button>
      </div>
    </div>
  )}

  {/* =========================================================================
      SCREEN 3B: SEPARATE 2-PLAYER BATTLE RESULTS PAGE (gameState === 'battle-results')
      ========================================================================= */}
  {gameState === 'battle-results' && player1Stats && player2Stats && (
    <div className="results-page view-enter">
      <p className="eyebrow"><FiAward /> 2-PLAYER BATTLE RESULTS</p>
      <h1>Head-to-Head Duel</h1>

      <div className="battle-results-card">
        <div className={`player-box ${player1Stats.score >= player2Stats.score ? 'winner-box' : ''}`}>
          <h2>{player1Stats.playerName}</h2>
          <div className="score-val">{player1Stats.score}</div>
          <div className="stats-sub">
            {player1Stats.correct} / {player1Stats.total} Correct ({player1Stats.accuracy}%) &bull; {player1Stats.bestStreak} Streak
          </div>
        </div>

        <div className="vs-badge">VS</div>

        <div className={`player-box ${player2Stats.score >= player1Stats.score ? 'winner-box' : ''}`}>
          <h2>{player2Stats.playerName}</h2>
          <div className="score-val">{player2Stats.score}</div>
          <div className="stats-sub">
            {player2Stats.correct} / {player2Stats.total} Correct ({player2Stats.accuracy}%) &bull; {player2Stats.bestStreak} Streak
          </div>
        </div>

        <div className="winner-banner">
          {player1Stats.score > player2Stats.score
            ? `🏆 WINNER: ${player1Stats.playerName}!`
            : player2Stats.score > player1Stats.score
            ? `🏆 WINNER: ${player2Stats.playerName}!`
            : "🤝 IT'S A TIE!"}
        </div>
      </div>

      <div className="results-actions">
        <button className="primary-button" type="button" onClick={startGame}>
          <FiRotateCcw /> Rematch Battle
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => setModalOpen('review')}
        >
          <FiList /> Review Questions
        </button>
        <button className="secondary-button" type="button" onClick={goToHome}>
          <FiHome /> Go to home
        </button>
      </div>
    </div>
  )}

      {/* --- MODALS --- */}

      {/* Quit Quiz Confirmation Modal */}
      {quitModalOpen && (
        <div className="modal-backdrop" onClick={() => setQuitModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Quit Quiz?</h2>
              <button
                className="nav-icon-btn"
                type="button"
                onClick={() => setQuitModalOpen(false)}
                title="Resume quiz"
              >
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Are you sure you want to quit? Your current game progress will be lost and this attempt will not be recorded.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setQuitModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  type="button"
                  style={{ background: 'var(--red)' }}
                  onClick={confirmQuit}
                >
                  Quit Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {modalOpen === 'leaderboard' && (
        <div className="modal-backdrop" onClick={() => setModalOpen(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏆 Global Leaderboard</h2>
              <button className="nav-icon-btn" type="button" onClick={() => setModalOpen(null)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              {storedLeaderboard.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No battle records yet. Complete a quiz to rank up!</p>
              ) : (
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Score</th>
                      <th>Acc.</th>
                      <th>Mode</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storedLeaderboard.map((entry, idx) => (
                      <tr key={entry.id || idx}>
                        <td className="rank-badge">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </td>
                        <td><strong>{entry.playerName}</strong></td>
                        <td style={{ color: 'var(--orange)', fontWeight: '700' }}>{entry.score}</td>
                        <td>{entry.accuracy}%</td>
                        <td><small>{entry.difficulty}</small></td>
                        <td><small>{entry.date}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Achievements / Badges Modal */}
      {modalOpen === 'achievements' && (
        <div className="modal-backdrop" onClick={() => setModalOpen(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏅 Badges &amp; Achievements</h2>
              <button className="nav-icon-btn" type="button" onClick={() => setModalOpen(null)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="achievements-grid">
                {ACHIEVEMENTS.map((ach) => {
                  const isUnlocked = storedAchievements.includes(ach.id)
                  return (
                    <div
                      key={ach.id}
                      className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                    >
                      <div className="achievement-icon">{ach.icon}</div>
                      <div className="achievement-info">
                        <h4>{ach.title}</h4>
                        <p>{ach.description}</p>
                        <span className={`status-pill ${isUnlocked ? 'unlocked' : 'locked'}`}>
                          {isUnlocked ? '✓ UNLOCKED' : '🔒 LOCKED'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Answers Modal */}
      {modalOpen === 'review' && (
        <div className="modal-backdrop" onClick={() => setModalOpen(null)}>
          <div className="modal-card" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>📝 Question Review &amp; Facts</h2>
                <span className="modal-subtitle">
                  {reviewModalItem ? `${reviewModalItem.category} • ${reviewModalItem.difficulty}` : 'Round Review'}
                </span>
              </div>
              <button className="nav-icon-btn" type="button" onClick={() => setModalOpen(null)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              {userAnswers.length === 0 && roundQuestions.length > 0 ? (
                roundQuestions.map((q, idx) => (
                  <div className="history-card" key={q.id || idx} style={{ marginBottom: '12px' }}>
                    <div className="history-card-tags">
                      <span>QUESTION {idx + 1} &bull; {q.category}</span>
                      <span className={`diff-pill ${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                    </div>
                    <h3 style={{ margin: '6px 0', fontSize: '15px' }}>{q.question}</h3>
                    <div style={{ color: 'var(--green)', fontSize: '13px', fontWeight: '600' }}>
                      ✅ <strong>Correct Answer:</strong> {q.answer}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      💡 <strong>Fact:</strong> {q.fact}
                    </div>
                  </div>
                ))
              ) : (
                userAnswers.map((item, idx) => (
                  <div className="history-card" key={item.question.id || idx} style={{ marginBottom: '12px' }}>
                    <div className="history-card-tags">
                      <span>QUESTION {idx + 1} &bull; {item.question.category}</span>
                      <span className={`diff-pill ${item.question.difficulty.toLowerCase()}`}>
                        {item.question.difficulty}
                      </span>
                    </div>
                    <h3 style={{ margin: '6px 0', fontSize: '15px' }}>{item.question.question}</h3>
                    <div style={{ fontSize: '13px', margin: '4px 0' }}>
                      {item.isCorrect ? (
                        <span style={{ color: 'var(--green)', fontWeight: '600' }}>
                          ✅ <strong>Your Answer:</strong> {item.selectedAnswer} (Correct)
                        </span>
                      ) : item.isSkipped ? (
                        <span style={{ color: 'var(--text-muted)' }}>
                          ⏭️ <strong>Your Answer:</strong> Skipped
                        </span>
                      ) : (
                        <span style={{ color: 'var(--red)', fontWeight: '600' }}>
                          ❌ <strong>Your Answer:</strong> {item.selectedAnswer} (Incorrect)
                        </span>
                      )}
                    </div>
                    {!item.isCorrect && (
                      <div style={{ color: 'var(--green)', fontSize: '13px', fontWeight: '600' }}>
                        ✅ <strong>Correct Answer:</strong> {item.question.answer}
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      💡 <strong>Explanation:</strong> {item.question.fact}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quiz History Modal */}
      {modalOpen === 'history' && (
        <div className="modal-backdrop" onClick={() => setModalOpen(null)}>
          <div className="modal-card history-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="history-title-wrap">
                <h2>📚 Quiz History</h2>
                <span className="history-subtitle">Your recent completed quizzes (newest first)</span>
              </div>
              <div className="history-header-actions">
                {quizHistory.length > 0 && (
                  <button
                    className="clear-history-top-btn"
                    type="button"
                    onClick={() => setClearConfirmOpen(true)}
                    title="Clear all quiz history"
                  >
                    <FiTrash2 />
                    <span>Clear History</span>
                  </button>
                )}
                <button className="nav-icon-btn" type="button" onClick={() => setModalOpen(null)}>
                  <FiX />
                </button>
              </div>
            </div>
            <div className="modal-body">
              {quizHistory.length === 0 ? (
                <div className="empty-history-state">
                  <div className="empty-icon">📚</div>
                  <h3>No Quiz History Yet</h3>
                  <p>Complete your first quiz and your results will appear here.</p>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => setModalOpen(null)}
                  >
                    <FiPlay /> Start Quiz
                  </button>
                </div>
              ) : (
                <div className="history-cards-list">
                  {quizHistory.map((item) => (
                    <div className="history-card" key={item.id}>
                      <div className="history-card-top">
                        <div>
                          <span className="history-card-cat">🧠 {item.category}</span>
                          <div className="history-card-tags">
                            <span className={`diff-pill ${item.difficulty.toLowerCase()}`}>
                              {item.difficulty}
                            </span>
                            <span>&bull;</span>
                            <span>{item.mode}</span>
                            <span>&bull;</span>
                            <span>{item.questionCount} Questions</span>
                          </div>
                        </div>
                        <div className="history-acc-badge">
                          <strong>{item.accuracy}%</strong>
                          <small>Acc.</small>
                        </div>
                      </div>

                      {item.mode === '2-Player Battle' ? (
                        <div style={{ fontSize: '13px', margin: '4px 0' }}>
                          ⚔️ <strong>{item.player1Name}</strong> ({item.player1Score} pts) vs <strong>{item.player2Name}</strong> ({item.player2Score} pts) &bull; Winner: <strong>{item.winner}</strong>
                        </div>
                      ) : (
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--orange)' }}>
                          ⭐ {item.score} points
                        </div>
                      )}

                      <div className="history-stats-chips">
                        <span className="stat-chip correct">✅ {item.correct} Correct</span>
                        <span className="stat-chip wrong">❌ {item.incorrect} Wrong</span>
                        <span className="stat-chip skipped">⏭️ {item.skipped} Skipped</span>
                      </div>

                      <div className="history-sub-stats">
                        <span>🔥 Best Streak: <strong>{item.bestStreak}</strong></span>
                        {item.mode !== '2-Player Battle' ? (
                          <span>❤️ Lives: <strong>{item.livesLeft}</strong></span>
                        ) : (
                          <span>👤 Match Duel</span>
                        )}
                      </div>

                      <div className="history-card-footer">
                        <span>📅 {formatHistoryDate(item.date)}</span>
                        <div className="history-card-actions">
                          <button
                            className="history-view-details-btn"
                            type="button"
                            onClick={() => setSelectedHistoryItem(item)}
                          >
                            Details &rarr;
                          </button>
                          <button
                            className="history-view-review-btn"
                            type="button"
                            onClick={() => {
                              setReviewModalItem(item)
                              setReviewQuestionIndex(0)
                            }}
                            title="Review questions from this quiz"
                          >
                            <FiBookOpen /> View Review
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quiz History Details Modal */}
      {selectedHistoryItem && (
        <div className="modal-backdrop" onClick={() => setSelectedHistoryItem(null)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Quiz Details</h2>
              <button
                className="nav-icon-btn"
                type="button"
                onClick={() => setSelectedHistoryItem(null)}
              >
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Player:</span>
                  <strong>{selectedHistoryItem.playerName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Mode:</span>
                  <strong>{selectedHistoryItem.mode}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Category:</span>
                  <strong>{selectedHistoryItem.category}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Difficulty:</span>
                  <strong>{selectedHistoryItem.difficulty}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Questions:</span>
                  <strong>{selectedHistoryItem.questionCount}</strong>
                </div>

                <div className="aside-divider" style={{ width: '100%', margin: '6px 0' }} />

                {selectedHistoryItem.mode === '2-Player Battle' ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{selectedHistoryItem.player1Name}:</span>
                      <strong>{selectedHistoryItem.player1Score} pts ({selectedHistoryItem.player1Accuracy}%)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{selectedHistoryItem.player2Name}:</span>
                      <strong>{selectedHistoryItem.player2Score} pts ({selectedHistoryItem.player2Accuracy}%)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--yellow)', fontWeight: '700' }}>
                      <span>Winner:</span>
                      <span>🏆 {selectedHistoryItem.winner}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Score:</span>
                      <strong style={{ color: 'var(--orange)' }}>{selectedHistoryItem.score} pts</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Accuracy:</span>
                      <strong>{selectedHistoryItem.accuracy}%</strong>
                    </div>
                  </>
                )}

                <div className="aside-divider" style={{ width: '100%', margin: '6px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Correct:</span>
                  <strong style={{ color: 'var(--green)' }}>{selectedHistoryItem.correct}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Incorrect:</span>
                  <strong style={{ color: 'var(--red)' }}>{selectedHistoryItem.incorrect}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Skipped:</span>
                  <strong>{selectedHistoryItem.skipped}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Best Streak:</span>
                  <strong>{selectedHistoryItem.bestStreak} 🔥</strong>
                </div>
                {selectedHistoryItem.mode !== '2-Player Battle' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Lives Left:</span>
                    <strong>{selectedHistoryItem.livesLeft} ❤️</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                  <small>{formatHistoryDate(selectedHistoryItem.date)}</small>
                </div>
              </div>

              <button
                className="primary-button"
                type="button"
                onClick={() => setSelectedHistoryItem(null)}
                style={{ width: '100%', marginTop: '16px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear History Confirmation Modal */}
      {clearConfirmOpen && (
        <div className="modal-backdrop" onClick={() => setClearConfirmOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Clear Quiz History?</h2>
              <button
                className="nav-icon-btn"
                type="button"
                onClick={() => setClearConfirmOpen(false)}
                title="Cancel"
              >
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Are you sure you want to clear your quiz history? This will only remove your completed quiz history log. Your global leaderboard rankings, personal best records, and unlocked achievements will not be affected.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setClearConfirmOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  type="button"
                  style={{ background: 'var(--red)' }}
                  onClick={handleClearHistory}
                >
                  Clear History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Dashboard Modal */}
      {modalOpen === 'progress' && (
        <div className="modal-backdrop" onClick={() => setModalOpen(null)}>
          <div className="modal-card progress-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="history-title-wrap">
                <h2>📈 My Progress Dashboard</h2>
                <span className="history-subtitle">Analytics, performance trends &amp; topic mastery</span>
              </div>
              <button className="nav-icon-btn" type="button" onClick={() => setModalOpen(null)}>
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              {/* Time Filters */}
              <div className="progress-filters-row">
                <span className="filter-label">Filter Period:</span>
                <div className="pill-picker">
                  <button
                    type="button"
                    className={progressTimeFilter === 'all' ? 'selected' : ''}
                    onClick={() => setProgressTimeFilter('all')}
                  >
                    All Time
                  </button>
                  <button
                    type="button"
                    className={progressTimeFilter === '7days' ? 'selected' : ''}
                    onClick={() => setProgressTimeFilter('7days')}
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    className={progressTimeFilter === '30days' ? 'selected' : ''}
                    onClick={() => setProgressTimeFilter('30days')}
                  >
                    Last 30 Days
                  </button>
                </div>
              </div>

              {filteredHistoryForProgress.length === 0 ? (
                <div className="empty-history-state">
                  <div className="empty-icon">📈</div>
                  <h3>No Progress Data Yet</h3>
                  <p>Complete a few quizzes to see your performance trends and topic breakdown.</p>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => setModalOpen(null)}
                  >
                    <FiPlay /> Start Quiz
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Overall Statistics Grid */}
                  <div className="progress-stats-grid">
                    <div className="progress-stat-card">
                      <span className="p-stat-label">Total Quizzes</span>
                      <strong className="p-stat-val">{overallProgressStats.totalQuizzes}</strong>
                    </div>
                    <div className="progress-stat-card">
                      <span className="p-stat-label">Average Score</span>
                      <strong className="p-stat-val" style={{ color: 'var(--orange)' }}>
                        {overallProgressStats.avgScore}
                      </strong>
                    </div>
                    <div className="progress-stat-card">
                      <span className="p-stat-label">Average Accuracy</span>
                      <strong className="p-stat-val" style={{ color: 'var(--yellow)' }}>
                        {overallProgressStats.avgAccuracy}%
                      </strong>
                    </div>
                    <div className="progress-stat-card">
                      <span className="p-stat-label">Best Streak</span>
                      <strong className="p-stat-val">{overallProgressStats.bestStreak} 🔥</strong>
                    </div>
                    <div className="progress-stat-card">
                      <span className="p-stat-label">Questions</span>
                      <strong className="p-stat-val">{overallProgressStats.totalQuestions}</strong>
                    </div>
                    <div className="progress-stat-card">
                      <span className="p-stat-label">Correct</span>
                      <strong className="p-stat-val" style={{ color: 'var(--green)' }}>
                        {overallProgressStats.totalCorrect}
                      </strong>
                    </div>
                  </div>

                  {/* Charts Section */}
                  <div className="progress-charts-grid">
                    {/* Accuracy Trend Chart */}
                    <div className="progress-chart-box">
                      <div className="chart-box-header">
                        <h3>🎯 Accuracy Over Time</h3>
                        <small>Recent Quizzes (Chronological)</small>
                      </div>
                      {accuracyTrendData.length < 2 ? (
                        <div className="chart-insufficient-msg">
                          <span>Complete at least 2 quizzes to view accuracy progression over time.</span>
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '220px' }}>
                          <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={accuracyTrendData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" opacity={0.6} />
                              <XAxis dataKey="quizLabel" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                              <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => `${v}%`} />
                              <Tooltip content={<ChartTooltip />} />
                              <Line
                                type="monotone"
                                dataKey="accuracy"
                                name="Accuracy"
                                stroke="var(--orange)"
                                strokeWidth={3}
                                dot={{ r: 4, fill: "var(--yellow)", stroke: "var(--text-primary)", strokeWidth: 1.5 }}
                                activeDot={{ r: 6, fill: "var(--orange)" }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* Score Trend Chart */}
                    <div className="progress-chart-box">
                      <div className="chart-box-header">
                        <h3>⭐ Score Over Time</h3>
                        <small>Recent Quizzes (Chronological)</small>
                      </div>
                      {scoreTrendData.length < 2 ? (
                        <div className="chart-insufficient-msg">
                          <span>Complete at least 2 quizzes to view score progression over time.</span>
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '220px' }}>
                          <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={scoreTrendData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" opacity={0.6} />
                              <XAxis dataKey="quizLabel" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                              <YAxis stroke="var(--text-muted)" fontSize={11} />
                              <Tooltip content={<ChartTooltip />} />
                              <Line
                                type="monotone"
                                dataKey="score"
                                name="Score"
                                stroke="var(--yellow)"
                                strokeWidth={3}
                                dot={{ r: 4, fill: "var(--orange)", stroke: "var(--text-primary)", strokeWidth: 1.5 }}
                                activeDot={{ r: 6, fill: "var(--yellow)" }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category Performance Bar Chart */}
                  <div className="progress-chart-box full-width">
                    <div className="chart-box-header">
                      <h3>🧠 Accuracy by Topic</h3>
                      <small>Aggregated correct / total per category</small>
                    </div>
                    {categoryProgressStats.length === 0 ? (
                      <div className="chart-insufficient-msg">
                        <span>No category data available for the selected time filter.</span>
                      </div>
                    ) : (
                      <div style={{ width: '100%' }}>
                        <ResponsiveContainer width="100%" height={Math.max(220, categoryProgressStats.length * 38)}>
                          <BarChart
                            data={categoryProgressStats}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" opacity={0.6} />
                            <XAxis type="number" domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => `${v}%`} />
                            <YAxis type="category" dataKey="category" width={150} stroke="var(--text-primary)" fontSize={11} tickLine={false} />
                            <Tooltip content={<CategoryBarTooltip />} />
                            <Bar dataKey="accuracy" name="Accuracy" radius={[0, 4, 4, 0]}>
                              {categoryProgressStats.map((entry, idx) => (
                                <Cell
                                  key={`cell-${idx}`}
                                  fill={entry.accuracy >= 80 ? 'var(--green)' : entry.accuracy >= 65 ? 'var(--yellow)' : 'var(--orange)'}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Strongest Topic, Weakest Topic & Recent Progress */}
                  <div className="progress-insights-row">
                    <div className="insight-card">
                      <div className="insight-header">
                        <span style={{ fontSize: '20px' }}>🏆</span>
                        <div>
                          <h4>STRONGEST TOPIC</h4>
                          <small>Top Mastery</small>
                        </div>
                      </div>
                      <div>
                        {strongestTopic ? (
                          <>
                            <h3 className="insight-topic-name">{strongestTopic.category}</h3>
                            <div className="insight-stat-highlight" style={{ color: 'var(--green)' }}>
                              <strong>{strongestTopic.accuracy}%</strong> Accuracy
                            </div>
                            <p className="insight-sub">{strongestTopic.correct} / {strongestTopic.totalQuestions} Correct across {strongestTopic.quizzes} quiz{strongestTopic.quizzes === 1 ? '' : 'zes'}</p>
                          </>
                        ) : (
                          <p className="insight-sub">Play more quizzes (min 5 Qs per category) to identify your strongest topic.</p>
                        )}
                      </div>
                    </div>

                    <div className="insight-card">
                      <div className="insight-header">
                        <span style={{ fontSize: '20px' }}>🎯</span>
                        <div>
                          <h4>NEEDS IMPROVEMENT</h4>
                          <small>Focus Area</small>
                        </div>
                      </div>
                      <div>
                        {weakestTopic ? (
                          <>
                            <h3 className="insight-topic-name">{weakestTopic.category}</h3>
                            <div className="insight-stat-highlight" style={{ color: 'var(--orange)' }}>
                              <strong>{weakestTopic.accuracy}%</strong> Accuracy
                            </div>
                            <p className="insight-sub">{weakestTopic.correct} / {weakestTopic.totalQuestions} Correct across {weakestTopic.quizzes} quiz{weakestTopic.quizzes === 1 ? '' : 'zes'}</p>
                          </>
                        ) : (
                          <p className="insight-sub">Play more quizzes (min 5 Qs per category) to identify areas for improvement.</p>
                        )}
                      </div>
                    </div>

                    <div className="insight-card">
                      <div className="insight-header">
                        <span style={{ fontSize: '20px' }}>📊</span>
                        <div>
                          <h4>RECENT PROGRESS</h4>
                          <small>Performance Trend</small>
                        </div>
                      </div>
                      <div>
                        {recentProgressComparison.hasComparison ? (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 6px' }}>
                              <span style={{ fontSize: '12px' }}>Recent: <strong>{recentProgressComparison.recentAccuracy}%</strong></span>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  background: recentProgressComparison.delta >= 0 ? 'var(--green-light)' : 'var(--red-light)',
                                  color: recentProgressComparison.delta >= 0 ? 'var(--green)' : 'var(--red)'
                                }}
                              >
                                {recentProgressComparison.delta >= 0 ? `↑ +${recentProgressComparison.delta}%` : `↓ ${recentProgressComparison.delta}%`}
                              </span>
                            </div>
                            <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                              {recentProgressComparison.feedback}
                            </p>
                            <small style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{recentProgressComparison.description}</small>
                          </>
                        ) : (
                          <p className="insight-sub">{recentProgressComparison.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Topic Performance Details Table */}
                  <div className="progress-chart-box">
                    <div className="chart-box-header">
                      <h3>📋 Topic Performance Details</h3>
                      <small>Full breakdown across all subjects</small>
                    </div>

                    {categoryProgressStats.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No category data available.</p>
                    ) : (
                      <>
                        <table className="topic-perf-table desktop-only">
                          <thead>
                            <tr>
                              <th>Topic</th>
                              <th>Quizzes</th>
                              <th>Questions</th>
                              <th>Correct</th>
                              <th>Accuracy</th>
                              <th>Performance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {categoryProgressStats.map((c) => (
                              <tr key={c.category}>
                                <td><strong>{c.category}</strong></td>
                                <td>{c.quizzes}</td>
                                <td>{c.totalQuestions}</td>
                                <td>{c.correct}</td>
                                <td>
                                  <strong style={{ color: c.accuracy >= 80 ? 'var(--green)' : c.accuracy >= 60 ? 'var(--yellow)' : 'var(--orange)' }}>
                                    {c.accuracy}%
                                  </strong>
                                </td>
                                <td style={{ width: '160px' }}>
                                  <div className="topic-bar-track">
                                    <div
                                      className="topic-bar-fill"
                                      style={{
                                        width: `${c.accuracy}%`,
                                        background: c.accuracy >= 80 ? 'var(--green)' : c.accuracy >= 60 ? 'var(--yellow)' : 'var(--orange)'
                                      }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div className="topic-mobile-cards mobile-only">
                          {categoryProgressStats.map((c) => (
                            <div className="topic-mobile-card" key={c.category}>
                              <div className="topic-mobile-top">
                                <strong>{c.category}</strong>
                                <span style={{ fontWeight: '700', color: c.accuracy >= 80 ? 'var(--green)' : c.accuracy >= 60 ? 'var(--yellow)' : 'var(--orange)' }}>
                                  {c.accuracy}%
                                </span>
                              </div>
                              <div className="topic-mobile-stats">
                                <span>Quizzes: <strong>{c.quizzes}</strong></span>
                                <span>Questions: <strong>{c.totalQuestions}</strong></span>
                                <span>Correct: <strong>{c.correct}</strong></span>
                              </div>
                              <div className="topic-bar-track">
                                <div
                                  className="topic-bar-fill"
                                  style={{
                                    width: `${c.accuracy}%`,
                                    background: c.accuracy >= 80 ? 'var(--green)' : c.accuracy >= 60 ? 'var(--yellow)' : 'var(--orange)'
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Past Quiz Question-by-Question Review Modal */}
      {reviewModalItem && (
        <div className="modal-backdrop" onClick={() => setReviewModalItem(null)}>
          <div className="modal-card review-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>📖 Quiz Review</h2>
                <span className="modal-subtitle">
                  {reviewModalItem.category} &bull; {reviewModalItem.difficulty} &bull; {reviewModalItem.questionCount} Questions &bull; {reviewModalItem.accuracy}% Accuracy
                </span>
              </div>
              <button
                className="nav-icon-btn"
                type="button"
                onClick={() => setReviewModalItem(null)}
                title="Close Review"
              >
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              <div className="review-stats-bar">
                <div className="review-stat-item">
                  <span>Score</span>
                  <strong>{reviewModalItem.score}</strong>
                </div>
                <div className="review-stat-item">
                  <span>Accuracy</span>
                  <strong style={{ color: reviewModalItem.accuracy >= 80 ? 'var(--green)' : 'var(--orange)' }}>
                    {reviewModalItem.accuracy}%
                  </strong>
                </div>
                <div className="review-stat-item">
                  <span>Correct</span>
                  <strong style={{ color: 'var(--green)' }}>{reviewModalItem.correct}</strong>
                </div>
                <div className="review-stat-item">
                  <span>Incorrect</span>
                  <strong style={{ color: 'var(--red)' }}>{reviewModalItem.incorrect}</strong>
                </div>
                <div className="review-stat-item">
                  <span>Skipped</span>
                  <strong>{reviewModalItem.skipped}</strong>
                </div>
                <div className="review-stat-item">
                  <span>Best Streak</span>
                  <strong>{reviewModalItem.bestStreak} 🔥</strong>
                </div>
              </div>

              {!reviewModalItem.reviewQuestions || reviewModalItem.reviewQuestions.length === 0 ? (
                <div className="empty-history-state">
                  <FiAlertTriangle style={{ fontSize: '32px', color: 'var(--yellow)' }} />
                  <h3>Detailed Review Unavailable</h3>
                  <p>Detailed question-by-question review is not available for this older quiz record.</p>
                  <small style={{ color: 'var(--text-muted)' }}>All newly completed quizzes automatically record full question-by-question review data.</small>
                </div>
              ) : (
                (() => {
                  const currentQ = reviewModalItem.reviewQuestions[reviewQuestionIndex]
                  if (!currentQ) return null

                  return (
                    <div>
                      <div className="review-nav-strip">
                        {reviewModalItem.reviewQuestions.map((q, idx) => {
                          const statusClass = q.isCorrect ? 'status-correct' : q.isSkipped ? 'status-skipped' : 'status-wrong'
                          return (
                            <button
                              key={q.questionId || idx}
                              type="button"
                              className={`strip-pill ${idx === reviewQuestionIndex ? 'active' : ''} ${statusClass}`}
                              onClick={() => setReviewQuestionIndex(idx)}
                              title={`Question ${idx + 1}: ${q.isCorrect ? 'Correct' : q.isSkipped ? 'Skipped' : 'Incorrect'}`}
                            >
                              {idx + 1}
                            </button>
                          )
                        })}
                      </div>

                      <div className="review-active-card">
                        <div className="review-q-header">
                          <span className="review-q-num">
                            QUESTION {reviewQuestionIndex + 1} OF {reviewModalItem.reviewQuestions.length}
                          </span>
                          <span className={`review-status-tag ${currentQ.isCorrect ? 'correct' : currentQ.isSkipped ? 'skipped' : 'wrong'}`}>
                            {currentQ.isCorrect ? '✓ Correct' : currentQ.isSkipped ? '⏭ Skipped' : '✗ Incorrect'}
                          </span>
                        </div>

                        <h3 className="review-active-title">{currentQ.question}</h3>

                        <div className="review-options-list">
                          {currentQ.options.map((opt, optIdx) => {
                            const isUserChoice = currentQ.userAnswer === opt
                            const isCorrectChoice = currentQ.correctAnswer === opt
                            let optClass = 'review-option'

                            if (isCorrectChoice) {
                              optClass += ' option-correct'
                            } else if (isUserChoice && !currentQ.isCorrect) {
                              optClass += ' option-wrong'
                            }

                            return (
                              <div key={optIdx} className={optClass}>
                                <span className="opt-letter">{String.fromCharCode(65 + optIdx)}</span>
                                <span style={{ flex: 1 }}>{opt}</span>
                                {isUserChoice && (
                                  <span className="user-choice-badge">
                                    {currentQ.isCorrect ? 'Your Answer (Correct)' : 'Your Answer'}
                                  </span>
                                )}
                                {isCorrectChoice && !isUserChoice && (
                                  <span className="correct-choice-badge">
                                    Correct Answer
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', borderTop: '1px solid var(--line)', paddingTop: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Your Answer:</span>
                            <strong style={{ color: currentQ.isCorrect ? 'var(--green)' : currentQ.isSkipped ? 'var(--text-muted)' : 'var(--red)' }}>
                              {currentQ.userAnswer === 'SKIPPED' || currentQ.isSkipped
                                ? '⏭ Skipped'
                                : currentQ.userAnswer === 'TIME_UP'
                                ? '⏰ Time Expired'
                                : currentQ.userAnswer || 'None'}
                            </strong>
                          </div>
                          {!currentQ.isCorrect && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Correct Answer:</span>
                              <strong style={{ color: 'var(--green)' }}>{currentQ.correctAnswer}</strong>
                            </div>
                          )}
                        </div>

                        {currentQ.fact && (
                          <div className="review-fact-box">
                            💡 <strong>Explanation:</strong> {currentQ.fact}
                          </div>
                        )}
                      </div>

                      <div className="review-footer-nav">
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => setReviewQuestionIndex((prev) => Math.max(0, prev - 1))}
                          disabled={reviewQuestionIndex === 0}
                        >
                          <FiChevronLeft /> Previous
                        </button>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {reviewQuestionIndex + 1} / {reviewModalItem.reviewQuestions.length}
                        </span>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => setReviewQuestionIndex((prev) => Math.min(reviewModalItem.reviewQuestions.length - 1, prev + 1))}
                          disabled={reviewQuestionIndex === reviewModalItem.reviewQuestions.length - 1}
                        >
                          Next <FiChevronRight />
                        </button>
                      </div>
                    </div>
                  )
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* How to Play Modal */}
      {modalOpen === 'help' && (
        <div className="modal-backdrop" onClick={() => setModalOpen(null)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>❓ How to Play Quiz Battle</h2>
              <button className="nav-icon-btn" type="button" onClick={() => setModalOpen(null)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body" style={{ lineHeight: '1.6', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p><strong>🎯 Objective:</strong> Answer Computer Science theory questions as fast and accurately as possible.</p>
              <p><strong>❤️ Lives:</strong> You start with 3 lives. Wrong answers or timer expirations cost 1 life.</p>
              <p><strong>💡 Hints:</strong> You have 3 hints per quiz. Each hint eliminates up to 2 incorrect choices.</p>
              <p><strong>⏭️ Skip:</strong> Skip any question without losing a life (streak resets).</p>
              <p><strong>🔥 Streak Multipliers:</strong> Build streaks for bonus score multipliers up to 2.0x!</p>
              <p><strong>⚔️ Battle Mode:</strong> Challenge a friend locally on the same device with identical questions.</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Navigation Slide-in Drawer (<1024px) */}
      <MobileNavigationDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        goToHome={goToHome}
        openHistory={() => {
          setQuizHistory(getQuizHistory(authSession?.id))
          setModalOpen('history')
        }}
        openProgress={() => {
          setQuizHistory(getQuizHistory(authSession?.id))
          setModalOpen('progress')
        }}
        openLeaderboard={() => setModalOpen('leaderboard')}
        openAchievements={() => setModalOpen('achievements')}
        scrollToCategories={scrollToCategories}
        switchToBattleMode={() => {
          setGameMode('battle')
          setErrorMessage('')
          scrollToTop()
          soundEffects.playClick(soundEnabled)
        }}
        quizHistoryCount={quizHistory.length}
        avgAccuracy={overallProgressStats.avgAccuracy}
        gameState={gameState}
        modalOpen={modalOpen}
        authSession={authSession}
        playerName={playerName}
        onLogout={() => setLogoutModalOpen(true)}
        theme={theme}
        toggleTheme={toggleTheme}
        soundEnabled={soundEnabled}
        toggleSound={toggleSound}
      />

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={logoutModalOpen}
        onCancel={() => setLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
        username={authSession?.username || playerName}
      />
    </main>
  )
}

export default App
