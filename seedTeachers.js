import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "./src/models/user.model.js";
import Teacher from "./src/models/teacher.model.js";

dotenv.config();

const teachersToSeed = [
    { name: "Rajiv Sharma",   email: "rajiv.sharma@school.edu",   password: "Rajiv@123",   department: "Computer Science" },
    { name: "Priya Mehta",    email: "priya.mehta@school.edu",    password: "Priya@123",    department: "Mathematics" },
    { name: "Suresh Patel",   email: "suresh.patel@school.edu",   password: "Suresh@123",   department: "Physics" },
    { name: "Anita Verma",    email: "anita.verma@school.edu",    password: "Anita@123",    department: "Chemistry" },
    { name: "Deepak Joshi",   email: "deepak.joshi@school.edu",   password: "Deepak@123",   department: "Biology" },
    { name: "Kavita Singh",   email: "kavita.singh@school.edu",   password: "Kavita@123",   department: "English" }
];

async function seedTeachers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        let addedCount = 0;
        for (const t of teachersToSeed) {
            // Check if user exists
            const existing = await User.findOne({ email: t.email });
            if (existing) {
                console.log(`⚠️ User ${t.email} already exists. Skipping.`);
                continue;
            }

            // Create User
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(t.password, salt);

            const user = await User.create({
                name: t.name,
                email: t.email,
                password: hashedPassword,
                role: "teacher"
            });

            // Create Teacher Profile
            const teacherIdStr = `TCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await Teacher.create({
                userId: user._id,
                teacherId: teacherIdStr,
                name: t.name,
                email: t.email,
                department: t.department
            });

            console.log(`✅ Added ${t.name} (${t.email})`);
            addedCount++;
        }

        console.log(`🎉 Seed complete. Added ${addedCount} teachers.`);
    } catch (err) {
        console.error("❌ Seeding failed:", err.message);
    } finally {
        await mongoose.disconnect();
    }
}

seedTeachers();
