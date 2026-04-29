import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "./src/models/user.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const SUBJECTS = ["Math", "C Language", "DBMS", "English", "Networking"];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const pending = await User.find({ role: "teacher", approvalStatus: "pending" }).select("_id");

  for (const [i, teacher] of pending.entries()) {
    await User.updateOne(
      { _id: teacher._id },
      { $set: { primarySubject: SUBJECTS[i % SUBJECTS.length], secondarySubject: "" } }
    );
  }

  console.log(`Updated pending teachers: ${pending.length}`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Failed:", err.message);
  await mongoose.disconnect();
  process.exit(1);
});
