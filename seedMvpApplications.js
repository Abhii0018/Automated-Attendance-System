import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import Student from "./src/models/student.model.js";
import AcademicRecord from "./src/models/academicRecord.model.js";
import Counter from "./src/models/counter.model.js";
import User from "./src/models/user.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const TARGET_STUDENTS = 30;
const TARGET_PENDING_TEACHERS = 8;
const TARGET_PENDING_ADMINS = 1;
const SEMESTER = 1;
const PRIMARY_SECTION = "PA";
const SECONDARY_SECTION = "PB";
const DEPARTMENT = "Computer Science";
const SUBJECTS = ["Math", "C Language", "DBMS", "English", "Networking"];

const FIRST_NAMES = [
  "Aarav", "Arjun", "Ananya", "Aditya", "Bhavya", "Chetan", "Deepak", "Divya",
  "Ishaan", "Karan", "Kavya", "Lakshmi", "Manish", "Meera", "Mohit", "Naina",
  "Nikhil", "Pooja", "Priya", "Rahul", "Riya", "Rohan", "Sanya", "Shivam",
  "Sneha", "Tanvi", "Uday", "Vikram", "Yash", "Zara",
];
const LAST_NAMES = [
  "Sharma", "Patel", "Verma", "Singh", "Kumar", "Yadav", "Mehta", "Joshi",
  "Gupta", "Shah", "Nair", "Reddy", "Iyer", "Chopra", "Mishra",
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randPhone = () => `9${String(Math.floor(Math.random() * 900000000) + 100000000)}`;
const normalize = (s) => s.toLowerCase().replace(/\s+/g, ".");

const chooseSection = async () => {
  const [paCount, pbCount] = await Promise.all([
    AcademicRecord.countDocuments({ semester: SEMESTER, section: PRIMARY_SECTION }),
    AcademicRecord.countDocuments({ semester: SEMESTER, section: SECONDARY_SECTION }),
  ]);
  const total = paCount + pbCount;
  if (total < 20) return PRIMARY_SECTION;
  return paCount <= pbCount ? PRIMARY_SECTION : SECONDARY_SECTION;
};

const nextRollNumber = async (section) => {
  const rows = await AcademicRecord.find({ semester: SEMESTER, section }).select("rollNumber").lean();
  const used = new Set(rows.map((r) => r.rollNumber));
  let roll = 1;
  while (used.has(roll)) roll += 1;
  return roll;
};

const nextRegistrationNumber = async () => {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { admissionYear: year },
    { $inc: { sequence: 1 } },
    { returnDocument: "after", upsert: true }
  );
  const yearSuffix = String(year).slice(-2);
  const seq = String(Math.max(counter.sequence - 1, 0)).padStart(5, "0");
  return `${`1${yearSuffix}`}${seq}`;
};

async function seedStudents(adminUser) {
  const current = await Student.countDocuments();
  const needed = Math.max(TARGET_STUDENTS - current, 0);
  if (needed === 0) {
    console.log(`Students already >= ${TARGET_STUDENTS}. Skipping student seed.`);
    return;
  }

  let created = 0;
  let attempts = 0;
  while (created < needed && attempts < needed * 8) {
    attempts += 1;
    const first = rand(FIRST_NAMES);
    const last = rand(LAST_NAMES);
    const name = `${first} ${last}`;
    const handle = `${normalize(first)}.${normalize(last)}.${Date.now().toString().slice(-5)}.${created}`;
    const parentEmail = `parent.${handle}@mail.com`;
    const parentPhone = randPhone();

    try {
      const registrationNumber = await nextRegistrationNumber();
      const student = await Student.create({
        registrationNumber,
        name,
        department: DEPARTMENT,
        admissionYear: new Date().getFullYear(),
        parentEmail,
        parentPhone,
        createdBy: adminUser._id,
        isRegistered: false,
      });

      const section = await chooseSection();
      const rollNumber = await nextRollNumber(section);
      await AcademicRecord.create({
        studentId: student._id,
        teacherId: adminUser._id,
        semester: SEMESTER,
        section,
        rollNumber,
      });
      created += 1;
    } catch (err) {
      // continue trying with new generated data
    }
  }
  console.log(`Added ${created} students.`);
}

async function seedPendingTeachers() {
  const existing = await User.countDocuments({ role: "teacher", approvalStatus: "pending" });
  const needed = Math.max(TARGET_PENDING_TEACHERS - existing, 0);
  if (needed === 0) {
    console.log(`Pending teachers already >= ${TARGET_PENDING_TEACHERS}. Skipping teacher seed.`);
    return;
  }

  const passwordHash = await bcrypt.hash("Teacher@123", 10);
  let created = 0;
  for (let i = 0; i < needed; i += 1) {
    const first = rand(FIRST_NAMES);
    const last = rand(LAST_NAMES);
    const email = `teacher.app.${normalize(first)}.${normalize(last)}.${Date.now().toString().slice(-4)}${i}@school.edu`;
    try {
      await User.create({
        name: `${first} ${last}`,
        email,
        password: passwordHash,
        role: "teacher",
        isEmailVerified: true,
        approvalStatus: "pending",
        approvedAt: null,
        primarySubject: rand(SUBJECTS),
        secondarySubject: "",
        yearsOfExperience: 1 + (i % 5),
        highestQualification: "M.Tech",
        educationalBackground: "B.Tech, M.Tech",
        hasExperience: true,
      });
      created += 1;
    } catch {
      // ignore duplicates and continue
    }
  }
  console.log(`Added ${created} pending teacher applications.`);
}

async function seedPendingAdmin() {
  const existing = await User.countDocuments({
    role: "admin",
    isSuperAdmin: false,
    adminAccessStatus: "pending",
  });
  if (existing >= TARGET_PENDING_ADMINS) {
    console.log("Pending admin application already exists. Skipping admin seed.");
    return;
  }

  const passwordHash = await bcrypt.hash("Admin@123", 10);
  const stamp = Date.now().toString().slice(-6);
  await User.create({
    name: "Pending Admin Applicant",
    email: `pending.admin.${stamp}@school.edu`,
    password: passwordHash,
    role: "admin",
    isSuperAdmin: false,
    isEmailVerified: true,
    adminAccessStatus: "pending",
    adminRequestedAt: new Date(),
    approvalStatus: "approved",
    phone: randPhone(),
    department: "Administration",
    designation: "Assistant Admin",
    adminAccessReason: "Need admin dashboard for daily operations.",
  });
  console.log("Added 1 pending admin application.");
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const adminUser = await User.findOne({
    role: "admin",
    adminAccessStatus: "approved",
  });
  if (!adminUser) {
    throw new Error("No approved admin found. Create/login admin first.");
  }

  await seedStudents(adminUser);
  await seedPendingTeachers();
  await seedPendingAdmin();

  const studentCount = await Student.countDocuments();
  const paCount = await AcademicRecord.countDocuments({ semester: 1, section: "PA" });
  const pbCount = await AcademicRecord.countDocuments({ semester: 1, section: "PB" });
  const pendingTeachers = await User.countDocuments({ role: "teacher", approvalStatus: "pending" });
  const pendingAdmins = await User.countDocuments({
    role: "admin",
    isSuperAdmin: false,
    adminAccessStatus: "pending",
  });

  console.log("Seeding completed.");
  console.log(`Students total: ${studentCount}`);
  console.log(`Semester-1 PA: ${paCount}, PB: ${pbCount}`);
  console.log(`Pending teacher applications: ${pendingTeachers}`);
  console.log(`Pending admin applications: ${pendingAdmins}`);

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Seed failed:", err.message);
  await mongoose.disconnect();
  process.exit(1);
});
