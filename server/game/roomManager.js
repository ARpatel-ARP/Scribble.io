import { randomUUID } from "crypto";
const rooms = new Map();

const disconnectTimers = new Map();

export function setDisconnectTimer(playerId, timer) {
const existingTimer = disconnectTimers.get(playerId);

if (existingTimer) {
clearTimeout(existingTimer);
}

disconnectTimers.set(playerId, timer);
}

export function clearDisconnectTimer(playerId) {
const timer = disconnectTimers.get(playerId);

if (timer) {
clearTimeout(timer);
}

disconnectTimers.delete(playerId);
}


function generateRoomCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;

  do {
    code = "";

    for (let i = 0; i < 6; i++) {
      code += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
  } while (rooms.has(code));

  return code;
}

export function reconnectPlayer(roomCode, playerId, newSocketId) {
  const room = rooms.get(roomCode);
  if (!room) return null;

  // Find the player by their persistent identity.
  const player = room.players.find(
    (p) => p.playerId === playerId
  );

  if (!player) return null;

  const oldSocketId = player.id;

  // Replace the temporary socket ID.
  player.id = newSocketId;

  if (room.hostId === oldSocketId) {
    room.hostId = newSocketId;
  }

  if (room.drawerId === oldSocketId) {
    room.drawerId = newSocketId;
  }

  if (room.correctGuessers) {
    room.correctGuessers = room.correctGuessers.map(
      (id) => id === oldSocketId ? newSocketId : id
    );
  }

  return room;
}

function createRoom(socketId, playerName) {
  const roomCode = generateRoomCode();

  const player = {
  id: socketId,
  playerId: randomUUID(),
  name: playerName,
  score: 0,
  isHost: true,
  isReady: true,
};

  const room = {
    code: roomCode,
    hostId: socketId,
    wordSelectionTimer: null,
    players: [player],
    settings: {
      rounds: 3,
      drawTime: 60,
      maxPlayers: 8,
      wordChoices: 3,
    },
    state: "waiting",
  };

  rooms.set(roomCode, room);
  return room;
}

function getRoom(roomCode) {
  return rooms.get(roomCode);
}

function removePlayerFromRoom(roomCode, socketId) {
const room = rooms.get(roomCode);

if (!room) return null;

const player = room.players.find((p) => p.id === socketId);

if (!player) return null;

// Cancel any pending disconnect timer for this player.
clearDisconnectTimer(player.playerId);

room.players = room.players.filter((p) => p.id !== socketId);

if (room.players.length === 0) {
rooms.delete(roomCode);
return { room: null, deleted: true };
}

// Transfer host privileges if the host leaves permanently.
if (room.hostId === socketId) {
const newHost = room.players[0];

room.hostId = newHost.id;

room.players = room.players.map((p) => ({
  ...p,
  isHost: p.id === newHost.id,
}));

}

return { room, deleted: false };
}


export {
  rooms,
  createRoom,
  getRoom,
  removePlayerFromRoom,
};