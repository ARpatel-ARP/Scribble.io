import { useMemo } from 'react'
import { Crown, Pencil, Check } from 'lucide-react'
import './Leaderboard.css'

function getAvatarColor(name) {
  const colors = [
    '#626B4F',
    '#75885B',
    '#A5AC8A',
    '#B75C4C',
    '#5B7DA6',
    '#8B5CB5',
    '#D4A23A',
    '#3D8B8B',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function Leaderboard({
  players = [],
  currentUserId = null,
  drawerId = null,
  showRank = true,
  title = 'Leaderboard',
  dense = false,
}) {
  const sorted = useMemo(() => {
    return [...players].sort((a, b) => b.score - a.score)
  }, [players])

  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }

  return (
    <div className={`leaderboard ${dense ? 'leaderboard-dense' : ''}`}>
      <div className="leaderboard-header">
        <span className="leaderboard-title">{title}</span>
        <span className="leaderboard-count">{sorted.length} players</span>
      </div>
      <div className="leaderboard-list">
        {sorted.length === 0 ? (
          <div className="leaderboard-empty">No players yet</div>
        ) : (
          sorted.map((player, index) => {
            const isCurrent = player.id === currentUserId
            const isDrawer = player.id === drawerId
            const hasGuessed = player.hasGuessed === true

            return (
              <div
                key={player.id}
                className={`leaderboard-row ${
                  isCurrent ? 'leaderboard-row-current' : ''
                } ${isDrawer ? 'leaderboard-row-drawer' : ''}`}
              >
                {showRank && (
                  <span
                    className={`leaderboard-rank rank-${index + 1}`}
                  >
                    {index + 1}
                  </span>
                )}
                <div
                  className="leaderboard-avatar"
                  style={{ background: getAvatarColor(player.name) }}
                >
                  {getInitials(player.name)}
                </div>
                <div className="leaderboard-info">
                  <span className="leaderboard-name">
                    {player.name}
                    {player.isHost && (
                      <Crown
                        size={13}
                        className="leaderboard-icon leaderboard-icon-host"
                      />
                    )}
                    {isDrawer && (
                      <Pencil
                        size={13}
                        className="leaderboard-icon leaderboard-icon-drawer"
                      />
                    )}
                    {hasGuessed && (
                      <Check
                        size={13}
                        className="leaderboard-icon leaderboard-icon-correct"
                      />
                    )}
                  </span>
                  {player.guessedCorrectly && !hasGuessed && (
                    <span className="leaderboard-guessed">Guessed!</span>
                  )}
                </div>
                <span className="leaderboard-score">{player.score}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default Leaderboard
