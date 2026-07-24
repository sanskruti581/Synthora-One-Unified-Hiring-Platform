import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { connectDatabase } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import companyRoutes from "./routes/company.routes.js";
import driveRoutes from "./routes/drive.routes.js";
import studentRoutes from "./routes/student.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, "../.env");
dotenv.config({ path: envPath });

const app = express();
const port = process.env.PORT || 5000;
let server;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "synthora-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/company/drives", driveRoutes);
app.use("/api/students", studentRoutes);

async function startServer() {
  try {
    await connectDatabase();
    server = app.listen(port, () => {
      console.log(`Synthora backend running on http://localhost:${port}`);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use. Stop the existing backend process or set a different PORT.`);
        console.error(`Windows check: netstat -ano | findstr :${port}`);
        console.error(`Windows stop: taskkill /PID <PID_FROM_NETSTAT> /F`);
        process.exit(1);
      }

      console.error("Server failed to start:", error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  try {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }

    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }

    console.log("Shutdown complete.");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

["SIGINT", "SIGTERM", "SIGUSR2"].forEach((signal) => {
  process.on(signal, () => shutdown(signal));
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  shutdown("unhandledRejection");
});

startServer();
