import { useState } from 'react'
import {
  Copy,
  Check,
  Link2,
  LogOut,
  Home as HomeIcon,
  Wifi,
  WifiOff,
  Users,
  Clock,
  Layers,
  Play,
  AlertCircle,
  Loader2,
  UserCheck,
  Tags,
  UserX,
  ShieldBan,
} from 'lucide-react'
import './Lobby.css'


const WORD_CATEGORIES = [
  'All',
  'Animals',
  'Food',
  'Objects',
  'Nature',
  'Places',
]

function Lobby({
  room = { code: 'XXXX', settings: {} },
  player = {},
  players = [],
  isHost = false,
  isConnected = false,
  onStartGame,
  onLeaveRoom,
  onReturnHome,
  onCopyCode,
  onCopyInvite,
  onUpdateSettings,
  isLoading = false,
  error = null,
   onKickPlayer,
  onBanPlayer,
}) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const settings = {
    rounds: 3,
    drawTime: 60,
    maxPlayers: 8,
    wordChoices: 3,
    wordCategory: 'All',
    ...(room.settings || {}),
  }

  const playerCount = players.length
  const maxPlayers = settings.maxPlayers || 8

  const handleCopyCode = () => {
    onCopyCode(room.code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 1500)
  }

  const handleCopyLink = () => {
    onCopyInvite(room.code)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 1500)
  }

  const handleSettingChange = (key, value) => {
    if (!isHost) return
    onUpdateSettings({ ...settings, [key]: value })
  }

  const handleKickPlayer = (targetPlayer) => {
  if (!isHost || !onKickPlayer) return

  const confirmed = window.confirm(
    `Are you sure you want to kick ${targetPlayer.name}? They can rejoin later.`
  )

  if (confirmed) {
    onKickPlayer(targetPlayer.playerId)
  }
}

const handleBanPlayer = (targetPlayer) => {
  if (!isHost || !onBanPlayer) return

  const confirmed = window.confirm(
    `Are you sure you want to ban ${targetPlayer.name}? They won't be able to rejoin this room using the same player ID.`
  )

  if (confirmed) {
    onBanPlayer(targetPlayer.playerId)
  }
}

  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }

  const getAvatarColor = (name) => {
    const colors = [
      '#626B4F', '#75885B', '#A5AC8A', '#B75C4C',
      '#5B7DA6', '#8B5CB5', '#D4A23A', '#3D8B8B',
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div className="lobby-page">
      <header className="lobby-header">
        <div className="lobby-header-left">
          <button className="btn-ghost lobby-home-btn" onClick={onReturnHome}>
            <HomeIcon size={18} />
            Home
          </button>
          <div className="lobby-code-display">
            <span className="lobby-code-label">Room Code</span>
            <span className="lobby-code-value">{room.code}</span>
          </div>
          <div className="lobby-copy-btns">
            <button
              className="lobby-copy-btn"
              onClick={handleCopyCode}
              title="Copy room code"
            >
              {copiedCode ? <Check size={15} /> : <Copy size={15} />}
              {copiedCode ? 'Copied' : 'Copy code'}
            </button>
            <button
              className="lobby-copy-btn"
              onClick={handleCopyLink}
              title="Copy invite link"
            >
              {copiedLink ? <Check size={15} /> : <Link2 size={15} />}
              {copiedLink ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>

        <div className="lobby-header-right">
          <div className={`lobby-connection ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <button className="btn-danger lobby-leave-btn" onClick={onLeaveRoom}>
            <LogOut size={16} />
            Leave
          </button>
        </div>
      </header>

      {error && (
        <div className="lobby-error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <main className="lobby-main">
        <section className="lobby-panel lobby-settings-panel card">
          <div className="lobby-panel-header">
            <Layers size={18} />
            <h2>Room Settings</h2>
          </div>

          <div className="lobby-settings-list">
            <div className="lobby-setting-row">
              <div className="lobby-setting-info">
                <Layers size={16} className="lobby-setting-icon" />
                <div>
                  <span className="lobby-setting-name">Rounds</span>
                  <span className="lobby-setting-desc">How many times everyone draws</span>
                </div>
              </div>
              <div className="lobby-setting-controls">
                {[1, 2, 3, 5, 8].map((n) => (
                  <button
                    key={n}
                    className={`lobby-setting-chip ${settings.rounds === n ? 'active' : ''
                      }`}
                    onClick={() => handleSettingChange('rounds', n)}
                    disabled={!isHost}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="lobby-setting-row">
              <div className="lobby-setting-info">
                <Clock size={16} className="lobby-setting-icon" />
                <div>
                  <span className="lobby-setting-name">Drawing time</span>
                  <span className="lobby-setting-desc">Seconds per round</span>
                </div>
              </div>
              <div className="lobby-setting-controls">
                {[30, 45, 60, 90, 120].map((n) => (
                  <button
                    key={n}
                    className={`lobby-setting-chip ${settings.drawTime === n ? 'active' : ''
                      }`}
                    onClick={() => handleSettingChange('drawTime', n)}
                    disabled={!isHost}
                  >
                    {n}s
                  </button>
                ))}
              </div>
            </div>

            <div className="lobby-setting-row">
              <div className="lobby-setting-info">
                <Users size={16} className="lobby-setting-icon" />
                <div>
                  <span className="lobby-setting-name">Max players</span>
                  <span className="lobby-setting-desc">Room capacity</span>
                </div>
              </div>
              <div className="lobby-setting-controls">
                {[4, 6, 8, 10, 12].map((n) => (
                  <button
                    key={n}
                    className={`lobby-setting-chip ${settings.maxPlayers === n ? 'active' : ''
                      }`}
                    onClick={() => handleSettingChange('maxPlayers', n)}
                    disabled={!isHost}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="lobby-setting-row">
              <div className="lobby-setting-info">
                <Layers size={16} className="lobby-setting-icon" />
                <div>
                  <span className="lobby-setting-name">Word choices</span>
                  <span className="lobby-setting-desc">Options per drawer</span>
                  {/* Word category */}
                  <div className="lobby-setting-row">
                    <div className="lobby-setting-info">
                      <Tags size={16} className="lobby-setting-icon" />
                      <div>
                        <span className="lobby-setting-name">Word category</span>
                        <span className="lobby-setting-desc">
                          Choose the type of words in the game
                        </span>
                      </div>
                    </div>

                    <div className="lobby-setting-controls">
                      <select
                        className="lobby-category-select"
                        value={settings.wordCategory}
                        onChange={(event) =>
                          handleSettingChange('wordCategory', event.target.value)
                        }
                        disabled={!isHost}
                        aria-label="Select word category"
                      >
                        {WORD_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category === 'All' ? 'All Categories' : category}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lobby-setting-controls">
                {[2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    className={`lobby-setting-chip ${settings.wordChoices === n ? 'active' : ''
                      }`}
                    onClick={() => handleSettingChange('wordChoices', n)}
                    disabled={!isHost}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!isHost && (
            <div className="lobby-settings-notice">
              Only the host can change settings.
            </div>
          )}
        </section>

        <section className="lobby-panel lobby-players-panel card">
          <div className="lobby-panel-header">
            <Users size={18} />
            <h2>Players</h2>
            <span className="lobby-player-count">
              {playerCount} / {maxPlayers}
            </span>
          </div>

          <div className="lobby-players-grid">
            {players.length === 0 ? (
              <div className="lobby-players-empty">
                Waiting for players to join...
              </div>
            ) : (
              players.map((p) => (
                <div
                  key={p.id}
                  className={`lobby-player-card ${p.id === player.id ? 'lobby-player-current' : ''
                    }`}
                >
                  <div
                    className="lobby-player-avatar"
                    style={{ background: getAvatarColor(p.name) }}
                  >
                    {getInitials(p.name)}
                  </div>
                  <div className="lobby-player-info">
                    <span className="lobby-player-name">
                      {p.name}
                      {p.id === player.id && (
                        <span className="lobby-player-you">You</span>
                      )}
                    </span>
                    <div className="lobby-player-badges">
                      {p.isHost && (
                        <span className="lobby-host-badge">
                          <UserCheck size={11} /> Host
                        </span>
                      )}
                      {p.isReady && !p.isHost && (
                        <span className="lobby-ready-badge">Ready</span>
                      )}
                    </div>
                  </div>
                  {isHost && p.playerId !== player.playerId && (
  <div className="lobby-player-actions">
    <button
      type="button"
      className="lobby-player-action lobby-kick-btn"
      onClick={() => handleKickPlayer(p)}
      title={`Kick ${p.name}`}
      aria-label={`Kick ${p.name}`}
    >
      <UserX size={15} />
      <span>Kick</span>
    </button>

    <button
      type="button"
      className="lobby-player-action lobby-ban-btn"
      onClick={() => handleBanPlayer(p)}
      title={`Ban ${p.name}`}
      aria-label={`Ban ${p.name}`}
    >
      <ShieldBan size={15} />
      <span>Ban</span>
    </button>
  </div>
)}
                </div>
              ))
            )}
          </div>

          {playerCount < maxPlayers && (
            <div className="lobby-slots-remaining">
              {maxPlayers - playerCount} slot{maxPlayers - playerCount !== 1 ? 's' : ''} remaining
            </div>
          )}
        </section>
      </main>

      <footer className="lobby-footer">
        <div className="lobby-footer-info">
          <Users size={16} />
          <span>{playerCount} / {maxPlayers} players</span>
        </div>
        {isHost ? (
          <button
            className="btn-primary lobby-start-btn"
            onClick={onStartGame}
            disabled={isLoading || playerCount < 2}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play size={18} />
                Start Game
              </>
            )}
          </button>
        ) : (
          <div className="lobby-waiting">
            <Loader2 size={18} className="animate-spin lobby-waiting-spinner" />
            <span>Waiting for host to start the game...</span>
          </div>
        )}
      </footer>
    </div>
  )
}

export default Lobby
