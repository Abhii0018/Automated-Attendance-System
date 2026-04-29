import express from "express";
import {
  submitAttendanceController,
  getSectionAttendanceController,
  getSectionStudentsController,
  getTeacherOverviewController,
  getAdminOverviewController,
  getMyAttendanceController,
  getTeacherPunchTodayController,
  teacherCheckInController,
  teacherCheckOutController,
  sendDailyAbsenceSummariesController,
  upsertTimetableSlotController,
  getTodayTeacherScheduleController,
} from "../controllers/attendance.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";

const router = express.Router();

/*
  Mark Attendance
  Only Teacher or Admin
*/
router.post(
  "/",
  protect,
  authorize("teacher", "admin"),
  submitAttendanceController
);

router.get(
  "/section",
  protect,
  authorize("admin"),
  getSectionAttendanceController
);

// Get students for a section (Teacher/Admin)
router.get(
  "/section/students",
  protect,
  authorize("teacher", "admin"),
  getSectionStudentsController
);

// Teacher dashboard overview
router.get(
  "/teacher/overview",
  protect,
  authorize("teacher"),
  getTeacherOverviewController
);

// Admin dashboard overview
router.get(
  "/admin/overview",
  protect,
  authorize("admin"),
  getAdminOverviewController
);

router.get(
  "/me",
  protect,
  authorize("student"),
  getMyAttendanceController
);

router.get(
  "/teacher/punch/today",
  protect,
  authorize("teacher"),
  getTeacherPunchTodayController
);

router.post(
  "/teacher/punch/check-in",
  protect,
  authorize("teacher"),
  teacherCheckInController
);

router.post(
  "/teacher/punch/check-out",
  protect,
  authorize("teacher"),
  teacherCheckOutController
);

router.post(
  "/admin/notify-daily-absences",
  protect,
  authorize("admin"),
  sendDailyAbsenceSummariesController
);

router.post(
  "/admin/timetable-slot",
  protect,
  authorize("admin"),
  upsertTimetableSlotController
);

router.get(
  "/teacher/schedule/today",
  protect,
  authorize("teacher"),
  getTodayTeacherScheduleController
);

export default router;