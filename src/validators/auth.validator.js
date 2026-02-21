import { body, validationResult } from "express-validator";

/*
  Register Validation Rules
*/
export const registerValidator = [
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .trim(),

  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number"),
];

/*
  Login Validation Rules
*/
export const loginValidator = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

/*
  Middleware to Handle Validation Errors  // this is custom middleware
*/
export const validate = (req, res, next) => {
  const errors = validationResult(req);    // all the error will be stored in validate

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  next();    //if there will be no error then it will go ahead for another moddleware
};