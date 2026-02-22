import Attendance from "../models/attendance.model.js";
import AcademicRecord from "../models/academicRecord.model.js";
import Student from "../models/student.model.js";
import { sendAbsenceSMS } from "./notification.service.js";

/*
  Submit Section Attendance
*/
export const submitAttendance = async (data, currentUser) => {
  if (currentUser.role !== "Teacher" && currentUser.role !== "Admin") {
    throw new Error("Not authorized to submit attendance");
  }

  const { semester, section, attendanceList } = data;
  const semesterNumber = Number(semester);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const records = await AcademicRecord.find({
    semester: semesterNumber,
    section,
  });

  if (!records.length) {
    throw new Error("No students found for this section");
  }

  const sectionStudentIds = records.map(r =>
    r.studentId.toString()
  );

  const submittedStudentIds = attendanceList.map(s =>
    s.studentId.toString()
  );

  const isValidSubmission =
    sectionStudentIds.length === submittedStudentIds.length &&
    sectionStudentIds.every(id =>
      submittedStudentIds.includes(id)
    );

  if (!isValidSubmission) {
    throw new Error("Invalid attendance list submitted");
  }

  const existing = await Attendance.findOne({
    semester: semesterNumber,
    section,
    date: today,
  });

  if (existing) {
    throw new Error("Attendance already submitted for today");
  }

  await Attendance.create({
    semester: semesterNumber,
    section,
    date: today,
    attendanceList,
    submittedBy: currentUser.id,
  });

  const absentStudents = attendanceList.filter(
    s => s.status === "Absent"
  );

  const absentStudentDetails = await Student.find({
    _id: { $in: absentStudents.map(s => s.studentId) },
  });

  try {
    await Promise.all(
      absentStudentDetails.map(student => {
        if (student.parentPhone) {
          return sendAbsenceSMS(
            student.parentPhone,
            student.name
          );
        }
      })
    );
  } catch (error) {
    console.error("SMS sending failed:", error.message);
  }

  return {
    totalStudents: records.length,
    totalPresent: records.length - absentStudents.length,
    totalAbsent: absentStudents.length,
  };
};

/*
  Internal Helper — Calculate Attendance Stats
*/
const calculateAttendanceStats = async (studentId) => {
  const attendanceDocs = await Attendance.find({
    "attendanceList.studentId": studentId,
  });

  if (!attendanceDocs.length) {
    return {
      totalClasses: 0,
      totalPresent: 0,
      totalAbsent: 0,
      attendancePercentage: 0,
    };
  }

  let totalClasses = 0;
  let totalPresent = 0;
  let totalAbsent = 0;

  attendanceDocs.forEach(doc => {
    const entry = doc.attendanceList.find(
      item => item.studentId.toString() === studentId.toString()
    );

    if (entry) {
      totalClasses++;
      if (entry.status === "Present") totalPresent++;
      else totalAbsent++;
    }
  });

  const percentage =
    totalClasses === 0
      ? 0
      : Number(((totalPresent / totalClasses) * 100).toFixed(2));

  return {
    totalClasses,
    totalPresent,
    totalAbsent,
    attendancePercentage: percentage,
  };
};

/*
  Get Student Attendance By Registration (Admin Only)
*/
export const getStudentAttendanceByRegistration = async (
  registrationNumber,
  currentUser
) => {
  if (currentUser.role !== "Admin") {
    throw new Error("Only Admin can view student attendance");
  }

  const student = await Student.findOne({ registrationNumber });

  if (!student) {
    throw new Error("Student not found");
  }

  const stats = await calculateAttendanceStats(student._id);

  return {
    studentName: student.name,
    registrationNumber: student.registrationNumber,
    ...stats,
  };
};

//student can check there own attendance
export const getMyAttendance = async (currentUser) => {
  if (currentUser.role !== "Student") {
    throw new Error("Only Students can view their attendance");
  }

  const student = await Student.findOne({
    userId: currentUser.id,
  });

  if (!student) {
    throw new Error("Student record not found");
  }

  const stats = await calculateAttendanceStats(student._id);

  return {
    studentName: student.name,
    registrationNumber: student.registrationNumber,
    ...stats,
    isLowAttendance: stats.attendancePercentage < 75,
  };
};

/*
  Get Section Attendance (Admin Only)
*/
export const getSectionAttendance = async (query, currentUser) => {
  if (currentUser.role !== "Admin") {
    throw new Error("Only Admin can view attendance");
  }

  const { semester, section, date } = query;
  const semesterNumber = Number(semester);

  const selectedDate = new Date(date);
  selectedDate.setHours(0, 0, 0, 0);

  const attendance = await Attendance.findOne({
    semester: semesterNumber,
    section,
    date: selectedDate,
  }).populate("attendanceList.studentId");

  if (!attendance) {
    return {
      message: "Attendance not submitted yet for this date",
    };
  }

  const presentStudents = [];
  const absentStudents = [];

  attendance.attendanceList.forEach(entry => {
    if (entry.status === "Present") {
      presentStudents.push(entry.studentId);
    } else {
      absentStudents.push(entry.studentId);
    }
  });

  return {
    semester: semesterNumber,
    section,
    date: selectedDate,
    totalStudents: attendance.attendanceList.length,
    totalPresent: presentStudents.length,
    totalAbsent: absentStudents.length,
    presentStudents,
    absentStudents,
  };
};