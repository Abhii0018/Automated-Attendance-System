import { body, param, validationResult } from "express-validator";

/*
  Create Student Validation
*/
export const createStudentValidator = [
  body("name")
    .notEmpty()
    .withMessage("Student name is required"),

  body("department")
    .notEmpty()
    .withMessage("Department is required"),

  body("parentEmail")
    .isEmail()
    .withMessage("Valid parent email required"),

  body("parentPhone")
    .isLength({ min: 10 })
    .withMessage("Valid parent phone required"),
];

/*
  Mongo ID validation
*/
export const idValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid Mongo ID"),
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