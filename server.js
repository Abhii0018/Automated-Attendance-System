import dotenv from "dotenv";
dotenv.config();  // MUST BE FIRST

import app from "./src/app.js";
import mongoose from "mongoose";
import { bootstrapSuperAdminAccess } from "./src/services/auth.service.js";

const PORT = process.env.PORT || 5000;
const DB_RETRY_MS = 5000;

const connectDBWithRetry = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is missing in .env");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database connected");
    await bootstrapSuperAdminAccess();
    console.log("Super admin access bootstrap completed");
  } catch (err) {
    console.error("Database connection failed:", err.message);
    console.log(`Retrying database connection in ${DB_RETRY_MS / 1000}s...`);
    setTimeout(connectDBWithRetry, DB_RETRY_MS);
  }
};

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDBWithRetry();
});