import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes.js";
import studentRoutes from "./routes/student.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";

const app = express();
const isProd = process.env.NODE_ENV === "production";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 300 : 1500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

app.use(express.json());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
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