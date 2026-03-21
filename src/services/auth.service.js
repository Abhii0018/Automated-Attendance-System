import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Counter from "../models/counter.model.js";
import Teacher from "../models/teacher.model.js";
import Admin from "../models/admin.model.js";

/*
  Generate JWT Token
*/
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

/*
  Register Service
  ─────────────────────────────────────────────────────────────
  • Saves auth credentials to the shared "users" collection.
  • Also creates a role-specific profile document:
      student  →  Student  collection  (created separately by admin)
      teacher  →  Teacher  collection  (auto-created here)
      admin    →  Admin    collection  (auto-created here)
*/
export const registerUser = async (data) => {
  const { name, email, password, role, section } = data;

  // ── 1. Validate required fields
  if (!name || !name.trim()) throw new Error("Please enter your full name.");
  if (!email || !email.trim()) throw new Error("Please enter your email address.");
  if (!password) throw new Error("Please enter a password.");

  // ── 2. Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) throw new Error("Please enter a valid email address.");

  // ── 3. Validate password strength
  if (password.length < 8) throw new Error("Password must be at least 8 characters long.");
  if (!/[A-Z]/.test(password)) throw new Error("Password must contain at least one uppercase letter.");

  // ── 4. Check duplicate email
  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) throw new Error("This email is already registered. Please sign in instead, or use a different email.");

  // ── 5. Normalise role
  const rawRole = (role || "student").toString().toLowerCase();
  const allowedRoles = ["admin", "teacher", "student"];
  const normalizedRole = allowedRoles.includes(rawRole) ? rawRole : "student";

  // ── 6. Hash password & create base user
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    role: normalizedRole,
  });

  // ── 7. Create role-specific profile (different collection)
  if (normalizedRole === "teacher") {
    const counter = await Counter.findOneAndUpdate(
      { name: "teacher" },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );
    const teacherId = `TCH-${String(counter.sequence + 10000)}`;
    await User.findByIdAndUpdate(user._id, { teacherId });
    await Teacher.create({ userId: user._id, teacherId, name: name.trim(), email: email.toLowerCase().trim() });
  } else if (normalizedRole === "admin") {
    await Admin.create({ userId: user._id, name: name.trim(), email: email.toLowerCase().trim() });
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

/*
  Create Teacher — called by admin via dedicated route
*/
export const createTeacher = async (data, currentUser) => {
  const currentRole = currentUser.role?.toLowerCase();
  if (currentRole !== "admin") throw new Error("Only Admin can create teachers");

  const { name, email, password } = data;

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error("A user with this email already exists. Please use a different email.");

  const counter = await Counter.findOneAndUpdate(
    { name: "teacher" },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  const teacherId = `TCH-${String(counter.sequence + 10000)}`;

  const hashedPassword = await bcrypt.hash(password, 10);
  const teacher = await User.create({
    name, email, password: hashedPassword, role: "teacher", teacherId,
  });

  // Create profile in teachers collection
  await Teacher.create({ userId: teacher._id, teacherId, name, email });

  return {
    id: teacher._id,
    name: teacher.name,
    email: teacher.email,
    role: teacher.role,
    teacherId: teacher.teacherId,
  };
};

/*
  Login Service
*/
export const loginUser = async (data) => {
  const { email, password } = data;

  // ── Validate inputs
  if (!email || !email.trim()) throw new Error("Please enter your email address.");
  if (!password) throw new Error("Please enter your password.");

  // ── Find user
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) throw new Error("No account found with this email. Please check your email or register a new account.");

  // ── Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Incorrect password. Please try again or reset your password.");

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

/*
  Get All Teachers (Admin Only)
*/
export const getAllTeachers = async (currentUser) => {
  const currentRole = currentUser.role?.toLowerCase();
  if (currentRole !== "admin") throw new Error("Only Admin can view teachers");

  return await User.find({ role: "teacher" })
    .select("-password")
    .sort({ createdAt: -1 });
};