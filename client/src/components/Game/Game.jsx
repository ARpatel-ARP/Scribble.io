import { useState, useRef, useCallback } from 'react'
import {
  Pen,
  Eraser,
  Undo2,
  Trash2,
  Circle,
  Clock,
  Wifi,
  WifiOff,
  LogOut,
  Home as HomeIcon,
  Loader2,
  Trophy,
} from 'lucide-react'
import DrawingCanvas, { BRUSH_COLORS } from '../Canvas/DrawingCanvas.jsx'
import Chat from '../Chat/Chat.jsx'
import Leaderboard from '../Leaderboard/Leaderboard.jsx'
import './Game.css'

function Game({
  room = { code: 'XXXX' },
  player = {},
  players = [],
  gameState = 'waiting',
  currentRound = 0,
  totalRounds = 3,
  timeLeft = 0,
  drawerId = null,
  wordHint = '',
  wordChoices = [],
  chatMessages = [],
  remoteStrokes = [],
  clearSignal = 0,
  isConnected = false,
  onWordChosen,
  onGuess,
  onChatMessage,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
  onCanvasCleared,
  onUndo,
  onLeaveGame,
  onReturnHome,
  onPlayAgain,
  finalScores = null,
}) {
  const [tool, setTool] = useState('pen')
  const [brushColor, setBrushColor] = useState('#292D25')
  const [brushSize, setBrushSize] = useState(4)
  const [undoSignal, setUndoSignal] = useState(0)

  const canvasRef = useRef(null)

  const isDrawer = player.id === drawerId
  const canDraw = isDrawer && gameState === 'drawing'
  const drawer = players.find((p) => p.id === drawerId)
  const drawerName = drawer ? drawer.name : 'Unknown'

  const handleClear = () => {
    if (onCanvasCleared) onCanvasCleared()
  }

  const handleUndo = () => {
    setUndoSignal((s) => s + 1)
    if (onUndo) onUndo()
  }

  const handleStrokeStart = useCallback(
    (stroke) => {
      if (onStrokeStart) onStrokeStart(stroke)
    },
    [onStrokeStart],
  )

  const handleStrokeMove = useCallback(
    (stroke) => {
      if (onStrokeMove) onStrokeMove(stroke)
    },
    [onStrokeMove],
  )

  const handleStrokeEnd = useCallback(
    (stroke) => {
      if (onStrokeEnd) onStrokeEnd(stroke)
    },
    [onStrokeEnd],
  )

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const renderWordDisplay = () => {
    if (gameState === 'selecting' && isDrawer && wordChoices.length > 0) {
      return (
        <div className="game-word-modal-overlay">
          <div className="game-word-modal">
            <h3 className="game-word-modal-title">Choose a word to draw</h3>
            <p className="game-word-modal-desc">
              Pick one — the others will never know.
            </p>
            <div className="game-word-choices">
              {wordChoices.map((word, i) => (
                <button
                  key={i}
                  className="game-word-choice-btn"
                  onClick={() => onWordChosen(word)}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (gameState === 'drawing' || gameState === 'guessing') {
      if (isDrawer && wordHint) {
        return (
          <div className="game-word-display game-word-drawer">
            <span className="game-word-label">Your word:</span>
            <span className="game-word-value">{wordHint}</span>
          </div>
        )
      }

      return (
        <div className="game-word-display game-word-guesser">
          <span className="game-word-hint-letters">
            {'_ '.repeat(6).trim()}
          </span>
        </div>
      )
    }

    if (gameState === 'round_end') {
      return (
        <div className="game-word-display game-word-reveal">
          <span className="game-word-label">The word was:</span>
          <span className="game-word-value">{wordHint || '—'}</span>
        </div>
      )
    }

    return null
  }

  const getStatusLabel = () => {
    switch (gameState) {
      case 'waiting':
        return 'Waiting for round to begin...'
      case 'selecting':
        return isDrawer
          ? 'Choose your word'
          : `${drawerName} is choosing a word`
      case 'drawing':
        return isDrawer ? 'Your turn to draw' : 'Guess the word'
      case 'guessing':
        return isDrawer ? 'Keep drawing!' : 'Guess the word'
      case 'correct':
        return 'Correct guess!'
      case 'round_end':
        return 'Round ended'
      case 'game_over':
        return 'Game over'
      case 'reconnecting':
        return 'Reconnecting...'
      case 'connection_lost':
        return 'Connection lost'
      default:
        return ''
    }
  }

  if (gameState === 'game_over' && finalScores) {
    const sorted = [...finalScores].sort((a, b) => b.score - a.score)
    const winner = sorted[0]

    return (
      <div className="game-page game-results-page">
        <header className="game-results-header">
          <div className="game-results-trophy">
            <Trophy size={36} />
          </div>
          <h1 className="game-results-title">
            {winner ? `${winner.name} wins!` : 'Game Over'}
          </h1>
          <p className="game-results-subtitle">
            Final scores after {totalRounds} round{totalRounds !== 1 ? 's' : ''}
          </p>
        </header>

        <div className="game-results-podium">
          {sorted.slice(0, 3).map((p, i) => (
            <div
              key={p.id}
              className={`game-podium-place podium-${i + 1} ${
                p.id === player.id ? 'podium-current' : ''
              }`}
              style={{ order: i === 0 ? 2 : i === 1 ? 1 : 3 }}
            >
              <div className="game-podium-rank">#{i + 1}</div>
              <div className="game-podium-name">{p.name}</div>
              <div className="game-podium-score">{p.score} pts</div>
              {i === 0 && (
                <div className="game-podium-crown">
                  <Trophy size={20} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="game-results-leaderboard">
          <Leaderboard
            players={sorted}
            currentUserId={player.id}
            title="Final Leaderboard"
          />
        </div>

        <div className="game-results-actions">
          <button className="btn-primary" onClick={onPlayAgain}>
            <Trophy size={18} />
            Play Again
          </button>
          <button className="btn-secondary" onClick={onReturnHome}>
            <HomeIcon size={18} />
            Return Home
          </button>
        </div>
      </div>
    )
  }

  if (gameState === 'reconnecting' || gameState === 'connection_lost') {
    return (
      <div className="game-page game-connection-lost">
        <div className="game-connection-card">
          {gameState === 'reconnecting' ? (
            <>
              <Loader2 size={40} className="animate-spin game-conn-spinner" />
              <h2>Reconnecting...</h2>
              <p>Trying to restore your connection to the room.</p>
            </>
          ) : (
            <>
              <WifiOff size={40} className="game-conn-lost-icon" />
              <h2>Connection lost</h2>
              <p>You've been disconnected from the game server.</p>
              <button className="btn-primary" onClick={onReturnHome}>
                <HomeIcon size={18} />
                Return Home
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="game-header-left">
          <button className="btn-ghost game-home-btn" onClick={onLeaveGame}>
            <LogOut size={16} />
            Leave
          </button>
          <div className="game-round-info">
            <span className="game-round-label">Round</span>
            <span className="game-round-value">
              {currentRound} / {totalRounds}
            </span>
          </div>
        </div>

        <div className="game-header-center">
          <div className={`game-timer ${timeLeft <= 10 ? 'game-timer-urgent' : ''}`}>
            <Clock size={16} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          {timeLeft > 0 && timeLeft <= 10 && gameState === 'drawing' && (
            <div className="timer-warning">
              Only {timeLeft} seconds left!
            </div>
          )}

          <div className="game-status-label">{getStatusLabel()}</div>
        </div>

        <div className="game-header-right">
          <div className={`game-connection ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
          </div>
          <div className="game-drawer-info">
            <span className="game-drawer-label">Drawing:</span>
            <span className="game-drawer-name">{drawerName}</span>
          </div>
        </div>
      </header>

      {renderWordDisplay()}

      <div className="game-layout">
        <aside className="game-col game-col-left">
          <Leaderboard
            players={players}
            currentUserId={player.id}
            drawerId={drawerId}
            title="Scores"
          />
        </aside>

        <main className="game-col game-col-center">
          <div className="game-canvas-container">
            <DrawingCanvas
              ref={canvasRef}
              canDraw={canDraw}
              brushColor={brushColor}
              brushSize={brushSize}
              tool={tool}
              remoteStrokes={remoteStrokes}
              clearSignal={clearSignal}
              undoSignal={undoSignal}
              onStrokeStart={handleStrokeStart}
              onStrokeMove={handleStrokeMove}
              onStrokeEnd={handleStrokeEnd}
              onCanvasCleared={onCanvasCleared}
            />
          </div>

          {canDraw && (
            <div className="game-toolbar">
              <div className="game-tool-group">
                <button
                  className={`game-tool-btn ${tool === 'pen' ? 'active' : ''}`}
                  onClick={() => setTool('pen')}
                  title="Pen"
                  aria-label="Select pen tool"
                >
                  <Pen size={18} />
                </button>
                <button
                  className={`game-tool-btn ${tool === 'eraser' ? 'active' : ''}`}
                  onClick={() => setTool('eraser')}
                  title="Eraser"
                  aria-label="Select eraser tool"
                >
                  <Eraser size={18} />
                </button>
              </div>

              <div className="game-tool-divider" />

              <div className="game-tool-group game-color-palette">
                {BRUSH_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`game-color-btn ${
                      brushColor === color && tool === 'pen' ? 'active' : ''
                    }`}
                    style={{ background: color }}
                    onClick={() => {
                      setBrushColor(color)
                      setTool('pen')
                    }}
                    title={color}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>

              <div className="game-tool-divider" />

              <div className="game-tool-group game-brush-sizes">
                {[2, 4, 8, 16].map((size) => (
                  <button
                    key={size}
                    className={`game-brush-size-btn ${
                      brushSize === size ? 'active' : ''
                    }`}
                    onClick={() => setBrushSize(size)}
                    title={`${size}px brush`}
                    aria-label={`Select brush size ${size}`}
                  >
                    <Circle size={Math.min(size + 4, 18)} fill="currentColor" />
                  </button>
                ))}
              </div>

              <div className="game-tool-divider" />

              <div className="game-tool-group">
                <button
                  className="game-tool-btn game-tool-action"
                  onClick={handleUndo}
                  title="Undo last stroke"
                  aria-label="Undo"
                >
                  <Undo2 size={18} />
                </button>
                <button
                  className="game-tool-btn game-tool-action game-tool-danger"
                  onClick={handleClear}
                  title="Clear canvas"
                  aria-label="Clear canvas"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          )}

          {!canDraw && gameState === 'drawing' && (
            <div className="game-viewing-toolbar">
              <span className="game-viewing-text">
                {isDrawer ? 'Drawing in progress...' : `${drawerName} is drawing`}
              </span>
            </div>
          )}
        </main>

        <aside className="game-col game-col-right">
          <Chat
            messages={chatMessages}
            onSendMessage={(text) => {
              if (onChatMessage) onChatMessage(text)
            }}
            disabled={false}
            placeholder="Type a message or guess..."
            currentUserId={player.id}
          />
        </aside>
      </div>
    </div>
  )
}

export default Game

