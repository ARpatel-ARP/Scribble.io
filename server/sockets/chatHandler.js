import { getRoom } from "../game/roomManager.js";
import { endRoundEarly } from "./roomHandler.js";

function getPublicPlayers(room) {
    return room.players.map((player) => ({
        id: player.id,
        name: player.name,
        score: player.score,
        isHost: player.isHost,
        isReady: player.isReady,
    }));
}

function registerChatHandlers(io, socket) {
    socket.on("chat", ({ roomCode, message } = {}) => {
        const code = roomCode?.trim().toUpperCase();
        const text = typeof message === "string" ? message.trim() : "";

        if (!code || socket.data.roomCode !== code || !text) return;

        const room = getRoom(code);
        if (!room) return;

        const player = room.players.find((p) => p.id === socket.id);
        if (!player) return;

        if (room.state === "drawing" && player.id !== room.drawerId) {
            const normalize = (value) =>
                value.trim().toLowerCase().replace(/\s+/g, " ");

            if (normalize(text) === normalize(room.word || "")) {
                if (!room.correctGuessers) {
                    room.correctGuessers = [];
                }

                // A player who already guessed correctly cannot score again.
                if (room.correctGuessers.includes(player.id)) {
                    socket.emit("chat_message", {
                        id: `${Date.now()}-${socket.id}`,
                        type: "general",
                        text: "You have already guessed correctly this round.",
                        playerName: "Game",
                        userId: null,
                    });
                    return;
                }

                // Award points and record the correct guess.
                room.correctGuessers.push(player.id);

                // Award points based on the order of correct guesses.
                const guessOrder = room.correctGuessers.length;

                const guesserPoints = [100, 75, 50, 40];

                const points =
                    guesserPoints[guessOrder - 1] ?? 25;

                player.score += points;

                // Reward the drawer for each correct guess.
                const drawer = room.players.find(
                    (p) => p.id === room.drawerId
                );

                if (drawer) {
                    drawer.score += 25;
                }

                const eligibleGuessers = room.players.filter(
                    (p) => p.id !== room.drawerId
                );

                const allPlayersGuessed =
                    eligibleGuessers.length > 0 &&
                    eligibleGuessers.every((p) =>
                        room.correctGuessers.includes(p.id)
                    );

                // Notify everyone about the correct guess and updated scores.
                io.to(code).emit("correct_guess", {
                    playerId: player.id,
                    playerName: player.name,
                    drawerId: room.drawerId,
                    points,
                    message: `${player.name} guessed the word correctly and earned ${points} points!`,
                    players: getPublicPlayers(room),
                });

                // End the round immediately if everyone eligible has guessed.
                if (allPlayersGuessed) {
                    endRoundEarly(io, room, "Everyone guessed the word!");
                }

                return;
            }
        }

        // Broadcast ordinary chat messages and incorrect guesses.
        io.to(code).emit("chat_message", {
            id: `${Date.now()}-${socket.id}`,
            type: "general",
            text: text.slice(0, 100),
            playerName: player.name,
            userId: player.id,
        });
    });

}

export default registerChatHandlers;
