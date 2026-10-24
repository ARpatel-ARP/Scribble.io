import { getRoom } from "../game/roomManager.js";

const activeStrokes = new Map();

function registerDrawingHandlers(io, socket) {
  // START DRAWING
  socket.on("draw_start", ({ roomCode, stroke } = {}) => {
    const code = roomCode?.trim().toUpperCase();
    const room = getRoom(code);

    if (
      !room ||
      socket.data.roomCode !== code ||
      !stroke?.id ||
      !Array.isArray(stroke.points)
    ) {
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

  // UPDATE AN ACTIVE STROKE
  socket.on("draw_move", ({ roomCode, stroke } = {}) => {
    const code = roomCode?.trim().toUpperCase();
    const room = getRoom(code);

    if (
      !room ||
      socket.data.roomCode !== code ||
      !stroke?.id ||
      !Array.isArray(stroke.points)
    ) {
      return;
    }

    const roomStrokes = activeStrokes.get(code);
    const activeStroke = roomStrokes?.get(socket.id);

    // A player must start a stroke before updating it.
    // The ID must match the stroke they originally started.
    if (!activeStroke || activeStroke.id !== stroke.id) {
      return;
    }

    roomStrokes.set(socket.id, stroke);

    socket.to(code).emit("draw_move", {
      playerId: socket.id,
      stroke,
    });
  });

  // FINISH A STROKE
  socket.on("draw_end", ({ roomCode, stroke } = {}) => {
    const code = roomCode?.trim().toUpperCase();
    const room = getRoom(code);

    if (
      !room ||
      socket.data.roomCode !== code ||
      !stroke?.id ||
      !Array.isArray(stroke.points)
    ) {
      return;
    }

    const roomStrokes = activeStrokes.get(code);
    const activeStroke = roomStrokes?.get(socket.id);

    if (!activeStroke || activeStroke.id !== stroke.id) {
      return;
    }

    if (!Array.isArray(room.drawingStrokes)) {
      room.drawingStrokes = [];
    }

    // Store the completed stroke only once.
    const alreadyStored = room.drawingStrokes.some(
      (item) => item.id === stroke.id
    );

    if (!alreadyStored) {
      room.drawingStrokes.push(stroke);
    }

    roomStrokes.delete(socket.id);

    io.to(code).emit("draw_end", {
      playerId: socket.id,
      stroke,
    });
  });

  // UNDO THE MOST RECENT COMPLETED STROKE
  socket.on("draw_undo", ({ roomCode } = {}) => {
    const code = roomCode?.trim().toUpperCase();
    const room = getRoom(code);

    if (!room || socket.data.roomCode !== code) {
      return;
    }

    if (!Array.isArray(room.drawingStrokes)) {
      room.drawingStrokes = [];
    }

    const removedStroke = room.drawingStrokes.pop();

    if (!removedStroke) {
      return;
    }

    io.to(code).emit("draw_undo", {
      strokeId: removedStroke.id,
    });
  });

  // CLEAR THE ENTIRE CANVAS
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

  // CLEAN UP WHEN A PLAYER DISCONNECTS
  socket.on("disconnect", () => {
    for (const [code, roomStrokes] of activeStrokes.entries()) {
      roomStrokes.delete(socket.id);

      if (roomStrokes.size === 0) {
        activeStrokes.delete(code);
      }
    }
  });
}

export default registerDrawingHandlers;