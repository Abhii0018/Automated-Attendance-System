import Attendance from "../models/attendance.model.js";
import AcademicRecord from "../models/academicRecord.model.js";
import Student from "../models/student.model.js";
import User from "../models/user.model.js";
import { sendAbsenceSMS, sendAbsenceEmail } from "./notification.service.js";

/*
  Submit Section Attendance
*/
export const submitAttendance = async (data, currentUser) => {
  const role = currentUser.role?.toLowerCase();
  if (role !== "teacher" && role !== "admin") {
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

  if (role === "teacher") {
    const isAssigned = records.some(r => r.teacherId?.toString() === currentUser.id.toString());
    if (!isAssigned) {
      throw new Error("You are not assigned to this section.");
    }
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

  // ── Dispatch Notifications in Background (Fire and forget) ──
  Promise.all(
    absentStudentDetails.map(student => {
      const notifications = [];
      
      // 1. Queue SMS
      if (student.parentPhone) {
        notifications.push(sendAbsenceSMS(student.parentPhone, student.name));
      }
      
      // 2. Queue Email
      if (student.parentEmail) {
        notifications.push(sendAbsenceEmail(
          student.parentEmail, 
          student.name, 
          section, 
          semesterNumber
        ));
      }
      
      return Promise.all(notifications);
    })
  ).catch(error => {
    console.error("Notification (SMS/Email) background sending failed:", error.message);
  });

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
  const role = currentUser.role?.toLowerCase();
  if (role !== "admin") {
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
  const role = currentUser.role?.toLowerCase();
  if (role !== "student") {
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
  const role = currentUser.role?.toLowerCase();
  if (role !== "admin") {
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

/*
  Get students for a given semester + section (Teacher/Admin)
*/
export const getSectionStudents = async (query, currentUser) => {
  const role = currentUser.role?.toLowerCase();
  if (role !== "teacher" && role !== "admin") {
    throw new Error("Only Teachers or Admins can view section students");
  }

  const { semester, section } = query;
  const semesterNumber = Number(semester);

  const records = await AcademicRecord.find({
    semester: semesterNumber,
    section,
  }).populate("studentId");

  if (!records.length) {
    throw new Error("No students found for this section");
  }

  if (role === "teacher") {
    const isAssigned = records.some(r => r.teacherId?.toString() === currentUser.id.toString());
    if (!isAssigned) {
      throw new Error("You are not assigned to this section.");
    }
  }

  return records.map((record) => ({
    studentId: record.studentId._id,
    name: record.studentId.name,
    registrationNumber: record.studentId.registrationNumber,
    rollNumber: record.rollNumber,
  }));
};

/*
  Teacher dashboard overview (sections, stats, today status, recent history)
*/
export const getTeacherOverview = async (currentUser) => {
  const role = currentUser.role?.toLowerCase();
  if (role !== "teacher") {
    throw new Error("Only Teachers can view their dashboard");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [records, todaysAttendance, allAttendance] = await Promise.all([
    AcademicRecord.find({ teacherId: currentUser.id }).lean(),
    Attendance.find({ submittedBy: currentUser.id, date: today }).lean(),
    Attendance.find({ submittedBy: currentUser.id })
      .sort({ date: -1 })
      .limit(10)
      .lean(),
  ]);

  // Unique assigned sections
  const sectionMap = new Map();
  records.forEach((r) => {
    const key = `${r.semester}-${r.section}`;
    if (!sectionMap.has(key)) {
      sectionMap.set(key, { semester: r.semester, section: r.section });
    }
  });
  const sections = Array.from(sectionMap.values());

  // Stats
  const totalClassesTaken = allAttendance.length;

  let totalStudentsOverall = 0;
  let totalPresentOverall = 0;

  allAttendance.forEach((doc) => {
    const total = doc.attendanceList.length;
    const present = doc.attendanceList.filter(
      (e) => e.status === "Present"
    ).length;

    totalStudentsOverall += total;
    totalPresentOverall += present;
  });

  const averageAttendancePercentage =
    totalStudentsOverall === 0
      ? 0
      : Number(
        ((totalPresentOverall / totalStudentsOverall) * 100).toFixed(2)
      );

  const todayStatus = {
    classesTaken: todaysAttendance.length,
    totalSections: sections.length,
  };

  const history = allAttendance.map((doc) => {
    const total = doc.attendanceList.length;
    const present = doc.attendanceList.filter(
      (e) => e.status === "Present"
    ).length;
    const absent = total - present;

    return {
      id: doc._id,
      date: doc.date,
      semester: doc.semester,
      section: doc.section,
      totalStudents: total,
      present,
      absent,
    };
  });

  return {
    sections,
    stats: {
      totalClassesTaken,
      averageAttendancePercentage,
    },
    todayStatus,
    history,
  };
};

/*
  Admin Dashboard Overview
  Returns real counts + today's summary + recent submissions
*/
export const getAdminOverview = async (currentUser) => {
  const role = currentUser.role?.toLowerCase();
  if (role !== "admin") {
    throw new Error("Only Admin can view this overview");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalStudents,
    totalTeachers,
    uniqueSections,
    todayAttendance,
    recentSubmissions,
  ] = await Promise.all([
    Student.countDocuments(),
    User.countDocuments({ role: "teacher" }),
    AcademicRecord.distinct("section"),
    Attendance.find({ date: { $gte: today, $lt: tomorrow } }).lean(),
    Attendance.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("submittedBy", "name")
      .lean(),
  ]);

  // Today's present/absent totals across all sections
  let todayPresent = 0;
  let todayAbsent = 0;
  todayAttendance.forEach((doc) => {
    doc.attendanceList.forEach((entry) => {
      if (entry.status === "Present") todayPresent++;
      else todayAbsent++;
    });
  });

  // Recent submissions table rows
  const submissions = recentSubmissions.map((doc) => {
    const total = doc.attendanceList.length;
    const present = doc.attendanceList.filter((e) => e.status === "Present").length;
    return {
      id: doc._id,
      teacherName: doc.submittedBy?.name || "Unknown",
      section: doc.section,
      semester: doc.semester,
      date: doc.date,
      createdAt: doc.createdAt,
      present,
      absent: total - present,
      total,
    };
  });

  return {
    totalStudents,
    totalTeachers,
    totalSections: uniqueSections.length,
    todayPresent,
    todayAbsent,
    submissions,
  };
};