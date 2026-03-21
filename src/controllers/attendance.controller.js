import {
  submitAttendance,
  getSectionAttendance,
  getStudentAttendanceByRegistration,
  getSectionStudents,
  getTeacherOverview,
  getAdminOverview,
} from "../services/attendance.service.js";

/*
  Submit Attendance
*/
export const submitAttendanceController = async (req, res) => {
  try {
    const result = await submitAttendance(
      req.body,
      req.user
    );

    res.status(201).json({
      success: true,
      message: "Attendance submitted successfully",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*
  Get Section Attendance
*/
export const getSectionAttendanceController = async (
  req,
  res
) => {
  try {
    const result = await getSectionAttendance(
      req.query,
      req.user
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*
  Get Student Attendance By Registration
*/
export const getStudentAttendanceController = async (
  req,
  res
) => {
  try {
    const result =
      await getStudentAttendanceByRegistration(
        req.query.registrationNumber,
        req.user
      );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*
  Get students for a section (Teacher/Admin)
*/
export const getSectionStudentsController = async (req, res) => {
  try {
    const result = await getSectionStudents(req.query, req.user);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*
  Teacher dashboard overview
*/
export const getTeacherOverviewController = async (req, res) => {
  try {
    const result = await getTeacherOverview(req.user);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*
  Admin dashboard overview
*/
export const getAdminOverviewController = async (req, res) => {
  try {
    const result = await getAdminOverview(req.user);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};