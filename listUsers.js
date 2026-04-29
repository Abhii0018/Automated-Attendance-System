import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/user.model.js";

dotenv.config();

async function listUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({}, "name email role password");
        console.log("=== USERS IN SYSTEM ===");
        users.forEach(u => {
            console.log(`Role: ${u.role.padEnd(10)} | Email: ${u.email}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
listUsers();
