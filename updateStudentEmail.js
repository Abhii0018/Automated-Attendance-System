/**
 * updateStudentEmail.js — Quick script to change a student's parent email for testing.
 *
 * Usage:
 * 1. Change the TEST_EMAIL variable below to your friend/teacher's email address.
 * 2. Run: node updateStudentEmail.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "./src/models/student.model.js";

dotenv.config();

// 👇 👇 👇 CHANGE THIS TO YOUR FRIEND'S EMAIL 👇 👇 👇
const TEST_EMAIL = "your.friend@gmail.com"; 

async function updateEmail() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // Find the first student in the database (usually Aarav Sharma)
        const student = await Student.findOne();
        
        if (!student) {
            console.log("❌ No students found in the database. Run your seed.js first!");
            return;
        }

        // Update the parent's email
        student.parentEmail = "aaravsah2004@gmail.com";
        await student.save();

        console.log(`🎉 Success! Updated student:`);
        console.log(`   Name:   ${student.name}`);
        console.log(`   Roll:   ${student.registrationNumber}`);
        console.log(`   Email:  ${student.parentEmail}`);
        console.log(`\n👉 Now log in to the website, go to Mark Attendance, and mark ${student.name} as Absent to test the email!`);

    } catch (err) {
        console.error("❌ Failed:", err.message);
    } finally {
        await mongoose.disconnect();
    }
}

updateEmail();
