import { registerUser, loginUser, getAllTeachers } from "../services/auth.service.js";

/*
  Register Controller
*/
export const register = async (req, res) => {
  try {
    const user = await registerUser(req.body);

    res.status(201).json({
      success: true,
      message: "Account created successfully! Please sign in to continue.",
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
    let status = msg.includes("No account found") || msg.includes("Incorrect password") ? 401 : 400;

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

/*
  Assign Semester to Teacher (Admin Only)
*/
import AcademicRecord from "../models/academicRecord.model.js";
import User from "../models/user.model.js";

export const assignSemesterToTeacher = async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { semester } = req.body;
    
    if (!semester || semester < 1 || semester > 8) {
      return res.status(400).json({ success: false, message: "Invalid semester. Must be between 1 and 8." });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    // Unassign this teacher from any previously assigned sections
    // Assign those back to the Admin
    await AcademicRecord.updateMany(
      { teacherId: teacherId },
      { $set: { teacherId: req.user.id } }
    );

    // Assign the new semester to the teacher
    const updateRes = await AcademicRecord.updateMany(
      { semester: Number(semester) },
      { $set: { teacherId: teacherId } }
    );

    res.status(200).json({
      success: true,
      message: `Assigned Semester ${semester} to ${teacher.name}. (${updateRes.modifiedCount} sections updated)`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to assign semester.",
    });
  }
};