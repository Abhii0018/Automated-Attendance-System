/**
 * fix-teacher-ids.js — One-time migration to fix AcademicRecord teacherIds
 *
 * The seed script used admin._id as a placeholder for teacherId in all
 * AcademicRecords. This script updates them to use the first teacher's _id.
 *
 * Usage:
 *   cd "Backend"
 *   node fix-teacher-ids.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/user.model.js";
import AcademicRecord from "./src/models/academicRecord.model.js";

dotenv.config();

async function fixTeacherIds() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find admin (used as placeholder)
    const admin = await User.findOne({ role: "admin" });
    if (!admin) {
        console.error("❌ No admin user found.");
        await mongoose.disconnect();
        return;
    }
    console.log(`👤 Admin: ${admin.name} (${admin._id})`);

    // Find the first teacher
    const teacher = await User.findOne({ role: "teacher" });
    if (!teacher) {
        console.warn("⚠️  No teacher user found in DB.");
        console.log("   Create a teacher account first, then re-run this script.");
        await mongoose.disconnect();
        return;
    }
    console.log(`🧑‍🏫 Teacher: ${teacher.name} (${teacher._id})`);

    // Check how many records currently have admin's ID as teacherId
    const countBefore = await AcademicRecord.countDocuments({
        teacherId: admin._id,
    });
    console.log(`📋 AcademicRecords with admin as teacherId: ${countBefore}`);

    if (countBefore === 0) {
        console.log("✅ Nothing to update — already correct!");
        await mongoose.disconnect();
        return;
    }

    // Update all of them to use teacher's _id
    const result = await AcademicRecord.updateMany(
        { teacherId: admin._id },
        { $set: { teacherId: teacher._id } }
    );

    console.log(`✅ Updated ${result.modifiedCount} AcademicRecords.`);
    console.log(`   teacherId → ${teacher._id} (${teacher.name})`);

    // Verify
    const remaining = await AcademicRecord.countDocuments({
        teacherId: admin._id,
    });
    console.log(`🔍 Records still using admin as teacherId: ${remaining}`);

    const total = await AcademicRecord.countDocuments();
    console.log(`📊 Total AcademicRecords: ${total}`);

    await mongoose.disconnect();
    console.log("🎉 Done!");
}

fixTeacherIds().catch((err) => {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
});
