import {
  createRoom,
  getRoom,
  removePlayerFromRoom,
} from "../game/roomManager.js";

function getPublicPlayers(room) {
  return room.players.map((player) => ({
    id: player.id,
    name: player.name,
    score: player.score,
    isHost: player.isHost,
    isReady: player.isReady,
  }));
}

function registerRoomHandlers(io, socket) {
  // CREATE ROOM
  socket.on("create_room", ({ playerName } = {}) => {
    const name = playerName?.trim();

    if (!name || name.length > 20) {
      socket.emit("room_error", {
        message: "Enter a name between 1 and 20 characters.",
      });
      return;
    }

    if (socket.data.roomCode) {
      socket.emit("room_error", {
        message: "You are already in a room. Leave it first.",
      });
      return;
    }

    const room = createRoom(socket.id, name);

    socket.join(room.code);
    socket.data.roomCode = room.code;

    socket.emit("room_created", {
      room: {
        code: room.code,
        settings: room.settings,
      },
      player: room.players[0],
      players: getPublicPlayers(room),
      isHost: true,
    });

    io.to(room.code).emit("player_joined", {
      players: getPublicPlayers(room),
    });
  });

  // JOIN ROOM
  socket.on("join_room", ({ playerName, roomCode } = {}) => {
    const name = playerName?.trim();
    const code = roomCode?.trim().toUpperCase();

    if (!name || name.length > 20) {
      socket.emit("room_error", {
        message: "Enter a name between 1 and 20 characters.",
      });
      return;
    }

    if (!code) {
      socket.emit("room_error", {
        message: "Enter a room code.",
      });
      return;
    }

    if (socket.data.roomCode) {
      socket.emit("room_error", {
        message: "You are already in a room. Leave it first.",
      });
      return;
    }

    const room = getRoom(code);

    if (!room) {
      socket.emit("room_error", {
        message: "Room not found. Check the room code.",
      });
      return;
    }

    if (room.state !== "waiting") {
      socket.emit("room_error", {
        message: "This game has already started.",
      });
      return;
    }

    if (room.players.length >= room.settings.maxPlayers) {
      socket.emit("room_error", {
        message: "This room is full.",
      });
      return;
    }

    const player = {
      id: socket.id,
      name,
      score: 0,
      isHost: false,
      isReady: true,
    };

    room.players.push(player);

    socket.join(room.code);
    socket.data.roomCode = room.code;

    socket.emit("room_joined", {
      room: {
        code: room.code,
        settings: room.settings,
      },
      player,
      players: getPublicPlayers(room),
      isHost: false,
    });

    io.to(room.code).emit("player_joined", {
      players: getPublicPlayers(room),
    });
  });

  // LEAVE ROOM
  socket.on("leave_room", ({ roomCode } = {}) => {
    const code = roomCode?.trim().toUpperCase();

    if (!code || socket.data.roomCode !== code) {
      socket.emit("room_error", {
        message: "You are not a member of this room.",
      });
      return;
    }

    const result = removePlayerFromRoom(code, socket.id);

    socket.leave(code);
    socket.data.roomCode = null;

    if (!result) {
      socket.emit("room_left", { roomCode: code });
      return;
    }

    if (result.deleted) {
      io.to(code).emit("room_deleted", {
        message: "The room has been closed.",
      });
    } else {
      io.to(code).emit("player_left", {
        players: getPublicPlayers(result.room),
        hostId: result.room.hostId,
      });
    }

    socket.emit("room_left", {
      roomCode: code,
    });
  });
}

export default registerRoomHandlers;