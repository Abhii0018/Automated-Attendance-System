import express from "express";
import {
  createStudentController,
  getAllStudentsController,
  getStudentByRegistrationController,
  deleteStudentController,
  assignSectionController,
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
  authorize("admin"),
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
  authorize("admin"),
  idValidator,
  validate,
  deleteStudentController
);

router.post(
  "/:id/assign-section",
  protect,
  authorize("admin"),
  idValidator,
  validate,
  assignSectionController
);

export default router;