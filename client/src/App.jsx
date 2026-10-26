import { useState, useCallback, useRef, useEffect } from 'react'
import Home from './components/Home/Home.jsx'
import Lobby from './components/Lobby/Lobby.jsx'
import Game from './components/Game/Game.jsx'
import useSocket from './hooks/useSocket.js'

const VIEWS = {
  HOME: 'home',
  LOBBY: 'lobby',
  GAME: 'game',
}

// Sample preview data for disconnected / pre-connection state
const SAMPLE_PLAYERS = [
  { id: 'p1', name: 'Alex', score: 0, isHost: true, isReady: true },
  { id: 'p2', name: 'Jordan', score: 0, isReady: true },
  { id: 'p3', name: 'Marin', score: 0, isReady: false },
]

const SAMPLE_CHAT = [
  { id: 'c1', type: 'system', text: 'Waiting for the host to start the game...', playerName: '' },
  { id: 'c2', type: 'general', text: 'Hey everyone!', playerName: 'Alex', userId: 'p1' },
  { id: 'c3', type: 'general', text: 'Ready to draw!', playerName: 'Jordan', userId: 'p2' },
]

function App() {
  const [view, setView] = useState(VIEWS.HOME)
  const [playerName, setPlayerName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Room & game state (will be populated by socket events)
  const [room, setRoom] = useState({ code: '', settings: {} })
  const [player, setPlayer] = useState({ id: '', name: '', isHost: false })
  const [players, setPlayers] = useState([])
  const [isHost, setIsHost] = useState(false)

  // Game state
  const [gameState, setGameState] = useState('waiting')
  const [currentRound, setCurrentRound] = useState(0)
  const [totalRounds, setTotalRounds] = useState(3)
  const [timeLeft, setTimeLeft] = useState(0)
  const [timerWarning, setTimerWarning] = useState('');
  const [drawerId, setDrawerId] = useState(null)
  const [wordHint, setWordHint] = useState('')
  const [wordChoices, setWordChoices] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [remoteStrokes, setRemoteStrokes] = useState([])
  const [finalScores, setFinalScores] = useState(null)
  const [clearSignal, setClearSignal] = useState(0);

  const { socket, isConnected, emit, on, off, disconnect } = useSocket()
  const socketListenersSetup = useRef(false)


   const reconnectAttempted = useRef(false);
  const setupSocketListenersRef = useRef(null);
  

  // Set up socket event listeners once
  const setupSocketListeners = useCallback(() => {
    if (socketListenersSetup.current) return
    socketListenersSetup.current = true

   


    // Room events

    on('room_created', (data) => {
      setRoom(data.room)
      setPlayer(data.player)
      sessionStorage.setItem('scribble_room', data.room.code)
      sessionStorage.setItem('scribble_player', JSON.stringify(data.player))
      sessionStorage.setItem("scribble_original_player_id", data.player.playerId);
      setPlayers(data.players)
      setIsHost(data.isHost)
      setView(VIEWS.LOBBY)
      setError(null)
      setIsLoading(false)
    })

    on('play_again', (data) => {
      setRoom(data.room)
      setPlayers(data.players || [])
      setGameState('waiting')
      setCurrentRound(0)
      setTimeLeft(0)
      setDrawerId(null)
      setWordHint('')
      setWordChoices([])
      setFinalScores(null)
      setChatMessages([])
      setRemoteStrokes([])
      setClearSignal((previous) => previous + 1)
      setError(null)
      setView(VIEWS.LOBBY)
    })

    on('room_joined', (data) => {
      setRoom(data.room)
      setPlayer(data.player)
      sessionStorage.setItem('scribble_room', data.room.code)
      sessionStorage.setItem('scribble_player', JSON.stringify(data.player))
      sessionStorage.setItem("scribble_original_player_id", data.player.playerId);
      setPlayers(data.players)
      setIsHost(data.isHost)
      setError(null)
      setIsLoading(false)

      const gameState = data.gameState

      if (gameState && gameState.state !== 'waiting') {
        setGameState(gameState.state)

        if (gameState.currentRound != null) {
          setCurrentRound(gameState.currentRound)
        }

        if (gameState.totalRounds != null) {
          setTotalRounds(gameState.totalRounds)
        }

        setView(VIEWS.GAME)
      } else {
        setView(VIEWS.LOBBY)
      }
    })
    on('room_error', (data) => {
      setError(data.message)
      setIsLoading(false)
    })

    on('player_joined', (data) => {
      setPlayers(data.players || [])
    })

    on('player_left', (data) => {
      setPlayers(data.players || [])
    })

    on('start_game', (data) => {
      setView(VIEWS.GAME)
      setGameState(data.gameState || 'waiting')
      setCurrentRound(data.currentRound || 1)
      setTotalRounds(data.totalRounds || 3)
      setDrawerId(data.drawerId || null)
    })

    on("word_choices", ({ wordChoices = [] } = {}) => {
      console.log("Received word choices:", wordChoices);
      setWordChoices(wordChoices);
    });

    // Game events
    on('game_state', (data) => {
      setGameState(data.state || 'waiting')
      if (data.state === 'selecting') { setRemoteStrokes([]); setClearSignal((previous) => previous + 1); }
      if (data.currentRound !== undefined) setCurrentRound(data.currentRound)
      if (data.totalRounds !== undefined) setTotalRounds(data.totalRounds)
      if (data.timeLeft !== undefined) setTimeLeft(data.timeLeft)
      if (data.drawerId !== undefined) setDrawerId(data.drawerId)
      if (data.wordHint !== undefined) setWordHint(data.wordHint)
      if (data.wordChoices !== undefined) setWordChoices(data.wordChoices)
      if (data.players !== undefined) setPlayers(data.players)
      if (data.state === 'selecting' || data.state === 'drawing') { setTimerWarning(''); }
    })

    on('round_start', (data) => {
      setGameState('selecting')
      setCurrentRound(data.currentRound || currentRound)
      setDrawerId(data.drawerId || null)
      setWordChoices(data.wordChoices || [])
      setTimeLeft(data.timeLeft || 0)
      setRemoteStrokes([])
    })

    on('word_chosen', (data) => {
      setGameState('drawing')
      setWordChoices([])
      setWordHint(data.wordHint || '')
      setTimeLeft(data.timeLeft || 0)
    })

    on('word_hint_updated', (data) => {
      console.log('[FRONTEND HINT RECEIVED]', data)
      setWordHint(data.wordHint || '')
    })

    on('round_end', (data) => {
      console.log('ROUND END RECEIVED:', data);
      setGameState('round_end');
      setWordHint(data.word || '');

      // Clear the canvas and its stored strokes.
      setRemoteStrokes([]);
      setClearSignal((previous) => previous + 1);

      if (data.players) setPlayers(data.players);
    });


    on('game_over', (data) => {
      setGameState('game_over')
      setFinalScores(data.scores || data.players || [])
    })

    on("word_selected", (data) => {
      setWordHint(data.word);
    });

    // Drawing events
    const upsertRemoteStroke = (stroke, playerId) => {
      if (!stroke?.id || playerId === player.id) return;

      setRemoteStrokes((prev) => {
        const index = prev.findIndex((item) => item.id === stroke.id);

        if (index === -1) {
          return [...prev, { ...stroke, playerId }];
        }

        const updated = [...prev];
        updated[index] = { ...stroke, playerId };

        return updated;
      });
    };

    on("draw_start", ({ playerId, stroke } = {}) => {
      upsertRemoteStroke(stroke, playerId);
    });

    on("draw_move", ({ playerId, stroke } = {}) => {
      upsertRemoteStroke(stroke, playerId);
    });

    on("draw_end", ({ playerId, stroke } = {}) => {
      upsertRemoteStroke(stroke, playerId);
    });

    on("draw_data", (strokes) => {
      setRemoteStrokes(Array.isArray(strokes) ? strokes : []);
    });

    on("draw_undo", ({ strokeId } = {}) => {
      if (!strokeId) return;

      // Remove the stroke from the remote stroke collection.
      setRemoteStrokes((prev) =>
        prev.filter((stroke) => stroke.id !== strokeId)
      );

      // Tell every mounted DrawingCanvas to remove this exact stroke.
      window.dispatchEvent(
        new CustomEvent("scribble:draw-undo", {
          detail: { strokeId },
        })
      );
    });

    on("canvas_clear", () => {
      setRemoteStrokes([]);

      // Clear local and remote strokes
      window.dispatchEvent(new Event("scribble:canvas-clear"));
    });

    // timer warning
    on('timer_warning', (data) => {
      setTimerWarning(data.message || 'Only 10 seconds left!');
    });

    // Chat events
    on('chat_message', (msg) => {
      setChatMessages((prev) => {
        // Prevent duplicate messages.
        if (prev.some((existing) => existing.id === msg.id)) {
          return prev
        }

        return [...prev, msg]
      })
    })

    on('guess_result', (data) => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `gr-${Date.now()}`,
          type: data.correct ? 'correct' : 'incorrect',
          text: data.correct ? 'guessed the word!' : data.message || '',
          playerName: data.playerName || '',
          userId: data.userId || '',
        },
      ])
      if (data.players) setPlayers(data.players)
    })

    on("correct_guess", (data) => {
      setPlayers(data.players);

      setChatMessages((prev) => [
        ...prev,
        {
          id: `correct-${Date.now()}`,
          type: "correct",
          text: data.message,
          playerName: "Game",
          userId: null,
        },
      ]);
    });

  }, [on, currentRound])

  setupSocketListenersRef.current = setupSocketListeners;


  useEffect(() => {
    const navigation = performance.getEntriesByType("navigation")[0];

    // Automatic reconnection only after an actual browser refresh.
    // A newly opened tab must not reclaim another tab's player.
    if (navigation?.type !== "reload") return;

    if (reconnectAttempted.current) return;

    const savedRoom = sessionStorage.getItem("scribble_room");
    const savedPlayerId = sessionStorage.getItem(
      "scribble_original_player_id"
    );

    if (!savedRoom || !savedPlayerId) return;

    reconnectAttempted.current = true;

    setupSocketListenersRef.current?.();

    const tryReconnect = () => {
      emit("reconnect_room", {
        roomCode: savedRoom,
        playerId: savedPlayerId,
      });
    };

    if (socket.connected) {
      tryReconnect();
    } else {
      socket.once("connect", tryReconnect);
    }

    return () => {
      socket.off("connect", tryReconnect);
    };
  }, [socket, emit]);



  // HOME callbacks
  const handleCreateRoom = useCallback(
    (name) => {
      setIsLoading(true);
      setError(null);
      setupSocketListeners();
      emit('create_room', { playerName: name });
    },
    [emit, setupSocketListeners]
  );

  const handleJoinRoom = useCallback(
    (name, code) => {
      setIsLoading(true)
      setError(null)
      setupSocketListeners()

      emit('join_room', {
        playerName: name,
        roomCode: code,
      })
    },
    [emit, setupSocketListeners],
  )

  // LOBBY callbacks
  const handleStartGame = useCallback(() => {
    setIsLoading(true)
    emit('start_game', { roomCode: room.code })
    setIsLoading(false)
  }, [emit, room.code])

  const handleLeaveRoom = useCallback(() => {
    if (room.code) {
      emit('leave_room', { roomCode: room.code });
    }

    setView(VIEWS.HOME);
    setRoom({ code: '', settings: {} });
    setPlayers([]);
    setPlayer({ id: '', name: '', isHost: false });
    setIsHost(false);
    setError(null);
    setGameState('waiting');
    setCurrentRound(1);
    setTimeLeft(0);
    setDrawerId(null);
    setWordHint('');
    setWordChoices([]);
    setChatMessages([]);
    setRemoteStrokes([]);
    setFinalScores(null);
  }, [emit, room.code]);

  const handleReturnHome = useCallback(() => {
    disconnect()
    socketListenersSetup.current = false
    setView(VIEWS.HOME)
    setRoom({ code: '', settings: {} })
    setPlayers([])
    setPlayer({ id: '', name: '', isHost: false })
    setIsHost(false)
    setError(null)
    setGameState('waiting')
    setFinalScores(null)
    setChatMessages([])
    setRemoteStrokes([])
  }, [disconnect])

  const handleCopyCode = useCallback((code) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code)
    }
  }, [])

  const handleCopyInvite = useCallback((code) => {
    const url = `${window.location.origin}?room=${code}`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
    }
  }, [])


  const handleUpdateSettings = useCallback(
    (newSettings) => {
      // Update the UI immediately so the selected option highlights.
      setRoom((prev) => ({
        ...prev,
        settings: newSettings,
      }));

      // Send the updated settings to the server.
      emit('update_settings', {
        roomCode: room.code,
        settings: newSettings,
      });
    },
    [emit, room.code],
  )



  // GAME callbacks
  const handleWordChosen = useCallback(
    (word) => {
      emit('word_chosen', { roomCode: room.code, word })
      setWordChoices([])
      setGameState('drawing')
    },
    [emit, room.code],
  )

  const handleGuess = useCallback(
    (text) => {
      emit('guess', { roomCode: room.code, guess: text })
      // Also display locally immediately
      setChatMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          type: 'general',
          text,
          playerName: player.name,
          userId: player.id,
        },
      ])
    },
    [emit, room.code, player],
  )

  const handleChatMessage = useCallback((text) => { emit('chat', { roomCode: room.code, message: text, }) }, [emit, room.code],)

  // Drawing callbacks
  const handleStrokeStart = useCallback(
    (stroke) => {
      emit('draw_start', { roomCode: room.code, stroke })
    },
    [emit, room.code],
  )

  const handleStrokeMove = useCallback(
    (stroke) => {
      emit('draw_move', { roomCode: room.code, stroke })
    },
    [emit, room.code],
  )

  const handleStrokeEnd = useCallback(
    (stroke) => {
      emit('draw_end', { roomCode: room.code, stroke })
    },
    [emit, room.code],
  )

  const handleCanvasCleared = useCallback(() => {
    emit('canvas_clear', { roomCode: room.code })
  }, [emit, room.code])

  const handleUndo = useCallback(() => {
    emit('draw_undo', { roomCode: room.code })
  }, [emit, room.code])



  const handlePlayAgain = useCallback(() => {
    if (!isHost) {
      setError('Only the host can restart the game.')
      return
    }

    emit('play_again', { roomCode: room.code })
  }, [emit, isHost, room.code])




  // For preview when no socket connection, use sample data
  const lobbyPlayers =
    players.length > 0
      ? players
      : isHost
        ? [{ id: player.id, name: player.name, isHost: true, isReady: true }]
        : SAMPLE_PLAYERS

  const lobbyRoom =
    room.code || isHost
      ? { code: room.code || 'PENDING', settings: room.settings }
      : { code: 'DEMO', settings: { rounds: 3, drawTime: 60, maxPlayers: 8, wordChoices: 3 } }

  return (
    <>
      {view === VIEWS.HOME && (
        <Home
          playerName={playerName}
          setPlayerName={setPlayerName}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          isLoading={isLoading}
          error={error}
        />
      )}

      {view === VIEWS.LOBBY && (
        <Lobby
          room={lobbyRoom}
          player={player}
          players={lobbyPlayers}
          isHost={isHost}
          isConnected={isConnected}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
          onReturnHome={handleReturnHome}
          onCopyCode={handleCopyCode}
          onCopyInvite={handleCopyInvite}
          onUpdateSettings={handleUpdateSettings}
          isLoading={isLoading}
          error={error}
        />
      )}

      {view === VIEWS.GAME && (
        <Game
          room={room}
          player={player}
          players={players.length > 0 ? players : SAMPLE_PLAYERS}
          gameState={gameState}
          clearSignal={clearSignal}
          currentRound={currentRound}
          totalRounds={totalRounds}
          timeLeft={timeLeft}
          drawerId={drawerId}
          wordHint={wordHint}
          wordChoices={wordChoices}
          chatMessages={chatMessages.length > 0 ? chatMessages : SAMPLE_CHAT}
          remoteStrokes={remoteStrokes}
          isConnected={isConnected}
          onWordChosen={handleWordChosen}
          onGuess={handleGuess}
          onChatMessage={handleChatMessage}
          onStrokeStart={handleStrokeStart}
          onStrokeMove={handleStrokeMove}
          onStrokeEnd={handleStrokeEnd}
          onCanvasCleared={handleCanvasCleared}
          onUndo={handleUndo}
          onLeaveGame={handleLeaveRoom}
          onReturnHome={handleReturnHome}
          onPlayAgain={handlePlayAgain}
          finalScores={finalScores}
        />
      )}
    </>
  )
}

export default App
