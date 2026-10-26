import {
  createRoom,
  getRoom,
  removePlayerFromRoom,
  reconnectPlayer,
  clearDisconnectTimer,
} from "../game/roomManager.js";
import { randomUUID } from "crypto";

function getPublicPlayers(room) {
  return room.players.map((player) => ({
    id: player.id,
    playerId: player.playerId,
    name: player.name,
    score: player.score,
    isHost: player.isHost,
    isReady: player.isReady,
  }));
}

function startWordSelectionTimer(io, room) {
  // Cancel any previous word-selection timer.
  if (room.wordSelectionTimer) {
    clearTimeout(room.wordSelectionTimer);
  }

  // Give the drawer 10 seconds to choose a word.
  room.wordSelectionTimer = setTimeout(() => {
    const currentRoom = getRoom(room.code);

    // Stop if the room no longer exists or selection has ended.
    if (
      !currentRoom ||
      currentRoom.state !== "selecting" ||
      !currentRoom.wordChoices?.length
    ) {
      return;
    }

    // Automatically select one of the available words.
    const randomIndex = Math.floor(
      Math.random() * currentRoom.wordChoices.length
    );

    const word = currentRoom.wordChoices[randomIndex];

    currentRoom.word = word;
    currentRoom.wordChoices = [];
    currentRoom.wordSelectionTimer = null;
    currentRoom.state = "drawing";

    currentRoom.wordHint = currentRoom.word
      .split("")
      .map((char) => (char === " " ? " " : "_"))
      .join(" ");

    // Send the word only to the drawer.
    io.to(currentRoom.drawerId).emit("word_selected", { word });

    // Start the shared drawing countdown.
    startRoundTimer(io, currentRoom);

    console.log(
      `Word selection timed out in room ${currentRoom.code}. Automatically selected: ${word}`
    );
  }, 10000);
}

// TIMER Start 
function startRoundTimer(io, room) {
  if (room.timer) {
    clearInterval(room.timer);
  }

  room.timeLeft = Number(room.settings.drawTime) || 60;

  io.to(room.code).emit("game_state", {
    state: "drawing",
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    timeLeft: room.timeLeft,
    drawerId: room.drawerId,
    players: getPublicPlayers(room),
  });

  room.timer = setInterval(() => {
    room.timeLeft -= 1;


    console.log("[HINT DEBUG]", {
      room: room.code,
      state: room.state,
      word: room.word,
      timeLeft: room.timeLeft,
      drawTime: room.settings.drawTime,
    });

    // Reveal more letters as the round progresses.
    // Reveal more letters as the round progresses.
    const drawTime = Number(room.settings.drawTime) || 60;
    const elapsed = drawTime - room.timeLeft;

    const hintTimes = [
      Math.floor(drawTime * 0.25),
      Math.floor(drawTime * 0.5),
      Math.floor(drawTime * 0.75),
    ];

    const hintStage = hintTimes.indexOf(elapsed);

    if (hintStage !== -1 && room.word) {
      const revealedCount = hintStage + 1;
      const word = room.word;

      room.wordHint = word
        .split("")
        .map((char, index) => {
          if (char === " ") return " ";
          if (index < revealedCount) return char;
          return "_";
        })
        .join(" ");

      console.log("[HINT UPDATE]", {
        room: room.code,
        drawerId: room.drawerId,
        elapsed,
        wordHint: room.wordHint,
      });

      io.to(room.code)
        .except(room.drawerId)
        .emit("word_hint_updated", {
          wordHint: room.wordHint,
        });
    }


    // Warn all players when 10 seconds remain.
    if (room.timeLeft === 10) {
      io.to(room.code).emit("timer_warning", {
        timeLeft: 10,
        message: "Only 10 seconds left!",
      });
    }

    io.to(room.code).emit("game_state", {
      state: room.state,
      currentRound: room.currentRound,
      totalRounds: room.totalRounds,
      timeLeft: room.timeLeft,
      drawerId: room.drawerId,
      players: getPublicPlayers(room),
    });

    if (room.timeLeft <= 0) {
      clearInterval(room.timer);
      room.timer = null;
      room.state = "round_end";

      io.to(room.code).emit("round_end", {
        currentRound: room.currentRound,
        totalRounds: room.totalRounds,
        message: "Time is up!",
        word: room.word
      });

      // Allow the round-end event to be displayed before advancing.
      setTimeout(() => {
        const currentRoom = getRoom(room.code);

        // The room might have been deleted or the game changed.
        if (!currentRoom || currentRoom.state !== "round_end") {
          return;
        }

        startNextRound(io, currentRoom);
      }, 5000);
    }
  }, 1000);
}

// Automatic next round starts after timer reaches 0
function startNextRound(io, room) {

  if (!room || room.state === "game_over") return;

  // End the game if fewer than two players remain.
  if (room.players.length < 2) {
    endGame(
      io,
      room,
      "Game over! Not enough players remain to continue."
    );
    return;
  }
  // Stop if all rounds have finished.
  if (room.currentRound >= room.totalRounds) {
    room.state = "finished";

    io.to(room.code).emit("game_over", {
      message: "Game over!",
      players: getPublicPlayers(room),
    });

    return;
  }

  // Move to the next round.
  room.currentRound += 1;

  // Rotate the drawer to the next player.
  const currentDrawerIndex = room.players.findIndex(
    (player) => player.id === room.drawerId
  );

  const nextDrawerIndex =
    (currentDrawerIndex + 1) % room.players.length;

  const nextDrawer = room.players[nextDrawerIndex];

  room.drawerId = nextDrawer.id;
  room.correctGuessers = [];
  room.state = "selecting";
  room.timeLeft = 0;
  room.word = null;

  // Generate fresh word choices.
  const wordPool = [
    "Apple",
    "Rocket",
    "Elephant",
    "Guitar",
    "Rainbow",
    "Castle",
    "Pizza",
    "Butterfly",
    "Airplane",
    "Sunflower",
    "Turtle",
    "Volcano",
    "Dolphin",
    "Camera",
    "Mountain",
  ];

  const shuffledWords = [...wordPool];

  for (let i = shuffledWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffledWords[i], shuffledWords[j]] = [
      shuffledWords[j],
      shuffledWords[i],
    ];
  }

  const choiceCount = Math.min(
    room.settings.wordChoices || 3,
    shuffledWords.length
  );

  room.wordChoices = shuffledWords.slice(0, choiceCount);

  // Notify everyone about the next round.
  io.to(room.code).emit("round_start", {
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    drawerId: room.drawerId,
  });

  io.to(room.code).emit("game_state", {
    state: "selecting",
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    timeLeft: 0,
    drawerId: room.drawerId,
    players: getPublicPlayers(room),
  });

  // Send choices only to the next drawer.
  io.to(nextDrawer.id).emit("word_choices", {
    wordChoices: room.wordChoices,
  });

  startWordSelectionTimer(io, room);

  console.log(
    `Round ${room.currentRound} started in room ${room.code}. Drawer: ${nextDrawer.name}`
  );
}

export function endRoundEarly(io, room, message) {
  if (!room || room.state !== "drawing") return;

  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }

  room.state = "round_end";

  io.to(room.code).emit("round_end", {
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    message,
    players: getPublicPlayers(room),
  });

  setTimeout(() => {
    const currentRoom = getRoom(room.code);

    if (!currentRoom || currentRoom.state !== "round_end") {
      return;
    }

    startNextRound(io, currentRoom);
  }, 3000);

}

function endGame(io, room, message) {
  if (!room) return;

  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }

  room.state = "game_over";

  io.to(room.code).emit("game_over", {
    message,
    players: getPublicPlayers(room),
  });
}




function registerRoomHandlers(io, socket) {

  socket.on("reconnect_room", ({ roomCode, playerId } = {}) => {
    const code = roomCode?.trim().toUpperCase();

    if (!code || !playerId) {
      socket.emit("room_error", {
        message: "Missing room or player information.",
      });
      return;
    }

    const room = getRoom(code);

    if (!room) {
      socket.emit("room_error", {
        message: "Room no longer exists.",
      });
      return;
    }

    const player = room.players.find((p) => p.playerId === playerId);

    if (!player) {
      socket.emit("room_error", {
        message: "Your previous player session was not found.",
      });
      return;
    }
    clearDisconnectTimer(playerId);

    const oldPlayerId = player.id;
    const restoredRoom = reconnectPlayer(code, playerId, socket.id);

    if (!restoredRoom) return;

    socket.join(code);
    socket.data.roomCode = code;

    socket.emit("room_joined", {
      room: {
        code,
        settings: restoredRoom.settings,
      },
      player: {
        ...player,
        id: socket.id,
      },
      players: getPublicPlayers(restoredRoom),
      isHost: restoredRoom.hostId === socket.id,
      gameState: {
        state: restoredRoom.state,
        currentRound: restoredRoom.currentRound,
        totalRounds: restoredRoom.totalRounds,
        drawerId: restoredRoom.drawerId,
        timeLeft: restoredRoom.timeLeft,
        wordHint: restoredRoom.wordHint,
      },
    });

    io.to(code).emit("player_joined", {
      players: getPublicPlayers(restoredRoom),
    });

    if (restoredRoom.state === "drawing") {
      socket.emit("game_state", {
        state: restoredRoom.state,
        currentRound: restoredRoom.currentRound,
        totalRounds: restoredRoom.totalRounds,
        drawerId: restoredRoom.drawerId,
        timeLeft: restoredRoom.timeLeft,
        wordHint: restoredRoom.wordHint,
        players: getPublicPlayers(restoredRoom),
      });

      // Restore the actual word privately if this player is the drawer.
      if (restoredRoom.drawerId === socket.id && restoredRoom.word) {
        socket.emit("word_selected", {
          word: restoredRoom.word,
        });
      }
    } else if (restoredRoom.state === "round_end") {
      socket.emit("game_state", {
        state: restoredRoom.state,
        currentRound: restoredRoom.currentRound,
        totalRounds: restoredRoom.totalRounds,
      });
    } else if (restoredRoom.state === "selecting") {
      if (restoredRoom.drawerId === socket.id) {
        socket.emit("word_choices", {
          wordChoices: restoredRoom.wordChoices || [],
        });
      }
    }
  });

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

  socket.on("update_settings", ({ roomCode, settings } = {}) => {
    const code = roomCode?.trim().toUpperCase();

    if (!code || socket.data.roomCode !== code) {
      socket.emit("room_error", {
        message: "You are not a member of this room.",
      });
      return;
    }

    const room = getRoom(code);

    if (!room) {
      socket.emit("room_error", {
        message: "Room not found.",
      });
      return;
    }

    if (room.hostId !== socket.id) {
      socket.emit("room_error", {
        message: "Only the host can change settings.",
      });
      return;
    }

    if (room.state !== "waiting") {
      socket.emit("room_error", {
        message: "Settings cannot be changed after the game starts.",
      });
      return;
    }

    const allowedSettings = {
      rounds: [1, 2, 3, 5, 8],
      drawTime: [30, 45, 60, 90, 120],
      maxPlayers: [4, 6, 8, 10, 12],
      wordChoices: [2, 3, 4, 5],
    };


    const updatedSettings = { ...room.settings };

    for (const key of Object.keys(allowedSettings)) {
      if (settings?.[key] === undefined) continue;

      const value = Number(settings[key]);

      if (!allowedSettings[key].includes(value)) {
        socket.emit("room_error", {
          message: `Invalid value for ${key}.`,
        });
        return;
      }

      if (key === "maxPlayers" && value < room.players.length) {
        socket.emit("room_error", {
          message: "Maximum players cannot be less than the current player count.",
        });
        return;
      }

      updatedSettings[key] = value;
    }

    room.settings = updatedSettings;

    io.to(code).emit("settings_updated", {
      settings: room.settings,
    });

    console.log(`Settings updated in room ${code}:`, room.settings);
  });

  // JOIN ROOM

 socket.on("join_room", ({ playerName, roomCode, playerId } = {}) => {
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

if (room.state === "game_over") {
socket.emit("room_error", {
message: "This game has ended. Create a new room.",
});
return;
}

// Check whether this is a returning player.
const existingPlayer = playerId
? room.players.find((p) => p.playerId === playerId)
: null;

let player;
let isReturningPlayer = false;

if (existingPlayer) {
// Restore the existing player instead of creating a duplicate.
clearDisconnectTimer(existingPlayer.playerId);


const restoredRoom = reconnectPlayer(
  code,
  existingPlayer.playerId,
  socket.id
);

if (!restoredRoom) {
  socket.emit("room_error", {
    message: "Could not restore your previous session.",
  });
  return;
}

player = restoredRoom.players.find(
  (p) => p.playerId === existingPlayer.playerId
);

isReturningPlayer = true;


} else {
if (room.players.length >= room.settings.maxPlayers) {
socket.emit("room_error", {
message: "This room is full.",
});
return;
}


player = {
  id: socket.id,
  playerId: randomUUID(),
  name,
  score: 0,
  isHost: false,
  isReady: true,
};

room.players.push(player);


}

socket.join(code);
socket.data.roomCode = code;

socket.emit("room_joined", {
room: {
code: room.code,
settings: room.settings,
},
player,
players: getPublicPlayers(room),
isHost: room.hostId === socket.id,
gameState: {
state: room.state,
currentRound: room.currentRound,
totalRounds: room.totalRounds,
drawerId: room.drawerId,
timeLeft: room.timeLeft,
wordHint: room.wordHint,
},
});

io.to(room.code).emit(
isReturningPlayer ? "player_joined" : "player_joined",
{
players: getPublicPlayers(room),
}
);

// Restore the returning player's current game stage.
if (room.state === "drawing") {
socket.emit("game_state", {
state: room.state,
currentRound: room.currentRound,
totalRounds: room.totalRounds,
drawerId: room.drawerId,
timeLeft: room.timeLeft,
wordHint: room.wordHint,
players: getPublicPlayers(room),
});

if (room.drawerId === socket.id && room.word) {
  socket.emit("word_selected", {
    word: room.word,
  });
}

} else if (room.state === "round_end") {
socket.emit("game_state", {
state: room.state,
currentRound: room.currentRound,
totalRounds: room.totalRounds,
});
} else if (room.state === "selecting") {
if (room.drawerId === socket.id) {
socket.emit("word_choices", {
wordChoices: room.wordChoices || [],
});
}
}
});



  socket.on("play_again", ({ roomCode } = {}) => {
    console.log("[PLAY AGAIN] Event received:", roomCode);
    console.log("[PLAY AGAIN] Socket ID:", socket.id);
    const code = roomCode?.trim().toUpperCase();

    const room = getRoom(code);
    console.log("[PLAY AGAIN] Current room state:", room.state);
    console.log("[PLAY AGAIN] Host ID:", room.hostId);
    console.log("[PLAY AGAIN] Requesting socket ID:", socket.id);
    if (!code || socket.data.roomCode !== code) {
      socket.emit("room_error", {
        message: "You are not a member of this room.",
      });
      return;
    }


    if (!room) {
      socket.emit("room_error", {
        message: "Room not found.",
      });
      return;
    }

    if (room.hostId !== socket.id) {
      socket.emit("room_error", {
        message: "Only the host can restart the game.",
      });
      return;
    }

    if (room.state !== "game_over" && room.state !== "finished") {
      socket.emit("room_error", {
        message: "The current game has not ended yet.",
      });
      return;
    }

    // Clear any remaining timer.
    if (room.timer) {
      clearInterval(room.timer);
      room.timer = null;
    }

    // Reset game-specific state but preserve the room and its players.
    room.state = "waiting";
    room.currentRound = 0;
    room.totalRounds = room.settings.rounds;
    room.drawerId = null;
    room.timeLeft = 0;
    room.word = null;
    room.wordHint = "";
    room.wordChoices = [];
    room.correctGuessers = [];

    // Reset scores for the new game.
    room.players.forEach((player) => {
      player.score = 0;
      player.isReady = true;
    });

    io.to(code).emit("play_again", {
      room: {
        code: room.code,
        settings: room.settings,
      },
      players: getPublicPlayers(room),
      gameState: "waiting",
    });

    console.log(`Game reset in room ${code}.`);
  });



  // START GAME
  socket.on("start_game", ({ roomCode } = {}) => {
    const code = roomCode?.trim().toUpperCase();

    // Verify room membership
    if (!code || socket.data.roomCode !== code) {
      socket.emit("room_error", {
        message: "You are not a member of this room.",
      });
      return;
    }

    const room = getRoom(code);

    if (!room) {
      socket.emit("room_error", {
        message: "Room not found.",
      });
      return;
    }

    // Only the host can start the game
    if (room.hostId !== socket.id) {
      socket.emit("room_error", {
        message: "Only the host can start the game.",
      });
      return;
    }

    // Prevent starting an already-running game
    if (room.state !== "waiting") {
      socket.emit("room_error", {
        message: "The game has already started.",
      });
      return;
    }

    // Require at least two players
    if (room.players.length < 2) {
      socket.emit("room_error", {
        message: "At least two players are required to start.",
      });
      return;
    }

    // Initialize the first round
    room.state = "selecting";
    room.currentRound = 1;
    room.totalRounds = room.settings.rounds;

    // Select the first player as the drawer
    const firstDrawer = room.players[0];
    room.drawerId = firstDrawer.id;
    room.correctGuessers = [];

    // Available words
    const wordPool = [
      "Apple",
      "Rocket",
      "Elephant",
      "Guitar",
      "Rainbow",
      "Castle",
      "Pizza",
      "Butterfly",
      "Airplane",
      "Sunflower",
      "Turtle",
      "Volcano",
      "Dolphin",
      "Camera",
      "Mountain",
    ];

    // Shuffle the word pool
    const shuffledWords = [...wordPool];

    for (let i = shuffledWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [shuffledWords[i], shuffledWords[j]] = [
        shuffledWords[j],
        shuffledWords[i],
      ];
    }

    // Generate word choices based on room settings
    const choiceCount = Math.min(
      room.settings.wordChoices || 3,
      shuffledWords.length
    );

    room.wordChoices = shuffledWords.slice(0, choiceCount);

    // Notify everyone that word selection has started
    io.to(code).emit("start_game", {
      gameState: "selecting",
      currentRound: room.currentRound,
      totalRounds: room.totalRounds,
      drawerId: room.drawerId,
    });

    // Send word choices only to the selected drawer
    io.to(firstDrawer.id).emit("word_choices", {
      wordChoices: room.wordChoices,
    });

    // Start the 10-second word-selection window.
    startWordSelectionTimer(io, room);
    console.log(
      `Game started in room ${code}. Drawer: ${firstDrawer.name}`
    );
  });

  // WORD CHOSEN
  socket.on("word_chosen", ({ roomCode, word } = {}) => {
    const code = roomCode?.trim().toUpperCase();
    const room = code ? getRoom(code) : null;

    if (!room || socket.data.roomCode !== code) {
      socket.emit("room_error", {
        message: "You are not in this room.",
      });
      return;
    }

    if (room.state !== "selecting" || room.drawerId !== socket.id) {
      socket.emit("room_error", {
        message: "You cannot select a word right now.",
      });
      return;
    }

    if (!room.wordChoices?.includes(word)) {
      socket.emit("room_error", {
        message: "Invalid word selection.",
      });
      return;
    }
    if (room.wordSelectionTimer) {
      clearTimeout(room.wordSelectionTimer);
      room.wordSelectionTimer = null;
    }

    room.word = word;
    room.wordChoices = [];
    room.state = "drawing";

    // Initialize a hidden hint for guessing players.
    room.wordHint = word
      .split("")
      .map((char) => (char === " " ? " " : "_"))
      .join(" ");

    // Send the actual word only to the drawer.
    socket.emit("word_selected", { word });

    // Start the shared countdown.
    startRoundTimer(io, room);

    console.log(`Drawing started in room ${code}.`);
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
      socket.emit("room_left", {
        roomCode: code,
      });
      return;
    }

    if (result.room && result.room.state === "drawing") {
      const room = result.room;

      const eligibleGuessers = room.players.filter(
        (player) => player.id !== room.drawerId
      );

      const remainingGuessers = eligibleGuessers.filter(
        (player) =>
          !(room.correctGuessers || []).includes(player.id)
      );

      const wasDrawer =
        room.state === "drawing" &&
        room.drawerId === socket.id;

      if (wasDrawer) {
        endRoundEarly(io, room, "The drawer left the game!");
      } else if (remainingGuessers.length === 0) {
        endRoundEarly(
          io,
          room,
          "No players left to guess the word!"
        );
      }
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