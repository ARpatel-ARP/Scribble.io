import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import './Chat.css'

function Chat({
  messages = [],
  onSendMessage,
  disabled = false,
  loading = false,
  placeholder = 'Type your guess...',
  currentUserId = null,
}) {
  const [text, setText] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || disabled || loading) return
    onSendMessage(trimmed)
    setText('')
  }

  const getMsgClass = (msg) => {
    switch (msg.type) {
      case 'correct':
        return 'chat-msg chat-msg-correct'
      case 'system':
        return 'chat-msg chat-msg-system'
      case 'incorrect':
        return 'chat-msg chat-msg-incorrect'
      default:
        return 'chat-msg chat-msg-general'
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <span className="chat-title">Chat & Guesses</span>
        <span className="chat-count">{messages.length} messages</span>
      </div>

      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">No messages yet. Start guessing!</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={getMsgClass(msg)}
              data-own={msg.userId === currentUserId ? 'true' : 'false'}
            >
              {msg.type !== 'system' && (
                <span className="chat-msg-author">{msg.playerName}:</span>
              )}
              <span className="chat-msg-text">{msg.text}</span>
              {msg.type === 'correct' && (
                <span className="chat-msg-badge">correct</span>
              )}
            </div>
          ))
        )}
      </div>

      <form className="chat-input-area" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || loading}
          aria-label="Chat message input"
          maxLength={100}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={disabled || loading || !text.trim()}
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}

export default Chat
