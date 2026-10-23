const rooms = new Map();

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

function createRoom(socketId, playerName) {
  const roomCode = generateRoomCode();

  const player = {
    id: socketId,
    name: playerName,
    score: 0,
    isHost: true,
    isReady: true,
  };

  const room = {
    code: roomCode,
    hostId: socketId,
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

  const playerExists = room.players.some(
    (player) => player.id === socketId
  );

  if (!playerExists) return null;

  room.players = room.players.filter(
    (player) => player.id !== socketId
  );

  if (room.players.length === 0) {
    rooms.delete(roomCode);
    return { room: null, deleted: true };
  }

  if (room.hostId === socketId) {
    const newHost = room.players[0];
    room.hostId = newHost.id;

    room.players = room.players.map((player) => ({
      ...player,
      isHost: player.id === newHost.id,
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