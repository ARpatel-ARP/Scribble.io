import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import registerRoomHandlers, { endRoundEarly } from "./sockets/roomHandler.js";
import {
  getRoom,
  removePlayerFromRoom,
  setDisconnectTimer,
  clearDisconnectTimer,
} from "./game/roomManager.js";
import registerDrawingHandlers from "./sockets/drawingHandlers.js";
import registerChatHandlers from "./sockets/chatHandler.js";

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  registerRoomHandlers(io, socket);
  registerDrawingHandlers(io, socket);
  registerChatHandlers(io, socket);

 socket.on("disconnect", () => {
console.log(`Player disconnected: ${socket.id}`);

const roomCode = socket.data.roomCode;

if (!roomCode) return;

const room = getRoom(roomCode);

if (!room) return;

const disconnectedPlayer = room.players.find(
(player) => player.id === socket.id
);

if (!disconnectedPlayer) return;

const { playerId } = disconnectedPlayer;

console.log(
`Waiting 30 seconds for player ${disconnectedPlayer.name} to reconnect.`
);

const timer = setTimeout(() => {
const currentRoom = getRoom(roomCode);


// The room might have been deleted while waiting.
if (!currentRoom) {
  clearDisconnectTimer(playerId);
  return;
}

// Only remove the player if they still belong to the old socket.
// A successful reconnect changes player.id to the new socket ID.
const stillDisconnected = currentRoom.players.find(
  (player) =>
    player.playerId === playerId &&
    player.id === socket.id
);

if (!stillDisconnected) {
  clearDisconnectTimer(playerId);
  return;
}

const wasDrawer =
  currentRoom.state === "drawing" &&
  currentRoom.drawerId === socket.id;

const result = removePlayerFromRoom(roomCode, socket.id);

if (!result) return;

console.log(
  `Player ${disconnectedPlayer.name} was removed after the reconnection timeout.`
);

if (result.deleted) {
  io.to(roomCode).emit("room_deleted", {
    message: "The room has been closed.",
  });

  return;
}

const updatedRoom = result.room;

const publicPlayers = updatedRoom.players.map((player) => ({
  id: player.id,
  playerId: player.playerId,
  name: player.name,
  score: player.score,
  isHost: player.isHost,
  isReady: player.isReady,
}));

io.to(roomCode).emit("player_left", {
  players: publicPlayers,
  hostId: updatedRoom.hostId,
});

if (updatedRoom.state === "drawing") {
  const eligibleGuessers = updatedRoom.players.filter(
    (player) => player.id !== updatedRoom.drawerId
  );

  const remainingGuessers = eligibleGuessers.filter(
    (player) =>
      !(updatedRoom.correctGuessers || []).includes(player.id)
  );

  if (wasDrawer) {
    endRoundEarly(io, updatedRoom, "The drawer disconnected!");
  } else if (remainingGuessers.length === 0) {
    endRoundEarly(
      io,
      updatedRoom,
      "No players left to guess the word!"
    );
  }
}


}, 30_000);

setDisconnectTimer(playerId, timer);
});


});

httpServer.listen(PORT, () => {
  console.log(`Scribble server running on port ${PORT}`);
});