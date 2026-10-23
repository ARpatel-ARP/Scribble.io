import { getRoom } from "../game/roomManager.js";

const activeStrokes = new Map();

function registerDrawingHandlers(io, socket) {
  socket.on("draw_start", ({ roomCode, stroke } = {}) => {
    const code = roomCode?.trim().toUpperCase();
    const room = getRoom(code);

    if (!room || socket.data.roomCode !== code || !stroke) {
      return;
    }

    if (!activeStrokes.has(code)) {
      activeStrokes.set(code, new Map());
    }

    activeStrokes.get(code).set(socket.id, stroke);

    socket.to(code).emit("draw_start", {
      playerId: socket.id,
      stroke,
    });
  });

  socket.on("draw_move", ({ roomCode, stroke } = {}) => {
    const code = roomCode?.trim().toUpperCase();

    if (!getRoom(code) || socket.data.roomCode !== code || !stroke) {
      return;
    }

    if (!activeStrokes.has(code)) {
      activeStrokes.set(code, new Map());
    }

    activeStrokes.get(code).set(socket.id, stroke);

    socket.to(code).emit("draw_move", {
      playerId: socket.id,
      stroke,
    });
  });

  socket.on("draw_end", ({ roomCode, stroke } = {}) => {
    const code = roomCode?.trim().toUpperCase();
    const room = getRoom(code);

    if (!room || socket.data.roomCode !== code || !stroke) {
      return;
    }

    if (!room.drawingStrokes) {
      room.drawingStrokes = [];
    }

    room.drawingStrokes.push(stroke);

    const roomStrokes = activeStrokes.get(code);
    if (roomStrokes) {
      roomStrokes.delete(socket.id);
    }

    io.to(code).emit("draw_end", {
      playerId: socket.id,
      stroke,
    });
  });

  socket.on("canvas_clear", ({ roomCode } = {}) => {
    const code = roomCode?.trim().toUpperCase();
    const room = getRoom(code);

    if (!room || socket.data.roomCode !== code) {
      return;
    }

    room.drawingStrokes = [];
    activeStrokes.delete(code);

    io.to(code).emit("canvas_clear");
  });

  socket.on("draw_undo", ({ roomCode } = {}) => {
    const code = roomCode?.trim().toUpperCase();
    const room = getRoom(code);

    if (!room || socket.data.roomCode !== code) {
      return;
    }

    if (room.drawingStrokes?.length) {
      room.drawingStrokes.pop();
    }

    io.to(code).emit("draw_undo");
  });
}

export default registerDrawingHandlers;