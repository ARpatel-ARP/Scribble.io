import { useEffect, useState, useCallback } from 'react'
import { getSocket, disconnectSocket } from '../socket/socket'

export default function useSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)

  const socket = getSocket()

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true)
      setError(null)
    }

    const handleDisconnect = () => {
      setIsConnected(false)
    }

    const handleError = (err) => {
      setError(err instanceof Error ? err : new Error(String(err)))
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleError)

    setIsConnected(socket.connected)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleError)
    }
  }, [socket])

  const emit = useCallback(
    (event, data) => {
      socket.emit(event, data)
    },
    [socket],
  )

  const on = useCallback(
    (event, handler) => {
      socket.on(event, handler)
    },
    [socket],
  )

  const off = useCallback(
    (event, handler) => {
      socket.off(event, handler)
    },
    [socket],
  )

  const disconnect = useCallback(() => {
    disconnectSocket()
    setIsConnected(false)
  }, [])

  return { socket, isConnected, error, emit, on, off, disconnect }
}
