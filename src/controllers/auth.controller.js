import {
  registerUser,
  loginUser,
  getAllTeachers,
  verifyEmailOtp,
  resendVerificationEmail,
  getPendingTeacherApplications,
  getReviewedTeacherApplications,
  reviewTeacherApplication,
  getPendingAdminRequests,
  getReviewedAdminRequests,
  reviewAdminRequest,
  sendSuperAdminLoginOtp,
  verifySuperAdminLoginOtp,
} from "../services/auth.service.js";

/*
  Register Controller
*/
export const register = async (req, res) => {
  try {
    const user = await registerUser(req.body);

    res.status(201).json({
      success: true,
      message: "OTP sent to your email. Verify to complete registration.",
      data: user,
    });
  } catch (error) {
    let msg = error.message || "Registration failed. Please try again.";
    let status = msg.includes("already registered") ? 409 : 400;

    // Hide internal DB/Mongoose errors from the client
    if (msg.includes("buffering timed out") || msg.includes("Mongo") || msg.includes("ECONN") || error.name === "MongooseError") {
      msg = "We are currently experiencing technical difficulties. Please try again later.";
      status = 500;
    }

    res.status(status).json({
      success: false,
      message: msg,
    });
  }
};

/*
  Login Controller
*/
export const login = async (req, res) => {
  try {
    const result = await loginUser(req.body);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    let msg = error.message || "Login failed. Please try again.";
    let status = msg.includes("No account found") || msg.includes("Incorrect password")
      ? 401
      : msg.includes("verify your email") ||
        msg.includes("verify OTP") ||
        msg.includes("pending admin approval") ||
        msg.includes("pending super admin approval") ||
        msg.includes("rejected")
      ? 403
      : 400;

    // Hide internal DB/Mongoose errors from the client
    if (msg.includes("buffering timed out") || msg.includes("Mongo") || msg.includes("ECONN") || error.name === "MongooseError") {
      msg = "We are currently experiencing technical difficulties. Please try again later.";
      status = 500;
    }

    res.status(status).json({
      success: false,
      message: msg,
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const result = await verifyEmailOtp(email, otp);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "OTP verification failed.",
    });
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await resendVerificationEmail(email);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    const msg = error.message || "Could not resend verification email.";
    const status = msg.includes("already verified") ? 409 : msg.includes("No account found") ? 404 : 400;
    res.status(status).json({
      success: false,
      message: msg,
    });
  }
};

export const sendSuperAdminLoginOtpController = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await sendSuperAdminLoginOtp(email);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to send super admin login OTP.",
    });
  }
};

export const verifySuperAdminLoginOtpController = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const result = await verifySuperAdminLoginOtp(email, otp);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to verify super admin login OTP.",
    });
  }
};

/*
  Get Teachers Controller (Admin Only)
*/
export const getTeachers = async (req, res) => {
  try {
    const teachers = await getAllTeachers(req.user);
    res.status(200).json({
      success: true,
      message: "Teachers fetched successfully",
      data: teachers,
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error.message || "Failed to fetch teachers.",
    });
  }
};

export const getPendingTeacherApplicationsController = async (req, res) => {
  try {
    const teachers = await getPendingTeacherApplications(req.user);
    res.status(200).json({
      success: true,
      message: "Pending teacher applications fetched successfully (Super Admin review queue)",
      data: teachers,
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error.message || "Failed to fetch pending teacher applications for Super Admin.",
    });
  }
};

export const reviewTeacherApplicationController = async (req, res) => {
  try {
    const { action, reason } = req.body;
    const result = await reviewTeacherApplication(req.params.id, action, reason, req.user);
    res.status(200).json({
      success: true,
      message: `Teacher application ${result.approvalStatus}.`,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to review teacher application by Super Admin.",
    });
  }
};

export const getReviewedTeacherApplicationsController = async (req, res) => {
  try {
    const teachers = await getReviewedTeacherApplications(req.user);
    res.status(200).json({
      success: true,
      message: "Reviewed teacher applications fetched successfully (Super Admin)",
      data: teachers,
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error.message || "Failed to fetch reviewed teacher applications for Super Admin.",
    });
  }
};

export const getPendingAdminRequestsController = async (req, res) => {
  try {
    const admins = await getPendingAdminRequests(req.user);
    res.status(200).json({
      success: true,
      message: "Pending admin requests fetched successfully",
      data: admins,
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error.message || "Failed to fetch pending admin requests.",
    });
  }
};

export const reviewAdminRequestController = async (req, res) => {
  try {
    const { action, reason } = req.body;
    const result = await reviewAdminRequest(req.params.id, action, reason, req.user);
    res.status(200).json({
      success: true,
      message: `Admin access ${result.adminAccessStatus}.`,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to review admin request.",
    });
  }
};

export const getReviewedAdminRequestsController = async (req, res) => {
  try {
    const admins = await getReviewedAdminRequests(req.user);
    res.status(200).json({
      success: true,
      message: "Reviewed admin requests fetched successfully",
      data: admins,
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error.message || "Failed to fetch reviewed admin requests.",
    });
  }
};

/*
  Assign Semester to Teacher (Admin Only)
*/
import AcademicRecord from "../models/academicRecord.model.js";
import User from "../models/user.model.js";
import TeacherAssignment from "../models/teacherAssignment.model.js";
import {
  ALLOWED_SECTIONS,
  ALLOWED_SUBJECTS,
  isAllowedSemester,
  normalizeSection,
  normalizeSubject,
} from "../config/academic.config.js";

export const assignSemesterToTeacher = async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { semester, section, subject } = req.body;
    
    if (!semester || !section || !subject) {
      return res.status(400).json({ success: false, message: "Semester, section and subject are required." });
    }
    if (!isAllowedSemester(semester)) {
      return res.status(400).json({ success: false, message: "Only Semester 1 is enabled for now." });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    const normalizedSection = normalizeSection(section);
    const normalizedSubject = normalizeSubject(subject);
    if (!ALLOWED_SECTIONS.includes(normalizedSection)) {
      return res.status(400).json({ success: false, message: `Section must be one of: ${ALLOWED_SECTIONS.join(", ")}` });
    }
    if (!ALLOWED_SUBJECTS.includes(normalizedSubject)) {
      return res.status(400).json({ success: false, message: `Subject must be one of: ${ALLOWED_SUBJECTS.join(", ")}` });
    }

    const assignedExists = await TeacherAssignment.findOne({
      semester: Number(semester),
      section: normalizedSection,
      subject: normalizedSubject,
    });
    if (assignedExists && assignedExists.teacherId.toString() !== teacherId) {
      return res.status(409).json({
        success: false,
        message: "This semester-section-subject is already assigned to another teacher.",
      });
    }

    await TeacherAssignment.findOneAndUpdate(
      {
        teacherId,
        semester: Number(semester),
        section: normalizedSection,
        subject: normalizedSubject,
      },
      {
        teacherId,
        semester: Number(semester),
        section: normalizedSection,
        subject: normalizedSubject,
        assignedBy: req.user.id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await AcademicRecord.updateMany(
      { semester: Number(semester), section: normalizedSection },
      { $set: { teacherId } }
    );

    res.status(200).json({
      success: true,
      message: `Assigned Semester ${semester}, Section ${normalizedSection}, Subject ${normalizedSubject} to ${teacher.name}.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to assign semester.",
    });
  }
};

export const getTeacherAssignments = async (req, res) => {
  try {
    const teacherId = req.params.id;
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    const assignments = await TeacherAssignment.find({ teacherId })
      .sort({ semester: 1, section: 1, subject: 1 })
      .lean();

    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch assignments." });
  }
};