import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import registerRoomHandlers from "./sockets/roomHandler.js";
import { removePlayerFromRoom } from "./game/roomManager.js";
import registerDrawingHandlers from "./sockets/drawingHandlers.js";

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

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);

    const roomCode = socket.data.roomCode;

    if (!roomCode) {
      return;
    }

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

    const publicPlayers = result.room.players.map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      isHost: player.isHost,
      isReady: player.isReady,
    }));

    io.to(roomCode).emit("player_left", {
      players: publicPlayers,
      hostId: result.room.hostId,
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Scribble server running on port ${PORT}`);
});