/**
 * seed.js — Run once to populate 100 students (20 per section) in the DB
 *
 * Usage:
 *   cd "Backend"
 *   node seed.js
 *
 * Sections (2-letter): PA, PB, PC, PD, PE  (20 students each = 100 total)
 * Semester: 1 for all seeded students
 * Registration format: 1YY00001  (matches backend Counter logic)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Counter from "./src/models/counter.model.js";
import Student from "./src/models/student.model.js";
import User from "./src/models/user.model.js";
import AcademicRecord from "./src/models/academicRecord.model.js";

dotenv.config();

// ─── Indian name pool ─────────────────────────────────────────────────────────
const FIRST = ["Aarav", "Arjun", "Ananya", "Aditya", "Akhil", "Bhavya", "Chetan", "Deepak", "Divya", "Ishaan", "Karan", "Kavya", "Lakshmi", "Manish", "Meera", "Mohit", "Naina", "Nikhil", "Pooja", "Priya", "Rahul", "Riya", "Rohan", "Sanya", "Shivam", "Sneha", "Suresh", "Tanvi", "Uday", "Vikram", "Yash", "Zara", "Siddharth", "Palak", "Gaurav", "Harsha", "Kartik", "Lavanya", "Mayur", "Neha", "Omkar", "Poonam", "Rajesh", "Sakshi", "Tarun", "Varun", "Apoorva", "Chirag", "Disha", "Esha", "Farhan", "Girish", "Hina", "Ishan", "Jyoti", "Komal", "Laxman", "Madhuri", "Neeraj", "Preeti", "Qasim", "Rupal", "Sunil", "Tejal", "Umesh", "Vrinda", "Wasim", "Yogesh", "Akshay", "Bhavesh", "Chandni", "Devika", "Ekta", "Foram", "Gopal", "Heena", "Indira", "Jagdish", "Kalpana", "Leena", "Mukesh", "Nidhi", "Pawan", "Radha", "Suraj", "Tina", "Ujjwal", "Vimala", "Aishwarya", "Babita", "Chiranjeevi", "Dhruv", "Falguni", "Gaurav", "Hemant", "Ilma", "Jayesh", "Krisha"];
const LAST = ["Sharma", "Patel", "Verma", "Singh", "Kumar", "Yadav", "Mehta", "Joshi", "Gupta", "Shah", "Nair", "Reddy", "Iyer", "Chopra", "Mishra", "Sinha", "Das", "Roy", "Bose", "Malhotra", "Kapoor", "Agrawal", "Pandey", "Dubey", "Saxena", "Tiwari", "Chaudhary", "Rao", "Pillai", "Desai"];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randPhone = () => `9${String(Math.floor(Math.random() * 900000000) + 100000000)}`;

const SECTIONS = ["PA", "PB", "PC", "PD", "PE"];
const SEMESTER = 1;
const DEPT = "Computer Science";

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // ── FIRST: Drop stale non-sparse userId_1 index BEFORE any model ops ───
    // The old index has unique:true without sparse:true, blocking multiple nulls.
    try {
        await mongoose.connection.db.collection("students").dropIndex("userId_1");
        console.log("🗑️  Dropped stale userId_1 index");
    } catch (e) {
        if (e.codeName === "IndexNotFound") {
            console.log("ℹ️  userId_1 index not found — already dropped or doesn't exist");
        } else {
            console.warn("⚠️  Could not drop userId_1 index:", e.message);
        }
    }

    // ── Sync indexes (creates new sparse index) ───────────────────────────
    await Student.syncIndexes();
    console.log("✅ Indexes synchronized");

    // Check if already seeded
    const existing = await Student.countDocuments();
    if (existing >= 100) {
        console.log(`⚠️  Already have ${existing} students. Skipping seed.`);
        await mongoose.disconnect();
        return;
    }

    // Get any admin user to use as createdBy
    const admin = await User.findOne({ role: "admin" });
    if (!admin) {
        console.error("❌ No admin user found. Register an admin first, then run seed.");
        await mongoose.disconnect();
        return;
    }
    console.log(`👤 Using admin: ${admin.name} (${admin._id})`);

    const admissionYear = new Date().getFullYear();
    let created = 0;
    let skipped = 0;

    for (const section of SECTIONS) {
        console.log(`\n📚 Seeding section ${section}...`);

        for (let roll = 1; roll <= 20; roll++) {
            const name = `${rand(FIRST)} ${rand(LAST)}`;
            const emailHandle = name.toLowerCase().replace(/\s+/g, ".") + `.${roll}`;
            const email = `${emailHandle}@student.edu`;
            const parentEmail = `parent.${emailHandle}@gmail.com`;
            const parentPhone = randPhone();

            // Generate registration number using the same logic as createStudent service
            const counter = await Counter.findOneAndUpdate(
                { admissionYear },
                { $inc: { sequence: 1 } },
                { returnDocument: "after", upsert: true }
            );
            const yearSuffix = String(admissionYear).slice(-2);
            const registrationNumber = `1${yearSuffix}${String(counter.sequence).padStart(5, "0")}`;

            try {
                // 1. Create Student profile  (userId omitted — set when student self-registers)
                const student = await Student.create({
                    name,
                    department: DEPT,
                    parentEmail,
                    parentPhone,
                    admissionYear,
                    registrationNumber,
                    createdBy: admin._id,
                    isRegistered: false,
                    // userId intentionally omitted so sparse index allows it
                });


                // 2. Create AcademicRecord to place them in section
                await AcademicRecord.create({
                    studentId: student._id,
                    teacherId: admin._id,   // placeholder — reassign when teacher is assigned
                    semester: SEMESTER,
                    section,
                    rollNumber: roll,
                });

                created++;
                process.stdout.write(`  ✓ ${registrationNumber} — ${name}\n`);
            } catch (err) {
                skipped++;
                console.warn(`  ⚠️  Skipped (${err.message})`);
            }
        }
    }

    console.log(`\n🎉 Done! Created ${created} students, skipped ${skipped}.`);
    console.log(`   Sections: ${SECTIONS.join(", ")}  |  Semester: ${SEMESTER}  |  Dept: ${DEPT}`);
    await mongoose.disconnect();
}

seed().catch(err => {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
});
