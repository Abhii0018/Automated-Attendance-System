import express from "express";
import {
  register,
  login,
  getTeachers,
  assignSemesterToTeacher,
  verifyEmail,
  resendVerification,
  getTeacherAssignments,
  getPendingTeacherApplicationsController,
  getReviewedTeacherApplicationsController,
  reviewTeacherApplicationController,
  getPendingAdminRequestsController,
  getReviewedAdminRequestsController,
  reviewAdminRequestController,
  sendSuperAdminLoginOtpController,
  verifySuperAdminLoginOtpController,
} from "../controllers/auth.controller.js";

import { protect } from "../middlewares/auth.middleware.js"; 
import { authorize } from "../middlewares/role.middleware.js";
import {
  registerValidator,
  loginValidator,
  validate,
} from "../validators/auth.validator.js";

const router = express.Router();

/*
  Register Route
*/
router.post(
  "/register",
  registerValidator,
  validate,
  register
);


/*
  Login Route
*/
router.post(
  "/login",
  loginValidator,
  validate,
  login
);

router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/superadmin/send-login-otp", sendSuperAdminLoginOtpController);
router.post("/superadmin/verify-login-otp", verifySuperAdminLoginOtpController);


//for testing

router.get("/protect", protect, (req, res) => {
  res.json({
    success: true,
    message: "You accessed protected route",
    user: req.user,
  });
});

//Test Admin Route

router.get(
  "/admin-test",
  protect,
  authorize("admin"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome Admin",
      user: req.user,
    });
  }
);

// Get All Teachers Dashboard
router.get(
  "/teachers",
  protect,
  authorize("admin"),
  getTeachers
);

router.get(
  "/teachers/pending",
  protect,
  authorize("admin"),
  getPendingTeacherApplicationsController
);

router.post(
  "/teachers/:id/review",
  protect,
  authorize("admin"),
  reviewTeacherApplicationController
);

router.get(
  "/teachers/reviewed",
  protect,
  authorize("admin"),
  getReviewedTeacherApplicationsController
);

router.get(
  "/admins/pending",
  protect,
  authorize("admin"),
  getPendingAdminRequestsController
);

router.post(
  "/admins/:id/review",
  protect,
  authorize("admin"),
  reviewAdminRequestController
);

router.get(
  "/admins/reviewed",
  protect,
  authorize("admin"),
  getReviewedAdminRequestsController
);

// Assign Teacher Semester
router.post(
  "/teachers/:id/assign",
  protect,
  authorize("admin"),
  assignSemesterToTeacher
);

router.get(
  "/teachers/:id/assignments",
  protect,
  authorize("admin"),
  getTeacherAssignments
);

export default router;