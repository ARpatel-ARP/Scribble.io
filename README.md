# Scribble.io

A real-time multiplayer drawing and word-guessing game inspired by Skribbl.io. Players create or join a room, take turns drawing a secret word, guess other players' drawings through chat, and earn points for correct guesses.

The application is built with **React, Vite, Node.js, Express, and Socket.IO**. The frontend and backend are served together from a single Render Web Service.

> **Repository:** `ARpatel-ARP/Scribble.io`  
> **Production hosting:** Render  
> **Frontend and backend:** One service / one public origin

---

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Project structure](#project-structure)
- [How the application works](#how-the-application-works)
- [Getting started locally](#getting-started-locally)
- [Environment variables](#environment-variables)
- [Production deployment on Render](#production-deployment-on-render)
- [HTTP and Socket.IO](#http-and-socketio)
- [Gameplay guide](#gameplay-guide)
- [Important implementation notes](#important-implementation-notes)
- [Troubleshooting](#troubleshooting)

---

## Features

### Rooms and players

- Create a game room.
- Join an existing room using its room code.
- Six-character room codes are generated for rooms.
- Room settings include round count, drawing duration, maximum players, and number of word choices.
- Player lists update when players join or leave.
- The host role can transfer when the host disconnects or leaves.
- Disconnect handling allows a player a **30-second reconnection window** before removal.
- A room can be closed when its last player is removed.
- Room/game state is managed by the backend room manager.

### Drawing

- The selected drawer draws on an HTML canvas.
- Drawing input is sent to the server through Socket.IO so other players can see the drawing.
- Drawing handlers cover the drawing lifecycle, including starting, moving, and ending strokes.
- Canvas-related actions include clear and undo event handling where supported by the current client/server flow.
- Drawing is intended to be available to the active drawer while other players observe and guess.

### Guessing, chat, and rounds

- Players send chat messages and submit word guesses.
- The drawer receives word choices and selects a word for the round.
- A round timer controls drawing time.
- Correct guesses contribute to scoring.
- The game advances through configured rounds.
- Round results and scores are shown in the game results/leaderboard UI.
- A **Play Again** flow lets players start another game.

### Interface

- React component-based interface with separate Home, Lobby, Game, Canvas, Chat, and Leaderboard components.
- Component-specific CSS styles.
- Responsive layouts and a playful visual theme using cream, dark ink, coral, yellow, teal, and lavender accents.
- Lucide icons are used in the interface.

---

## Technology stack

| Technology | Where it is used | Purpose |
|---|---|---|
| React | `client/` | Builds the interactive user interface from reusable components. |
| Vite | `client/` | Runs the frontend development server and creates the production build. |
| JavaScript / JSX | Frontend and backend | Application logic and React components. |
| CSS | `client/src/components/` | Component styling, layout, responsive behavior, and visual theme. |
| Node.js | `server/` | Runs the backend JavaScript application. |
| Express | `server/` | HTTP server and API routes; serves the built frontend in production. |
| Socket.IO | Client and server | Real-time room events, player updates, drawing, chat, and game events. |
| `socket.io-client` | `client/` | Connects the React frontend to the Socket.IO server. |
| CORS | `server/` | Controls which browser origins may make cross-origin requests. |
| dotenv | `server/` | Loads local environment variables from the backend `.env` file. |
| Mongoose | `server/` dependencies | MongoDB object modelling, if/where database models are used. It does **not** mean live room state is automatically persisted. |
| lucide-react | `client/` | React icon components. |
| Render | Hosting | Runs the combined Node.js web service and serves the website from the same public URL. |
| Git and GitHub | Source control | Tracks project changes and supplies the repository used for deployment. |

---

## Project structure

The following is the principal application structure. Some supporting files, stylesheets, lockfiles, and configuration files are omitted from this overview.

```text
Scribble.io/
├── package.json                 # Root build/start scripts for one-service deployment
├── package-lock.json            # Root dependency lockfile, if generated
│
├── client/
│   ├── package.json             # React/Vite dependencies and scripts
│   ├── index.html
│   ├── vite.config.js           # Vite configuration
│   ├── public/                  # Public frontend assets, if present
│   ├── dist/                    # Generated production build (created by Vite)
│   └── src/
│       ├── main.jsx             # React entry point
│       ├── App.jsx              # Application-level component
│       ├── components/
│       │   ├── Home/
│       │   │   ├── Home.jsx
│       │   │   └── Home.css
│       │   ├── Lobby/
│       │   │   ├── Lobby.jsx
│       │   │   └── Lobby.css
│       │   ├── Game/
│       │   │   ├── Game.jsx
│       │   │   └── Game.css
│       │   ├── Canvas/
│       │   │   ├── Canvas.jsx
│       │   │   └── Canvas.css
│       │   ├── Chat/
│       │   │   ├── Chat.jsx
│       │   │   └── Chat.css
│       │   └── Leaderboard/
│       │       ├── Leaderboard.jsx
│       │       └── Leaderboard.css
│       ├── hooks/
│       │   └── useSocket.js     # Socket-related React hook(s)
│       └── socket/
│           └── socket.js        # Socket.IO client configuration, if used by the app
│
└── server/
    ├── package.json             # Backend dependencies and start/dev scripts
    ├── server.js                # HTTP server, Socket.IO setup, handler registration,
    │                            # connection/disconnection and reconnection timeout
    ├── app.js                   # Express setup, CORS, health route, static frontend hosting
    ├── .env                     # Local backend environment variables (do not commit secrets)
    ├── config/
    │   └── db.js                # Database connection configuration, if used
    ├── controllers/              # HTTP request controllers, if applicable
    ├── middleware/               # Express middleware, if applicable
    ├── models/                   # Mongoose models, if applicable
    ├── routes/                   # Express route modules, if applicable
    ├── game/
    │   └── roomManager.js        # In-memory room and player state management
    └── sockets/
        ├── roomHandler.js        # Room lifecycle and game/round events
        ├── drawingHandlers.js    # Drawing-related Socket.IO events
        └── chatHandler.js        # Chat and guess events
```

The tree is a navigational overview, not a guarantee that every optional folder contains a populated file. The `client/dist/` directory is generated by the build and generally should not be edited manually.

---

## How the application works

### 1. Starting the application

In development, Vite serves the React app and Node.js runs the Express/Socket.IO server separately.

In production, the root build script installs the frontend and backend dependencies and runs the Vite production build. Express serves the generated files from `client/dist`, while Socket.IO is attached to the same HTTP server.

### 2. Creating and joining a room

1. A player creates a room or enters an existing room code.
2. The frontend emits a Socket.IO event to the backend.
3. Room handlers validate the request and use `roomManager.js` to create or locate the room.
4. The socket joins the room.
5. The backend emits room/player updates so connected clients can update their UI.

### 3. Playing a round

1. The game selects the player who draws.
2. The drawer receives word choices and selects a secret word.
3. The drawer draws on the canvas.
4. Drawing events are relayed through Socket.IO to the other players in the room.
5. Other players submit guesses through chat.
6. Correct guesses affect scores according to the game's scoring logic.
7. The round ends when the timer or round-ending conditions are reached.
8. The game displays results and continues through the configured rounds.

### 4. Disconnect and reconnection handling

When a socket disconnects, `server.js` checks the player's room and schedules a **30-second timeout**. If the player reconnects and their player record is associated with a new socket ID before the timeout expires, the old timeout should not remove that player. Otherwise, the player is removed and the room is updated. Disconnecting the drawer can end the active round early.

### 5. Production request flow

```text
Browser
   |
   | HTTPS page request
   v
Render Web Service
   |
   +--> Express serves client/dist (React/Vite build)
   |
   +--> HTTP API routes, including /api/health
   |
   +--> Socket.IO on the same HTTP server
             |
             +--> Room handlers
             +--> Drawing handlers
             +--> Chat/guess handlers
             +--> In-memory room manager
```

---

## Getting started locally

### Prerequisites

- Node.js and npm installed.
- Git installed if cloning the repository.
- A terminal such as PowerShell.
- A MongoDB connection only if the code path you are running requires database access.

### Install and run the frontend

Open a terminal in the project root:

```powershell
cd client
npm install
npm run dev
```

Vite normally prints the local frontend URL, commonly `http://localhost:5173`.

### Install and run the backend

Open a **second** terminal in the project root:

```powershell
cd server
npm install
npm run dev
```

The backend's development script uses Nodemon. The default backend port is `5000` when `PORT` is not set.

### Build the frontend

From the project root, use the root build script:

```powershell
npm run build
```

This installs the backend and frontend dependencies using the configured root script and builds the Vite frontend. A successful Vite build creates `client/dist/index.html`.

### Run the combined production-style application locally

After building the frontend, start the backend:

```powershell
cd server
npm start
```

Open `http://localhost:5000`. Express serves the production frontend from `client/dist`.

Check the health endpoint at:

```text
http://localhost:5000/api/health
```

Expected response:

```json
{
  "success": true,
  "message": "Server is healthy"
}
```

For local development, run Vite and the backend separately. The production-style combined test is useful for checking the same serving arrangement used by Render.

---

## Environment variables

### Local backend: `server/.env`

The current local configuration has been:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
```

- `PORT` selects the local backend port. In production, Render supplies `PORT` automatically.
- `CLIENT_URL` is used by the Express and/or Socket.IO CORS configuration. Set it to the frontend origin that should be allowed.

### Frontend: `client/.env`

The frontend has used:

```env
VITE_SERVER_URL=https://scribble-io-hj8q.onrender.com
```

Vite exposes variables prefixed with `VITE_` to frontend code at build time. The client must actually read `import.meta.env.VITE_SERVER_URL` for this setting to affect its Socket.IO connection.

### Render environment variables

The combined Render Web Service is configured with the frontend/backend on one service. The deployed frontend's Socket.IO connection was fixed by adding `VITE_SERVER_URL` to the Render service's Environment page, with the deployed service URL:

```text
VITE_SERVER_URL=https://scribble-io-hj8q.onrender.com
```

Use the actual public URL shown by Render if the service URL changes.

If the application uses `CLIENT_URL` in production, set it to the deployed frontend origin, not `http://localhost:5173`.

**Important:**
- Vite environment variables are incorporated into the frontend during its build. Trigger a new deployment/build after changing them.
- Never commit database passwords, access tokens, or other secrets to GitHub.
- Do not manually set Render's `PORT` unless the platform specifically requires it; the server already uses `process.env.PORT || 5000`.
- Environment variable names must match the names referenced in the source code.

---

## Production deployment on Render

The frontend and backend are deployed together as **one Render Web Service**, not as two separate services.

### Render service settings

| Setting | Value |
|---|---|
| Service type | Web Service |
| Repository | `ARpatel-ARP/Scribble.io` |
| Branch | `main` |
| Root Directory | Repository root (leave blank/default) |
| Build Command | `npm run build` |
| Start Command | `npm start` |

These commands use the root `package.json`:

- `build`: installs dependencies in `server/` and `client/`, then runs the frontend production build.
- `start`: starts the backend using the server package's `npm start` script.

### Deployment procedure

1. Commit and push changes to the `main` branch.
2. In Render, open the combined web service.
3. Check that the root directory is the repository root.
4. Verify the build command is `npm run build` and the start command is `npm start`.
5. Set the required environment variables.
6. Deploy the latest commit and wait for a successful build/start.
7. Open the public Render URL.
8. Test a room with two separate browser sessions, including drawing, chat/guessing, rounds, and scoring.

### Deployment notes

- The Express server must use the Render-provided port; the current server code uses `process.env.PORT || 5000`.
- Express serves the frontend from `client/dist`.
- Socket.IO is attached to the same HTTP server as Express.
- The frontend must connect to the deployed server URL. A hardcoded `http://localhost:5000` will not work for visitors.
- CORS settings must match the actual deployment origins if cross-origin requests are made.

---

## HTTP and Socket.IO

### HTTP endpoints

| Endpoint | Purpose |
|---|---|
| `/` | Serves the production React frontend. |
| `/api/health` | Health check that returns JSON confirming the server is healthy. |

The `/` endpoint previously returned an API status object during development; it was changed to serve `client/dist/index.html` for the combined production deployment. The health check remains at `/api/health`.

### Socket.IO event responsibilities

The server registers separate handler modules when a client connects:

- **Room handler:** room creation/joining, player updates, game/round flow, and related room events.
- **Drawing handler:** drawing lifecycle and canvas-related events.
- **Chat handler:** chat and guessing events.
- **Room manager:** in-memory room and player state used by the socket handlers.

The server logs player connections and disconnections. On disconnect, it applies the 30-second reconnection grace period before removing a player.

---

## Gameplay guide

### Create a room

1. Open the website.
2. Choose the option to create a game.
3. Configure the available game settings.
4. Share the generated room code with other players.

### Join a room

1. Open the website in another browser or device.
2. Enter the room code supplied by the host.
3. Confirm that the player appears in the lobby.

### Play

1. Start the game when the lobby is ready.
2. If selected as the drawer, choose one of the offered words and draw it on the canvas without revealing the word.
3. If guessing, enter your guesses in chat.
4. Watch the timer and score updates.
5. Continue through the rounds and review the leaderboard/results.
6. Use **Play Again** to begin another game when available.

### Testing multiplayer

For a quick local or production check, open the game in two separate browser sessions (for example, a normal window and an incognito window). Create a room in one and join it from the other. Confirm both clients receive player updates and drawing/chat events.

---

## Important implementation notes

- **Room persistence:** The current `roomManager.js` manages room state in memory. Unless a persistence layer is explicitly implemented for this state, active rooms and games can be lost when the server restarts or redeploys.
- **MongoDB:** Mongoose is present in the backend dependencies, but a dependency alone does not mean room/game state is stored in MongoDB. Verify the actual model and database code before relying on persistent data.
- **Reconnects:** The 30-second grace period is in-memory and tied to the running server process. A server restart cannot preserve its timers or active room state.
- **Environment variables:** `client/.env` and `server/.env` are local configuration files. Render's Environment page configures the deployed service independently.
- **Production build:** `client/dist` is generated output. Make frontend source changes in `client/src`, then rebuild/redeploy.
- **Security:** Do not expose private secrets in frontend `VITE_` variables; Vite variables are bundled into browser-accessible code.
- **CORS:** Keep allowed origins aligned with your real local/deployed origins. Do not use localhost as the deployed frontend's backend address.
- **Hosting plan:** An instance that sleeps after inactivity can make the first connection take longer. Check the behavior and limits of the Render plan selected for the service.

---

## Troubleshooting

### The website loads, but Socket.IO fails

- Check that the frontend uses the deployed backend URL through the intended environment variable.
- Check that the variable is present in Render's Environment page.
- Trigger a fresh build/deployment after changing a Vite variable.
- Inspect browser DevTools and the Render service logs.
- Confirm the server's Socket.IO CORS configuration permits the origin when cross-origin requests are used.

### The page does not load after deployment

- Check the Render build logs for `npm run build` errors.
- Confirm `client/dist/index.html` exists after the build.
- Confirm the service root directory is the repository root.
- Confirm Express serves the `client/dist` directory.
- Check the start logs for server startup errors.

### `/api/health` does not respond

Check the Render logs and verify that the server started successfully. Locally, the health endpoint is available at `http://localhost:5000/api/health` when the combined backend is running on port 5000.

### Two players cannot see each other

- Confirm both players joined the same room code.
- Check the Socket.IO connection in the browser console.
- Check backend logs for connection and room events.
- Confirm the frontend is not attempting to connect to `localhost` from the deployed website.

---

## Scripts reference

### Root scripts

| Command | Purpose |
|---|---|
| `npm run build` | Installs client/server dependencies and builds the Vite frontend. |
| `npm start` | Starts the backend for the combined deployment. |

### Backend scripts (`server/package.json`)

| Command | Purpose |
|---|---|
| `npm run dev` | Runs `server.js` with Nodemon for development. |
| `npm start` | Runs `node server.js`. |

### Frontend scripts (`client/package.json`)

| Command | Purpose |
|---|---|
| `npm run dev` | Starts the Vite development server. |
| `npm run build` | Builds the frontend into `dist/`. |
| `npm run preview` | Previews the production build locally. |
| `npm run lint` | Runs ESLint checks. |

---

## Project summary

Scribble.io combines a React/Vite interface with an Express and Socket.IO backend to provide real-time multiplayer rooms, drawing, chat/guessing, timed rounds, and scoring. The current deployment uses one Render Web Service: the root build script produces the React build, Express serves it, and Socket.IO handles live game events on the same server.
