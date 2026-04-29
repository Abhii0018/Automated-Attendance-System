import {
  submitAttendance,
  getSectionAttendance,
  getStudentAttendanceByRegistration,
  getSectionStudents,
  getTeacherOverview,
  getAdminOverview,
  getMyAttendance,
  getTodayTeacherPunch,
  teacherCheckIn,
  teacherCheckOut,
  sendDailyAbsenceSummaries,
  upsertTimetableSlot,
  getTodayTeacherSchedule,
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

export const getMyAttendanceController = async (req, res) => {
  try {
    const result = await getMyAttendance(req.user);
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

export const getTeacherPunchTodayController = async (req, res) => {
  try {
    const result = await getTodayTeacherPunch(req.user);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const teacherCheckInController = async (req, res) => {
  try {
    const result = await teacherCheckIn(req.user);
    res.status(200).json({ success: true, message: "Checked in successfully", data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const teacherCheckOutController = async (req, res) => {
  try {
    const result = await teacherCheckOut(req.user);
    res.status(200).json({ success: true, message: "Checked out successfully", data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const sendDailyAbsenceSummariesController = async (req, res) => {
  try {
    const { date } = req.body || {};
    const result = await sendDailyAbsenceSummaries(date, req.user);
    res.status(200).json({
      success: true,
      message: "Daily absence summary process completed.",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const upsertTimetableSlotController = async (req, res) => {
  try {
    const result = await upsertTimetableSlot(req.body, req.user);
    res.status(200).json({
      success: true,
      message: "Timetable slot saved successfully.",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTodayTeacherScheduleController = async (req, res) => {
  try {
    const result = await getTodayTeacherSchedule(req.user);
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