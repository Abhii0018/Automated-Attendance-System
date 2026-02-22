import Student from "../models/student.model.js";
import Counter from "../models/counter.model.js";

/*
  Create Student (Admin Only)
*/
export const createStudent = async (data, currentUser) => {
  if (currentUser.role !== "Admin") {
    throw new Error("Only Admin can create students");
  }

  try {
    const admissionYear = new Date().getFullYear();

    const counter = await Counter.findOneAndUpdate(
      { admissionYear },
      { $inc: { sequence: 1 } },
      { returnDocument: "after", upsert: true }
    );

    const yearSuffix = String(admissionYear).slice(-2);
    const prefix = `1${yearSuffix}`;
    const paddedSequence = String(counter.sequence).padStart(5, "0");
    const registrationNumber = `${prefix}${paddedSequence}`;

    const student = await Student.create({
      ...data,
      admissionYear,
      registrationNumber,
      createdBy: currentUser.id,
    });

    return student;

  } catch (error) {
    if (error.code === 11000) {
      throw new Error("Duplicate registration number");
    }
    throw error;
  }
};

//get student using registration number
export const getStudentByRegistration = async (
  registrationNumber,
  currentUser
) => {
  if (currentUser.role !== "Admin") {
    throw new Error("Only Admin can view student details");
  }

  const student = await Student.findOne({ registrationNumber });

  if (!student) {
    throw new Error("Student not found");
  }

  return student;
};

/*
  Get All Students (Admin Only)
*/
export const getAllStudents = async (currentUser) => {
  if (currentUser.role !== "Admin") {
    throw new Error("Only Admin can view students");
  }

  return await Student.find().sort({ createdAt: -1 });
};

/*
  Delete Student (Admin Only)
*/
export const deleteStudent = async (id, currentUser) => {
  if (currentUser.role !== "Admin") {
    throw new Error("Only Admin can delete students");
  }

  const student = await Student.findByIdAndDelete(id);

  if (!student) {
    throw new Error("Student not found");
  }

  return student;
};