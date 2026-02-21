import express from "express";
import { register, login } from "../controllers/auth.controller.js";
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

export default router;