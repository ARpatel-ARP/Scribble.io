import { io } from "socket.io-client";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }

  return socket;
}

export function connectSocket() {
  const currentSocket = getSocket();

  if (!currentSocket.connected) {
    currentSocket.connect();
  }

  return currentSocket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export { SERVER_URL };