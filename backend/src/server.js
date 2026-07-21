import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDatabase } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import companyRoutes from "./routes/company.routes.js";
import driveRoutes from "./routes/drive.routes.js";
import studentRoutes from "./routes/student.routes.js";

dotenv.config({ path: "../.env" });
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "synthora-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/company/drives", driveRoutes);
app.use("/api/students", studentRoutes);

connectDatabase()
  .then(() => {
    const server = app.listen(port, () => {
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
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  });
