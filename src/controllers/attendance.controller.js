import {
  submitAttendance,
  getSectionAttendance,
  getStudentAttendanceByRegistration,
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