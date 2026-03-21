import Student from "../models/student.model.js";
import Counter from "../models/counter.model.js";
import AcademicRecord from "../models/academicRecord.model.js";

/*
  Create Student (Admin Only)
*/
export const createStudent = async (data, currentUser) => {
  const role = currentUser.role?.toLowerCase();
  if (role !== "admin") {
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
  const role = currentUser.role?.toLowerCase();
  if (role !== "admin") {
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
  const role = currentUser.role?.toLowerCase();
  if (role !== "admin") {
    throw new Error("Only Admin can view students");
  }

  return await Student.find().sort({ createdAt: -1 });
};

/*
  Delete Student (Admin Only)
*/
export const deleteStudent = async (id, currentUser) => {
  const role = currentUser.role?.toLowerCase();
  if (role !== "admin") {
    throw new Error("Only Admin can delete students");
  }

  const student = await Student.findByIdAndDelete(id);

  if (!student) {
    throw new Error("Student not found");
  }

  return student;
};

/*
  Assign Student to Section + Semester  (Admin Only)
  ─────────────────────────────────────────────────
  • Max 50 students per section (rollNumber 1-50)
  • Finds next available rollNumber automatically
  • Creates an AcademicRecord so the student appears in attendance lists
*/
export const assignSection = async (studentId, data, currentUser) => {
  const role = currentUser.role?.toLowerCase();
  if (role !== "admin") {
    throw new Error("Only Admin can assign sections");
  }

  const { semester, section } = data;

  // 1. Confirm student exists
  const student = await Student.findById(studentId);
  if (!student) throw new Error("Student not found");

  // 2. Check if already assigned to this semester/section
  const existing = await AcademicRecord.findOne({ studentId, semester: Number(semester) });
  if (existing) {
    throw new Error(`Student already assigned to Semester ${semester} / Section ${existing.section}`);
  }

  // 3. Check section capacity (max 50)
  const count = await AcademicRecord.countDocuments({ semester: Number(semester), section });
  if (count >= 50) {
    throw new Error(`Section ${section} is full (50/50 students). Choose another section.`);
  }

  // 4. Find next available rollNumber
  const taken = await AcademicRecord.find({ semester: Number(semester), section })
    .select("rollNumber")
    .lean();
  const takenNums = new Set(taken.map(r => r.rollNumber));
  let rollNumber = 1;
  while (takenNums.has(rollNumber)) rollNumber++;

  // 5. Create AcademicRecord (teacherId defaults to admin for now)
  const record = await AcademicRecord.create({
    studentId,
    teacherId: currentUser.id,
    semester: Number(semester),
    section,
    rollNumber,
  });

  return {
    studentId,
    registrationNumber: student.registrationNumber,
    name: student.name,
    semester: Number(semester),
    section,
    rollNumber,
  };
};