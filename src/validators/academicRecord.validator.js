import { body, validationResult } from "express-validator";

/*
  Create Academic Record Validation
*/
export const createAcademicRecordValidator = [
  body("studentId")
    .isMongoId()
    .withMessage("Valid student ID is required"),

  body("teacherId")
    .isMongoId()
    .withMessage("Valid teacher ID is required"),

  body("semester")
    .isInt({ min: 1, max: 8 })
    .withMessage("Semester must be between 1 and 8"),

  body("section")
  .trim()
  .toUpperCase()
  .matches(/^[A-Z]{2}$/)
  .withMessage("Section must be exactly two letters"),

  body("rollNumber")
    .isInt({ min: 1, max: 50 })
    .withMessage("Roll number must be between 1 and 50"),
];

/*
  Common Validation Handler
*/
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  next();
};