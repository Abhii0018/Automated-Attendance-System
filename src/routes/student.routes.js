import express from "express";
import {
  createStudentController,
  getAllStudentsController,
  getStudentByIdController,
  deleteStudentController,
} from "../controllers/student.controller.js";

import {
  createStudentValidator,
  idValidator,
  validate,
} from "../validators/student.validator.js";

import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";

const router = express.Router();

/*
  Create Student (Admin Only)
*/
router.post(
  "/",
  protect,
  authorize("Admin"),
  createStudentValidator,
  validate,
  createStudentController
);

/*
  Get All Students
  Admin → all students
  Teacher → only assigned students
*/
router.get(
  "/",
  protect,
  getAllStudentsController
);

/*
  Get Single Student
*/
router.get(
  "/:id",
  protect,
  idValidator,
  validate,
  getStudentByIdController
);

/*
  Delete Student (Admin Only)
*/
router.delete(
  "/:id",
  protect,
  authorize("Admin"),
  idValidator,
  validate,
  deleteStudentController
);

export default router;