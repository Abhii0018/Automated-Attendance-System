import Student from "../models/student.model.js";
import Counter from "../models/counter.model.js";
import AcademicRecord from "../models/academicRecord.model.js";
import User from "../models/user.model.js";
import Attendance from "../models/attendance.model.js";
import {
  ALLOWED_SECTIONS,
  isAllowedSemester,
  normalizeSection,
} from "../config/academic.config.js";

const AUTO_SEMESTER = 1;
const FIRST_BATCH_COUNT = 20;
const PRIMARY_SECTION = "PA";
const SECONDARY_SECTION = "PB";

const hasAdminAccess = (currentUser) => {
  const role = currentUser?.role?.toLowerCase();
  // Section assignment and student operations are handled by admin role (approved admins).
  return role === "admin";
};

/*
  Create Student (Admin Only)
*/
export const createStudent = async (data, currentUser) => {
  if (!hasAdminAccess(currentUser)) {
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
    // Keep sequence FCFS but start yearly sequence from 00000
    const paddedSequence = String(Math.max(counter.sequence - 1, 0)).padStart(5, "0");
    const registrationNumber = `${prefix}${paddedSequence}`;

    const student = await Student.create({
      ...data,
      admissionYear,
      registrationNumber,
      createdBy: currentUser.id,
    });

    // Auto section policy:
    // - first 20 admitted students go to PA
    // - after that, balance between PA and PB
    const [paCount, pbCount] = await Promise.all([
      AcademicRecord.countDocuments({ semester: AUTO_SEMESTER, section: PRIMARY_SECTION }),
      AcademicRecord.countDocuments({ semester: AUTO_SEMESTER, section: SECONDARY_SECTION }),
    ]);
    const totalCount = paCount + pbCount;
    const selectedSection =
      totalCount < FIRST_BATCH_COUNT
        ? PRIMARY_SECTION
        : paCount <= pbCount
          ? PRIMARY_SECTION
          : SECONDARY_SECTION;

    const taken = await AcademicRecord.find({
      semester: AUTO_SEMESTER,
      section: selectedSection,
    })
      .select("rollNumber")
      .lean();
    const takenNums = new Set(taken.map((row) => row.rollNumber));
    let rollNumber = 1;
    while (takenNums.has(rollNumber)) rollNumber++;

    await AcademicRecord.create({
      studentId: student._id,
      teacherId: currentUser.id,
      semester: AUTO_SEMESTER,
      section: selectedSection,
      rollNumber,
    });

    return {
      ...student.toObject(),
      assignedSemester: AUTO_SEMESTER,
      assignedSection: selectedSection,
      assignedRollNumber: rollNumber,
    };

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
  if (!hasAdminAccess(currentUser)) {
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
  if (!hasAdminAccess(currentUser)) {
    throw new Error("Only Admin can view students");
  }

  const students = await Student.find().sort({ createdAt: -1 }).lean();
  if (!students.length) return [];

  const studentIds = students.map((s) => s._id);
  const records = await AcademicRecord.find({ studentId: { $in: studentIds } })
    .sort({ createdAt: -1 })
    .lean();

  const latestByStudent = new Map();
  for (const rec of records) {
    const key = String(rec.studentId);
    if (!latestByStudent.has(key)) latestByStudent.set(key, rec);
  }

  return students.map((student) => {
    const rec = latestByStudent.get(String(student._id));
    return {
      ...student,
      section: rec?.section || "",
      semester: rec?.semester ?? null,
      classRollNumber: rec?.rollNumber ?? null,
    };
  });
};

/*
  Delete Student (Admin Only)
*/
export const deleteStudent = async (id, currentUser) => {
  if (!hasAdminAccess(currentUser)) {
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
  if (!hasAdminAccess(currentUser)) {
    throw new Error("Only Admin can assign sections");
  }

  const { semester, section } = data;
  const semesterNumber = Number(semester);
  const normalizedSection = normalizeSection(section);

  if (!isAllowedSemester(semesterNumber)) {
    throw new Error("Only Semester 1 is enabled for now.");
  }
  if (!ALLOWED_SECTIONS.includes(normalizedSection)) {
    throw new Error(`Section must be one of: ${ALLOWED_SECTIONS.join(", ")}`);
  }

  // 1. Confirm student exists
  const student = await Student.findById(studentId);
  if (!student) throw new Error("Student not found");

  // 2. Check if already assigned to this semester/section
  const existing = await AcademicRecord.findOne({ studentId, semester: semesterNumber });
  if (existing) {
    throw new Error(`Student already assigned to Semester ${semester} / Section ${existing.section}`);
  }

  // 3. Check section capacity (max 50)
  const count = await AcademicRecord.countDocuments({ semester: semesterNumber, section: normalizedSection });
  if (count >= 50) {
    throw new Error(`Section ${section} is full (50/50 students). Choose another section.`);
  }

  // 4. Find next available rollNumber
  const taken = await AcademicRecord.find({ semester: semesterNumber, section: normalizedSection })
    .select("rollNumber")
    .lean();
  const takenNums = new Set(taken.map(r => r.rollNumber));
  let rollNumber = 1;
  while (takenNums.has(rollNumber)) rollNumber++;

  // 5. Create AcademicRecord (teacherId defaults to admin for now)
  const record = await AcademicRecord.create({
    studentId,
    teacherId: currentUser.id,
    semester: semesterNumber,
    section: normalizedSection,
    rollNumber,
  });

  return {
    studentId,
    registrationNumber: student.registrationNumber,
    name: student.name,
    semester: semesterNumber,
    section: normalizedSection,
    rollNumber,
  };
};

export const linkStudentUser = async (studentId, data, currentUser) => {
  if (!hasAdminAccess(currentUser)) {
    throw new Error("Only Admin can link student users");
  }

  const { email } = data;
  if (!email || !email.trim()) {
    throw new Error("Student account email is required.");
  }

  const student = await Student.findById(studentId);
  if (!student) throw new Error("Student not found");
  if (student.userId) throw new Error("This student is already linked to a user.");

  const user = await User.findOne({ email: email.toLowerCase().trim(), role: "student" });
  if (!user) throw new Error("No verified student account found with this email.");
  if (!user.isEmailVerified) throw new Error("Student email is not verified yet.");

  const existingLinked = await Student.findOne({ userId: user._id });
  if (existingLinked) {
    throw new Error("This user is already linked to another student.");
  }

  student.userId = user._id;
  student.isRegistered = true;
  if (!student.parentEmail && user.parentEmail) student.parentEmail = user.parentEmail;
  if (!student.parentPhone && user.parentPhone) student.parentPhone = user.parentPhone;
  await student.save();

  return {
    studentId: student._id,
    registrationNumber: student.registrationNumber,
    linkedEmail: user.email,
    linkedUserId: user._id,
  };
};

export const getMyStudentProfile = async (currentUser) => {
  const role = currentUser.role?.toLowerCase();
  if (role !== "student") throw new Error("Only students can view this profile.");

  const student = await Student.findOne({ userId: currentUser.id });
  if (!student) throw new Error("Your student profile is not linked yet. Contact admin.");

  const latestRecord = await AcademicRecord.findOne({ studentId: student._id }).sort({ createdAt: -1 }).lean();
  const attendanceDocs = await Attendance.find({ "attendanceList.studentId": student._id }).lean();

  let totalClasses = 0;
  let totalPresent = 0;
  attendanceDocs.forEach((doc) => {
    const entry = doc.attendanceList.find((row) => row.studentId.toString() === student._id.toString());
    if (entry) {
      totalClasses += 1;
      if (entry.status === "Present") totalPresent += 1;
    }
  });

  const attendancePercentage = totalClasses === 0 ? 0 : Number(((totalPresent / totalClasses) * 100).toFixed(2));

  return {
    name: student.name,
    email: currentUser.email,
    registrationNumber: student.registrationNumber,
    rollNumber: latestRecord?.rollNumber ?? null,
    semester: latestRecord?.semester ?? null,
    section: latestRecord?.section ?? null,
    phone: student.parentPhone || "",
    joinedAt: student.createdAt,
    attendancePercentage,
  };
};