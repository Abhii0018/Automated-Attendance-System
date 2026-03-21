import express from "express";
import {
  submitAttendanceController,
  getSectionAttendanceController,
  getSectionStudentsController,
  getTeacherOverviewController,
  getAdminOverviewController,
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

export default router;