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

  body("role")
    .optional()
    .customSanitizer((v) => (typeof v === "string" ? v.toLowerCase() : v))
    .isIn(["teacher", "student", "admin"])
    .withMessage("Role must be teacher, student or admin"),

  body("age")
    .optional()
    .isInt({ min: 3, max: 120 })
    .withMessage("Age must be between 3 and 120"),

  body("gender")
    .optional()
    .customSanitizer((v) => (typeof v === "string" ? v.toLowerCase() : v))
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be male, female or other"),

  body("parentName")
    .optional()
    .trim(),

  body("parentRelation")
    .optional()
    .trim(),

  body("parentEmail")
    .optional()
    .isEmail()
    .withMessage("Parent email must be valid")
    .normalizeEmail(),

  body("parentPhone")
    .optional()
    .isLength({ min: 10, max: 15 })
    .withMessage("Parent phone must be 10-15 digits"),

  body("primarySubject")
    .optional()
    .trim(),

  body("secondarySubject")
    .optional()
    .trim(),

  body("yearsOfExperience")
    .optional()
    .isInt({ min: 0, max: 60 })
    .withMessage("Years of experience must be between 0 and 60"),

  body("highestQualification")
    .optional()
    .trim(),

  body("educationalBackground")
    .optional()
    .trim(),

  body("hasExperience")
    .optional()
    .isBoolean()
    .withMessage("hasExperience must be true or false"),

  body("phone")
    .optional()
    .trim(),

  body("department")
    .optional()
    .trim(),

  body("designation")
    .optional()
    .trim(),

  body("adminAccessReason")
    .optional()
    .trim(),
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