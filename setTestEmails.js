import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "./src/models/student.model.js";

dotenv.config();

const updates = [
    { name: /rahul\s+sharma/i, email: "sahilsah200217@gmail.com" },
    { name: /gaurav\s+das/i, email: "vedantsah2004@gmail.com" }
];

async function updateAllTestEmails() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        for (const u of updates) {
            const result = await Student.updateMany(
                { name: u.name },
                { $set: { parentEmail: u.email } }
            );

            console.log(`✅ Updated ${result.modifiedCount} records matching "${u.name}" across all sections to ${u.email}`);
        }
        
    } catch (err) {
        console.error("❌ Failed:", err.message);
    } finally {
        await mongoose.disconnect();
    }
}

updateAllTestEmails();
