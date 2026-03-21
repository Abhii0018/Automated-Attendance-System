import express from "express";
import { register, login, getTeachers, assignSemesterToTeacher } from "../controllers/auth.controller.js";

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

// Assign Teacher Semester
router.post(
  "/teachers/:id/assign",
  protect,
  authorize("admin"),
  assignSemesterToTeacher
);

export default router;