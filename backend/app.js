import express from "express";
import cors from "cors";
import "dotenv/config";

import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profiles.js";
import imageRoutes from "./routes/images.js";
import reportRoutes from "./routes/reports.js";
import commentRoutes from "./routes/comments.js";
import regionRoutes from "./routes/regions.js";
import adminRoutes from "./routes/admin.js";
import agentRoutes from "./routes/agent.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "cora-backend" });
});

app.use("/api", authRoutes);
app.use("/api", profileRoutes);
app.use("/api", imageRoutes);
app.use("/api", reportRoutes);
app.use("/api", commentRoutes);
app.use("/api", regionRoutes);
app.use("/api", adminRoutes);
app.use("/api", agentRoutes);

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ ok: false, message: "Error interno del servidor" });
});

export default app;
