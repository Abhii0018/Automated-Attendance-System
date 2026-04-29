import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/user.model.js";
import PendingRegistration from "../models/pendingRegistration.model.js";
import Counter from "../models/counter.model.js";
import Teacher from "../models/teacher.model.js";
import { sendVerificationEmail, sendSuperAdminLoginOtpEmail } from "./notification.service.js";

const SUPER_ADMIN_EMAIL = "abhisheksah018@gmail.com";
const SUPER_ADMIN_NAME = "Abhishek Kumar";
const SUPER_ADMIN_DESIGNATION = "Director";
const SUPER_ADMIN_PASSWORD = "Abhiisah@17";

/*
  Generate JWT Token
*/
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      isSuperAdmin: Boolean(user.isSuperAdmin),
      adminAccessStatus: user.adminAccessStatus || "approved",
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

const EMAIL_VERIFY_EXPIRY_MS = 10 * 60 * 1000;

export const bootstrapSuperAdminAccess = async () => {
  const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
  const existing = await User.findOne({ email: SUPER_ADMIN_EMAIL });

  if (!existing) {
    await User.create({
      name: SUPER_ADMIN_NAME,
      email: SUPER_ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
      isSuperAdmin: true,
      isEmailVerified: true,
      adminAccessStatus: "approved",
      adminRequestedAt: new Date(),
      adminApprovedAt: new Date(),
      designation: SUPER_ADMIN_DESIGNATION,
      approvalStatus: "approved",
      approvedAt: new Date(),
      superAdminLoginOtpHash: null,
      superAdminLoginOtpExpires: null,
      superAdminOtpVerifiedAt: null,
    });
  } else {
    await User.updateOne(
      { _id: existing._id },
      {
        $set: {
          name: SUPER_ADMIN_NAME,
          role: "admin",
          password: hashedPassword,
          isSuperAdmin: true,
          isEmailVerified: true,
          adminAccessStatus: "approved",
          designation: SUPER_ADMIN_DESIGNATION,
          adminApprovedAt: new Date(),
          adminRejectionReason: "",
          superAdminLoginOtpHash: null,
          superAdminLoginOtpExpires: null,
          superAdminOtpVerifiedAt: null,
        },
      }
    );
  }

  await User.updateMany(
    { role: "admin", email: { $ne: SUPER_ADMIN_EMAIL } },
    {
      $set: {
        isSuperAdmin: false,
        adminAccessStatus: "pending",
        adminApprovedAt: null,
      },
    }
  );
};

const assertSuperAdmin = async (currentUser) => {
  const user = await User.findById(currentUser.id);
  if (!user || user.role !== "admin" || !user.isSuperAdmin) {
    throw new Error("Only Super Admin can review admin applications");
  }
  return user;
};

const createOtpDetails = () => {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
  return {
    otp,
    otpHash,
    expiresAt: new Date(Date.now() + EMAIL_VERIFY_EXPIRY_MS),
  };
};

const assertSuperAdminEmail = (email) => {
  if (email.toLowerCase().trim() !== SUPER_ADMIN_EMAIL) {
    throw new Error("Only configured Super Admin email can use this flow.");
  }
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
  const {
    name,
    email,
    password,
    role,
    age,
    gender,
    parentName,
    parentRelation,
    parentEmail,
    parentPhone,
    primarySubject,
    secondarySubject,
    yearsOfExperience,
    highestQualification,
    educationalBackground,
    hasExperience,
    phone,
    department,
    designation,
    adminAccessReason,
  } = data;

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
  const allowedRoles = ["teacher", "student", "admin"];
  const normalizedRole = allowedRoles.includes(rawRole) ? rawRole : "student";

  if (normalizedRole === "student") {
    if (!gender) throw new Error("Gender is required for student registration.");
    if (!age || Number(age) < 3 || Number(age) > 120) throw new Error("Valid age is required for student registration.");
    if (!parentName || !parentName.trim()) throw new Error("Parent name is required for student registration.");
    if (!parentRelation || !parentRelation.trim()) throw new Error("Parent relation is required for student registration.");
    if (!parentEmail || !parentEmail.trim()) throw new Error("Parent email is required for student registration.");
    if (!parentPhone || !parentPhone.trim()) throw new Error("Parent phone is required for student registration.");
  }

  if (normalizedRole === "teacher") {
    if (!primarySubject || !primarySubject.trim()) throw new Error("Primary subject is required for teacher registration.");
    if (!highestQualification || !highestQualification.trim()) throw new Error("Highest qualification is required for teacher registration.");
  }

  if (normalizedRole === "admin") {
    if (!phone || !phone.trim()) throw new Error("Phone is required for admin access request.");
    if (!department || !department.trim()) throw new Error("Department is required for admin access request.");
    if (!designation || !designation.trim()) throw new Error("Designation is required for admin access request.");
    if (!adminAccessReason || !adminAccessReason.trim()) throw new Error("Reason is required for admin access request.");
  }

  // ── 6. Hash password & create pending registration
  const hashedPassword = await bcrypt.hash(password, 10);
  const { otp, otpHash, expiresAt } = createOtpDetails();

  await PendingRegistration.findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: normalizedRole,
      age: normalizedRole === "student" ? Number(age) : null,
      gender: normalizedRole === "student" ? String(gender).toLowerCase().trim() : "",
      parentName: normalizedRole === "student" ? (parentName || "").trim() : "",
      parentRelation: normalizedRole === "student" ? (parentRelation || "").trim() : "",
      parentEmail: normalizedRole === "student" ? (parentEmail || "").toLowerCase().trim() : "",
      parentPhone: normalizedRole === "student" ? (parentPhone || "").trim() : "",
      primarySubject: normalizedRole === "teacher" ? (primarySubject || "").trim() : "",
      secondarySubject: normalizedRole === "teacher" ? (secondarySubject || "").trim() : "",
      yearsOfExperience: normalizedRole === "teacher" ? Number(yearsOfExperience || 0) : 0,
      highestQualification: normalizedRole === "teacher" ? (highestQualification || "").trim() : "",
      educationalBackground: normalizedRole === "teacher" ? (educationalBackground || "").trim() : "",
      hasExperience: normalizedRole === "teacher" ? Boolean(hasExperience || Number(yearsOfExperience || 0) > 0) : false,
      phone: normalizedRole === "admin" ? (phone || "").trim() : "",
      department: normalizedRole === "admin" ? (department || "").trim() : "",
      designation: normalizedRole === "admin" ? (designation || "").trim() : "",
      adminAccessReason: normalizedRole === "admin" ? (adminAccessReason || "").trim() : "",
      otpHash,
      otpExpires: expiresAt,
    },
    { new: true, upsert: true }
  );

  const emailResult = await sendVerificationEmail(email.toLowerCase().trim(), name.trim(), otp);
  if (!emailResult.success) {
    throw new Error("Could not send verification OTP. Please try again.");
  }

  return {
    email: email.toLowerCase().trim(),
    requiresVerification: true,
  };
};

const createUserFromPending = async (pending) => {
  const isSuperAdminCandidate = pending.email === SUPER_ADMIN_EMAIL;
  const isAdminRole = pending.role === "admin";

  const user = await User.create({
    name: pending.name,
    email: pending.email,
    password: pending.password,
    role: pending.role,
    isEmailVerified: true,
    emailVerificationToken: null,
    emailVerificationExpires: null,
    approvalStatus: pending.role === "teacher" ? "pending" : "approved",
    approvedBy: null,
    approvedAt: pending.role === "teacher" ? null : new Date(),
    rejectionReason: "",
    primarySubject: pending.primarySubject || "",
    secondarySubject: pending.secondarySubject || "",
    yearsOfExperience: pending.yearsOfExperience || 0,
    highestQualification: pending.highestQualification || "",
    educationalBackground: pending.educationalBackground || "",
    hasExperience: pending.hasExperience || false,
    age: pending.age || null,
    gender: pending.gender || "",
    parentName: pending.parentName || "",
    parentRelation: pending.parentRelation || "",
    parentEmail: pending.parentEmail || "",
    parentPhone: pending.parentPhone || "",
    isSuperAdmin: isSuperAdminCandidate,
    adminAccessStatus: isAdminRole ? (isSuperAdminCandidate ? "approved" : "pending") : "approved",
    adminRequestedAt: isAdminRole ? new Date() : null,
    adminApprovedBy: null,
    adminApprovedAt: isAdminRole ? (isSuperAdminCandidate ? new Date() : null) : new Date(),
    adminRejectionReason: "",
    phone: pending.phone || "",
    department: pending.department || "",
    designation: isSuperAdminCandidate ? SUPER_ADMIN_DESIGNATION : (pending.designation || ""),
    adminAccessReason: pending.adminAccessReason || "",
  });

  if (pending.role === "teacher") {
    const counter = await Counter.findOneAndUpdate(
      { name: "teacher" },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );
    const teacherId = `TCH-${String(counter.sequence + 10000)}`;
    await User.findByIdAndUpdate(user._id, { teacherId });
    await Teacher.create({
      userId: user._id,
      teacherId,
      name: pending.name,
      email: pending.email,
      qualification: pending.highestQualification || "",
    });
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isEmailVerified: true,
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
  if (!user) {
    const pending = await PendingRegistration.findOne({ email: email.toLowerCase().trim() });
    if (pending) throw new Error("Please verify OTP first to activate your account.");
    throw new Error("No account found with this email. Please check your email or register a new account.");
  }

  if (user.isSuperAdmin) {
    const isOtpVerified =
      user.superAdminOtpVerifiedAt &&
      Date.now() - new Date(user.superAdminOtpVerifiedAt).getTime() <= EMAIL_VERIFY_EXPIRY_MS;
    if (!isOtpVerified) {
      throw new Error("Please verify Super Admin login OTP before entering password.");
    }
  }

  // ── Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Incorrect password. Please try again or reset your password.");
  if (!user.isEmailVerified) {
    throw new Error("Please verify your email before logging in.");
  }
  if (user.role === "teacher" && user.approvalStatus !== "approved") {
    if (user.approvalStatus === "rejected") {
      throw new Error(user.rejectionReason || "Your teacher application was rejected by super admin.");
    }
    throw new Error("Your teacher application is pending super admin approval.");
  }
  if (user.role === "admin" && !user.isSuperAdmin && user.adminAccessStatus !== "approved") {
    if (user.adminAccessStatus === "rejected") {
      throw new Error(user.adminRejectionReason || "Your admin access request was rejected by super admin.");
    }
    throw new Error("Your admin access request is pending super admin approval.");
  }

  if (user.isSuperAdmin) {
    user.superAdminLoginOtpHash = null;
    user.superAdminLoginOtpExpires = null;
    user.superAdminOtpVerifiedAt = null;
    await user.save();
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isSuperAdmin: Boolean(user.isSuperAdmin),
      adminAccessStatus: user.adminAccessStatus || "approved",
    },
  };
};

export const sendSuperAdminLoginOtp = async (email) => {
  if (!email || !email.trim()) throw new Error("Email is required.");
  assertSuperAdminEmail(email);

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.isSuperAdmin) throw new Error("Super Admin account not found.");
  if (!user.isEmailVerified) throw new Error("Super Admin email is not verified.");

  const { otp, otpHash, expiresAt } = createOtpDetails();
  user.superAdminLoginOtpHash = otpHash;
  user.superAdminLoginOtpExpires = expiresAt;
  user.superAdminOtpVerifiedAt = null;
  await user.save();

  const emailResult = await sendSuperAdminLoginOtpEmail(user.email, user.name, otp);
  if (!emailResult.success) {
    throw new Error("Could not send Super Admin login OTP. Please try again.");
  }

  return { message: "Super Admin login OTP sent to email." };
};

export const verifySuperAdminLoginOtp = async (email, otp) => {
  if (!email || !email.trim()) throw new Error("Email is required.");
  if (!otp || !String(otp).trim()) throw new Error("OTP is required.");
  assertSuperAdminEmail(email);

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.isSuperAdmin) throw new Error("Super Admin account not found.");
  if (!user.superAdminLoginOtpHash || !user.superAdminLoginOtpExpires) {
    throw new Error("Please request login OTP first.");
  }
  if (user.superAdminLoginOtpExpires < new Date()) {
    throw new Error("Super Admin login OTP expired. Please request a new OTP.");
  }

  const otpHash = crypto.createHash("sha256").update(String(otp).trim()).digest("hex");
  if (otpHash !== user.superAdminLoginOtpHash) throw new Error("Invalid OTP.");

  user.superAdminOtpVerifiedAt = new Date();
  await user.save();

  return { message: "Super Admin OTP verified. You can now enter password." };
};

export const verifyEmailOtp = async (email, otp) => {
  if (!email || !email.trim()) throw new Error("Email is required.");
  if (!otp || !String(otp).trim()) throw new Error("OTP is required.");

  const pending = await PendingRegistration.findOne({ email: email.toLowerCase().trim() });
  if (!pending) throw new Error("No pending verification found for this email.");
  if (pending.otpExpires < new Date()) throw new Error("OTP expired. Please request a new one.");

  const otpHash = crypto.createHash("sha256").update(String(otp).trim()).digest("hex");
  if (pending.otpHash !== otpHash) throw new Error("Invalid OTP.");

  const user = await createUserFromPending(pending);
  await PendingRegistration.deleteOne({ _id: pending._id });

  const message = user.role === "teacher"
    ? "Email verified. Your teacher application is pending super admin approval."
    : user.role === "admin" && !user.isSuperAdmin
    ? "Email verified. Your admin access request is pending Super Admin approval."
    : "Email verified successfully. You can now log in.";

  return { message, user };
};

export const resendVerificationEmail = async (email) => {
  if (!email || !email.trim()) throw new Error("Please enter your email address.");

  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) throw new Error("This email is already verified.");

  const pending = await PendingRegistration.findOne({ email: email.toLowerCase().trim() });
  if (!pending) throw new Error("No pending verification found for this email.");

  const { otp, otpHash, expiresAt } = createOtpDetails();
  pending.otpHash = otpHash;
  pending.otpExpires = expiresAt;
  await pending.save();

  const emailResult = await sendVerificationEmail(pending.email, pending.name, otp);
  if (!emailResult.success) {
    throw new Error("Could not send verification OTP right now. Please try again.");
  }

  return { message: "Verification OTP sent successfully." };
};

/*
  Get All Teachers (Admin Only)
*/
export const getAllTeachers = async (currentUser) => {
  const currentRole = currentUser.role?.toLowerCase();
  if (currentRole !== "admin") throw new Error("Only Admin can view teachers");

  return await User.find({ role: "teacher", approvalStatus: "approved" })
    .select("-password")
    .sort({ createdAt: -1 });
};

export const getPendingTeacherApplications = async (currentUser) => {
  const currentRole = currentUser.role?.toLowerCase();
  if (currentRole !== "admin") throw new Error("Only Super Admin can view pending teacher applications");

  return await User.find({ role: "teacher", approvalStatus: "pending" })
    .select("-password")
    .sort({ createdAt: -1 });
};

export const getReviewedTeacherApplications = async (currentUser) => {
  const currentRole = currentUser.role?.toLowerCase();
  if (currentRole !== "admin") throw new Error("Only Super Admin can view reviewed teacher applications");

  return await User.find({
    role: "teacher",
    approvalStatus: { $in: ["approved", "rejected"] },
  })
    .select("-password")
    .sort({ approvedAt: -1, updatedAt: -1 });
};

export const reviewTeacherApplication = async (teacherId, action, reason, currentUser) => {
  const superAdmin = await assertSuperAdmin(currentUser);

  const teacher = await User.findById(teacherId);
  if (!teacher || teacher.role !== "teacher") throw new Error("Teacher not found");
  if (teacher.approvalStatus !== "pending") throw new Error("This teacher application is already reviewed");

  const normalizedAction = String(action || "").toLowerCase();
  if (!["approve", "reject"].includes(normalizedAction)) {
    throw new Error("Action must be approve or reject");
  }

  teacher.approvalStatus = normalizedAction === "approve" ? "approved" : "rejected";
  teacher.approvedBy = superAdmin._id;
  teacher.approvedAt = new Date();
  teacher.rejectionReason = normalizedAction === "reject" ? (reason || "Rejected by super admin") : "";
  await teacher.save();

  return {
    teacherId: teacher._id,
    approvalStatus: teacher.approvalStatus,
    rejectionReason: teacher.rejectionReason,
  };
};

export const getPendingAdminApplications = async (currentUser) => {
  await assertSuperAdmin(currentUser);

  return await User.find({
    role: "admin",
    isSuperAdmin: false,
    adminAccessStatus: "pending",
  })
    .select("-password")
    .sort({ adminRequestedAt: -1, createdAt: -1 });
};

export const getReviewedAdminApplications = async (currentUser) => {
  await assertSuperAdmin(currentUser);

  return await User.find({
    role: "admin",
    isSuperAdmin: false,
    adminAccessStatus: { $in: ["approved", "rejected"] },
  })
    .select("-password")
    .sort({ adminApprovedAt: -1, updatedAt: -1 });
};

export const reviewAdminApplication = async (adminId, action, reason, currentUser) => {
  const superAdmin = await assertSuperAdmin(currentUser);
  const admin = await User.findById(adminId);

  if (!admin || admin.role !== "admin") throw new Error("Admin user not found");
  if (admin.isSuperAdmin) throw new Error("Super Admin access cannot be modified");
  if (admin.adminAccessStatus !== "pending") throw new Error("This admin application is already reviewed");

  const normalizedAction = String(action || "").toLowerCase();
  if (!["approve", "reject"].includes(normalizedAction)) {
    throw new Error("Action must be approve or reject");
  }

  admin.adminAccessStatus = normalizedAction === "approve" ? "approved" : "rejected";
  admin.adminApprovedBy = superAdmin._id;
  admin.adminApprovedAt = new Date();
  admin.adminRejectionReason = normalizedAction === "reject" ? (reason || "Rejected by Super Admin") : "";
  await admin.save();

  return {
    adminId: admin._id,
    adminAccessStatus: admin.adminAccessStatus,
    adminRejectionReason: admin.adminRejectionReason,
  };
};

export const getPendingAdminRequests = getPendingAdminApplications;
export const getReviewedAdminRequests = getReviewedAdminApplications;
export const reviewAdminRequest = reviewAdminApplication;