import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import registerRoomHandlers, { endRoundEarly } from "./sockets/roomHandler.js";
import { getRoom, 
  removePlayerFromRoom } from "./game/roomManager.js";
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

if (!roomCode) {
return;
}

// Get the room before removing the player.
const existingRoom = getRoom(roomCode);

if (!existingRoom) {
return;
}

// Check whether the disconnected player is the active drawer.
const wasDrawer =
existingRoom.state === "drawing" &&
existingRoom.drawerId === socket.id;

const result = removePlayerFromRoom(roomCode, socket.id);

if (!result) {
return;
}

if (result.deleted) {
io.to(roomCode).emit("room_deleted", {
message: "The room has been closed.",
});

return;

}

const room = result.room;

const publicPlayers = room.players.map((player) => ({
id: player.id,
name: player.name,
score: player.score,
isHost: player.isHost,
isReady: player.isReady,
}));

io.to(roomCode).emit("player_left", {
players: publicPlayers,
hostId: room.hostId,
});

// Only check round-ending conditions during an active drawing round.
if (room.state === "drawing") {
const eligibleGuessers = room.players.filter(
(player) => player.id !== room.drawerId
);


const remainingGuessers = eligibleGuessers.filter(
  (player) =>
    !(room.correctGuessers || []).includes(player.id)
);

if (wasDrawer) {
  endRoundEarly(io, room, "The drawer disconnected!");
} else if (remainingGuessers.length === 0) {
  endRoundEarly(
    io,
    room,
    "No players left to guess the word!"
  );
}

}
});

});

httpServer.listen(PORT, () => {
  console.log(`Scribble server running on port ${PORT}`);
});