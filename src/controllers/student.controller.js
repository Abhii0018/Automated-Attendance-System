import {
  createStudent,
  getAllStudents,
  getStudentById,
  deleteStudent,
} from "../services/student.service.js";

/*
  Create Student (Admin Only)
*/
export const createStudentController = async (req, res) => {
  try {
    const student = await createStudent(req.body, req.user);

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: student,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*
  Get All Students
*/
export const getAllStudentsController = async (req, res) => {
  try {
    const students = await getAllStudents(req.user);

    res.status(200).json({
      success: true,
      data: students,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*
  Get Single Student
*/
export const getStudentByIdController = async (req, res) => {
  try {
    const student = await getStudentById(req.params.id, req.user);

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

/*
  Delete Student (Admin Only)
*/
export const deleteStudentController = async (req, res) => {
  try {
    await deleteStudent(req.params.id, req.user);

    res.status(200).json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};