import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes.js";
import studentRoutes from "./routes/student.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://automated-attendance-system-fronten-beta.vercel.app"
  ],
  credentials: true
}));

// Disable CSP in development
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(limiter);

app.use("/api/auth", authRoutes);  ///route prefix

app.use("/api/students", studentRoutes);

app.use("/api/attendance", attendanceRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

export default app;