/**
 * updateTeachers.js — One-time script to rename placeholder teachers in DB
 * Usage: cd Backend && node updateTeachers.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "./src/models/user.model.js";
import Teacher from "./src/models/teacher.model.js";

dotenv.config();

// Map old email → new data
const UPDATES = [
    {
        oldEmail: "abhi4@gmail.com",
        newName: "Rajiv Sharma",
        newEmail: "rajiv.sharma@school.edu",
        newPassword: "Rajiv@123",
        department: "Computer Science",
    },
    {
        oldEmail: "abhi5@gmail.com",
        newName: "Priya Mehta",
        newEmail: "priya.mehta@school.edu",
        newPassword: "Priya@123",
        department: "Mathematics",
    },
    {
        oldEmail: "abhi6@gmail.com",
        newName: "Suresh Patel",
        newEmail: "suresh.patel@school.edu",
        newPassword: "Suresh@123",
        department: "Physics",
    },
    {
        oldEmail: "abhi7@gmail.com",
        newName: "Anita Verma",
        newEmail: "anita.verma@school.edu",
        newPassword: "Anita@123",
        department: "Chemistry",
    },
    {
        oldEmail: "abhi8@gmail.com",
        newName: "Deepak Joshi",
        newEmail: "deepak.joshi@school.edu",
        newPassword: "Deepak@123",
        department: "Biology",
    },
];

async function updateTeachers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        for (const u of UPDATES) {
            // ── Update User document ─────────────────────────
            const user = await User.findOne({ email: u.oldEmail });
            if (!user) {
                console.log(`⚠️  No user found for ${u.oldEmail} — skipping`);
                continue;
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(u.newPassword, salt);

            await User.findByIdAndUpdate(user._id, {
                name: u.newName,
                email: u.newEmail,
                password: hashedPassword,
            });

            // ── Update Teacher profile document ──────────────
            await Teacher.findOneAndUpdate(
                { userId: user._id },
                {
                    name: u.newName,
                    email: u.newEmail,
                    department: u.department,
                }
            );

            console.log(`✅ Updated: ${u.oldEmail} → ${u.newName} (${u.newEmail})`);
        }

        console.log("\n🎉 All teachers updated successfully!");
    } catch (err) {
        console.error("❌ Update failed:", err.message);
    } finally {
        await mongoose.disconnect();
    }
}

updateTeachers();
