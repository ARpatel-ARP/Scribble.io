import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow requests from the frontend during local development.
app.use(
cors({
origin: process.env.CLIENT_URL || "http://localhost:5173",
})
);

app.use(express.json());

// Existing health-check endpoint.
app.get("/api/health", (req, res) => {
res.status(200).json({
success: true,
message: "Server is healthy",
});
});

// Serve the production React frontend.
// In deployment, the build is generated in ../client/dist.
const frontendPath = path.resolve(__dirname, "../client/dist");

app.use(express.static(frontendPath));

// Keep the existing root endpoint useful for API checks.
// The frontend is served for browser requests to the root URL.
app.get("/", (req, res, next) => {
res.sendFile(path.join(frontendPath, "index.html"), (err) => {
if (err) next(err);
});
});

export default app;
