import express from "express";
import { submitAttendanceController} from "../controllers/attendance.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";

import {getSectionAttendanceController} from "../controllers/attendance.controller.js";

const router = express.Router();

/*
  Mark Attendance
  Only Teacher or Admin
*/
router.post(
  "/",
  protect,
  authorize("Teacher", "Admin"),
  submitAttendanceController
);

router.get(
  "/section",
  protect,
  authorize("Admin"),
  getSectionAttendanceController
);

export default router;