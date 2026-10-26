import { useState } from 'react'
import {
  Pencil,
  Users,
  Zap,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react'
import './Home.css'

function Home({
  playerName,
  setPlayerName,
  onCreateRoom,
  onJoinRoom,
  isLoading = false,
  error = null,
}) {
  const [roomCode, setRoomCode] = useState('')
  const [nameError, setNameError] = useState('')
  const [codeError, setCodeError] = useState('')
  const [copied, setCopied] = useState(false)

  const validateName = () => {
    if (!playerName.trim()) {
      setNameError('Please enter your name first.')
      return false
    }
    setNameError('')
    return true
  }

  const handleCreate = (e) => {
    e.preventDefault()
    if (!validateName()) return
    onCreateRoom(playerName.trim())
  }

  const handleJoin = (e) => {
    e.preventDefault()
    if (!validateName()) return
    if (!roomCode.trim()) {
      setCodeError('Enter a room code to join.')
      return
    }
    setCodeError('')
    onJoinRoom(playerName.trim(), roomCode.trim().toUpperCase())
  }

  const handleCopyDemo = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-logo-group">
          <div className="home-logo">
            <Pencil size={22} strokeWidth={2.5} />
          </div>
          <span className="home-logo-text">Scribble</span>
          <span className="home-badge">
            <Zap size={11} />
            Real-time multiplayer
          </span>
        </div>
        <nav className="home-nav">
          <a
            href="https://github.com/ARpatel-ARP/Scribble.io/blob/main/README.md"
            target="_blank"
            rel="noopener noreferrer"
            className="home-nav-link"
          >
            About
          </a>
          <a
            href="https://github.com/ARpatel-ARP/Scribble.io.git"
            target="_blank"
            rel="noopener noreferrer"
            className="home-nav-link"
          >
            GitHub
          </a>
        </nav>
      </header>

      <main className="home-main">
        <div className="home-left">
          <div className="home-eyebrow">DRAW. GUESS. CONNECT.</div>
          <h1 className="home-heading">
            A little creativity goes a long way.
          </h1>
          <p className="home-description">
            Join a room with friends, take turns drawing prompts, and race to
            guess the word before time runs out. The faster you guess, the more
            points you earn.
          </p>

          {error && (
            <div className="home-error-banner">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form className="home-form" onSubmit={handleCreate}>
            <label className="home-label" htmlFor="player-name">
              Your name
            </label>
            <input
              id="player-name"
              type="text"
              className={`input-field home-name-input ${
                nameError ? 'input-error' : ''
              }`}
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value)
                if (nameError) setNameError('')
              }}
              placeholder="Enter your name"
              maxLength={16}
              disabled={isLoading}
            />
            {nameError && (
              <span className="home-field-error">{nameError}</span>
            )}

            <button
              type="submit"
              className="btn-primary home-create-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Creating room...' : 'Create a Room'}
            </button>
          </form>

          <div className="home-divider">
            <span>or</span>
          </div>

          <form className="home-join-form" onSubmit={handleJoin}>
            <label className="home-label" htmlFor="room-code">
              Room code
            </label>
            <div className="home-join-row">
              <input
                id="room-code"
                type="text"
                className={`input-field home-code-input ${
                  codeError ? 'input-error' : ''
                }`}
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase())
                  if (codeError) setCodeError('')
                }}
                placeholder="ABCD"
                maxLength={6}
                disabled={isLoading}
              />
              <button
                type="submit"
                className="btn-secondary home-join-btn"
                disabled={isLoading}
              >
                Join Room
              </button>
            </div>
            {codeError && (
              <span className="home-field-error">{codeError}</span>
            )}
          </form>
        </div>

        <div className="home-right">
          <div className="home-preview">
            <div className="home-preview-header">
              <div className="home-preview-players">
                <div className="home-preview-avatar" style={{ background: '#626B4F' }}>
                  AL
                </div>
                <div className="home-preview-avatar" style={{ background: '#75885B' }}>
                  JO
                </div>
                <div className="home-preview-avatar" style={{ background: '#B75C4C' }}>
                  MA
                </div>
                <div className="home-preview-avatar home-preview-avatar-more">
                  <Users size={14} />
                </div>
              </div>
              <div className="home-preview-timer">0:45</div>
            </div>

            <div className="home-preview-canvas">
              <svg viewBox="0 0 400 240" className="home-preview-svg">
                <path
                  d="M 60 180 Q 80 120 130 130 Q 180 140 200 100 Q 220 60 270 80 Q 320 100 330 160"
                  fill="none"
                  stroke="#626B4F"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  d="M 100 200 L 150 180 L 200 200 L 250 175 L 300 200"
                  fill="none"
                  stroke="#B75C4C"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle cx="180" cy="140" r="8" fill="#D4A23A" />
                <path
                  d="M 50 50 L 70 45 L 65 65 Z"
                  fill="none"
                  stroke="#75885B"
                  strokeWidth="3"
                />
              </svg>
              <div className="home-preview-word">
                <span className="home-preview-word-letter">M</span>
                <span className="home-preview-word-letter">O</span>
                <span className="home-preview-word-letter home-preview-word-underscore">_</span>
                <span className="home-preview-word-letter">N</span>
                <span className="home-preview-word-letter home-preview-word-underscore">_</span>
                <span className="home-preview-word-letter">N</span>
              </div>
            </div>

            <div className="home-preview-footer">
              <div className="home-preview-chat-bubble home-preview-chat-system">
                Alex is drawing...
              </div>
              <div className="home-preview-chat-bubble home-preview-chat-correct">
                <Check size={12} /> Jordan guessed correctly!
              </div>
            </div>

            <button
              className="home-preview-copy"
              onClick={handleCopyDemo}
              type="button"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Room: SCRIB'}
            </button>
          </div>
        </div>
      </main>

      <footer className="home-footer">
        <p>Built for creativity. Ready for your Socket.IO backend.</p>
      </footer>
    </div>
  )
}

export default Home
