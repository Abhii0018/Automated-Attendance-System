import express from "express";
import {
  createStudentController,
  getAllStudentsController,
  // getStudentByIdController,
  getStudentByRegistrationController,
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

router.post(
  "/",
  protect,
  authorize("Admin"),
  createStudentValidator,
  validate,
  createStudentController
);

router.get("/", protect, getAllStudentsController);

router.get(
  "/:id",
  protect,
  idValidator,
  validate,
  getStudentByRegistrationController
  // getStudentByIdController
);

router.delete(
  "/:id",
  protect,
  authorize("Admin"),
  idValidator,
  validate,
  deleteStudentController
);

export default router;