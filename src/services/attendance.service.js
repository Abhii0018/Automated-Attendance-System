import Attendance from "../models/attendance.model.js";
import AcademicRecord from "../models/academicRecord.model.js";
import Student from "../models/student.model.js";
import User from "../models/user.model.js";
import TeacherAssignment from "../models/teacherAssignment.model.js";
import TeacherAttendance from "../models/teacherAttendance.model.js";
import Timetable from "../models/timetable.model.js";
import ParentNotificationLog from "../models/parentNotificationLog.model.js";
import { sendDailyAbsenceSummaryEmail } from "./notification.service.js";
import {
  ALLOWED_SECTIONS,
  ALLOWED_SUBJECTS,
  isAllowedSemester,
  normalizeSection,
  normalizeSubject,
} from "../config/academic.config.js";

/*
  Submit Section Attendance
*/
export const submitAttendance = async (data, currentUser) => {
  const role = currentUser.role?.toLowerCase();
  if (role !== "teacher" && role !== "admin") {
    throw new Error("Not authorized to submit attendance");
  }

  const { semester, section, subject, periodNumber, attendanceList } = data;
  const semesterNumber = Number(semester);
  const period = Number(periodNumber);
  const normalizedSection = normalizeSection(section);
  const normalizedSubject = normalizeSubject(subject);

  if (!normalizedSubject) {
    throw new Error("Subject is required");
  }
  if (!isAllowedSemester(semesterNumber)) {
    throw new Error("Only Semester 1 is enabled for now.");
  }
  if (!ALLOWED_SECTIONS.includes(normalizedSection)) {
    throw new Error(`Section must be one of: ${ALLOWED_SECTIONS.join(", ")}`);
  }
  if (!ALLOWED_SUBJECTS.includes(normalizedSubject)) {
    throw new Error(`Subject must be one of: ${ALLOWED_SUBJECTS.join(", ")}`);
  }
  if (!period || period < 1 || period > 12) {
    throw new Error("Valid period number is required");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const records = await AcademicRecord.find({
    semester: semesterNumber,
    section: normalizedSection,
  });

  if (!records.length) {
    throw new Error("No students found for this section");
  }

  if (role === "teacher") {
    const assignment = await TeacherAssignment.findOne({
      teacherId: currentUser.id,
      semester: semesterNumber,
      section: normalizedSection,
      subject: normalizedSubject,
    });
    if (!assignment) {
      throw new Error("You are not assigned to this semester-section-subject.");
    }

    const dayOfWeek = new Date().getDay();
    const slot = await Timetable.findOne({
      semester: semesterNumber,
      section: normalizedSection,
      dayOfWeek,
      periodNumber: period,
      subject: normalizedSubject,
      teacherId: currentUser.id,
    });
    if (!slot) {
      throw new Error("This class slot is not in your timetable for today.");
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
    section: normalizedSection,
    subject: normalizedSubject,
    periodNumber: period,
    date: today,
  });

  if (existing) {
    throw new Error("Attendance already submitted for today");
  }

  await Attendance.create({
    semester: semesterNumber,
    section: normalizedSection,
    subject: normalizedSubject,
    periodNumber: period,
    date: today,
    attendanceList,
    submittedBy: currentUser.id,
  });

  const absentStudents = attendanceList.filter((s) => s.status === "Absent");

  return {
    totalStudents: records.length,
    totalPresent: records.length - absentStudents.length,
    totalAbsent: absentStudents.length,
  };
};

export const sendDailyAbsenceSummaries = async (dateInput, currentUser) => {
  const role = currentUser.role?.toLowerCase();
  if (role !== "admin") throw new Error("Only Admin can send daily summaries");

  const targetDate = dateInput ? new Date(dateInput) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const docs = await Attendance.find({
    date: { $gte: targetDate, $lt: nextDate },
  }).lean();

  const absenceMap = new Map();
  docs.forEach((doc) => {
    doc.attendanceList.forEach((row) => {
      if (row.status !== "Absent") return;
      const key = row.studentId.toString();
      const list = absenceMap.get(key) || [];
      list.push({
        subject: doc.subject,
        periodNumber: doc.periodNumber,
        section: doc.section,
      });
      absenceMap.set(key, list);
    });
  });

  if (absenceMap.size === 0) return { sent: 0, skipped: 0 };

  const students = await Student.find({ _id: { $in: Array.from(absenceMap.keys()) } }).lean();
  const studentMap = new Map(students.map((s) => [s._id.toString(), s]));

  let sent = 0;
  let skipped = 0;
  const dateLabel = targetDate.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  for (const [studentId, absences] of absenceMap.entries()) {
    const student = studentMap.get(studentId);
    if (!student || !student.parentEmail) {
      skipped += 1;
      continue;
    }

    const already = await ParentNotificationLog.findOne({ studentId, date: targetDate });
    if (already) {
      skipped += 1;
      continue;
    }

    const mailResult = await sendDailyAbsenceSummaryEmail(
      student.parentEmail,
      student.name,
      absences,
      dateLabel
    );

    if (mailResult.success) {
      await ParentNotificationLog.create({
        studentId,
        date: targetDate,
        subjects: absences.map((a) => a.subject),
      });
      sent += 1;
    } else {
      skipped += 1;
    }
  }

  return { sent, skipped };
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
    throw new Error("Student profile is not linked yet. Please contact admin.");
  }

  const assignedRecord = await AcademicRecord.findOne({ studentId: student._id });
  if (!assignedRecord) {
    throw new Error("No section is assigned to your profile yet. Please contact admin.");
  }

  const attendanceDocs = await Attendance.find({
    "attendanceList.studentId": student._id,
  })
    .sort({ date: -1 })
    .lean();

  const stats = await calculateAttendanceStats(student._id);

  const subjectMap = new Map();
  const records = [];
  attendanceDocs.forEach((doc) => {
    const entry = doc.attendanceList.find((item) => item.studentId.toString() === student._id.toString());
    if (!entry) return;

    const subject = doc.subject || "General";
    const current = subjectMap.get(subject) || { subject, present: 0, total: 0 };
    current.total += 1;
    if (entry.status === "Present") current.present += 1;
    subjectMap.set(subject, current);

    records.push({
      _id: `${doc._id}-${student._id}`,
      date: doc.date,
      subject,
      status: entry.status,
    });
  });

  const subjectStats = Array.from(subjectMap.values()).map((row) => ({
    ...row,
    percentage: row.total === 0 ? 0 : Number(((row.present / row.total) * 100).toFixed(2)),
  }));

  return {
    studentName: student.name,
    registrationNumber: student.registrationNumber,
    ...stats,
    isLowAttendance: stats.attendancePercentage < 75,
    overallPercentage: stats.attendancePercentage,
    records,
    subjectStats,
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

  const { semester, section, subject, periodNumber, date } = query;
  const semesterNumber = Number(semester);
  const period = Number(periodNumber);
  const normalizedSection = normalizeSection(section);
  const normalizedSubject = normalizeSubject(subject);

  if (!isAllowedSemester(semesterNumber)) {
    throw new Error("Only Semester 1 is enabled for now.");
  }
  if (!ALLOWED_SECTIONS.includes(normalizedSection)) {
    throw new Error(`Section must be one of: ${ALLOWED_SECTIONS.join(", ")}`);
  }
  if (!ALLOWED_SUBJECTS.includes(normalizedSubject)) {
    throw new Error(`Subject must be one of: ${ALLOWED_SUBJECTS.join(", ")}`);
  }

  const selectedDate = new Date(date);
  selectedDate.setHours(0, 0, 0, 0);

  const attendance = await Attendance.findOne({
    semester: semesterNumber,
    section: normalizedSection,
    subject: normalizedSubject,
    periodNumber: period,
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
    section: normalizedSection,
    subject: normalizedSubject,
    periodNumber: period,
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

  const { semester, section, subject } = query;
  const semesterNumber = Number(semester);
  const normalizedSection = normalizeSection(section);
  const normalizedSubject = normalizeSubject(subject);

  if (!isAllowedSemester(semesterNumber)) {
    throw new Error("Only Semester 1 is enabled for now.");
  }
  if (!ALLOWED_SECTIONS.includes(normalizedSection)) {
    throw new Error(`Section must be one of: ${ALLOWED_SECTIONS.join(", ")}`);
  }
  if (!ALLOWED_SUBJECTS.includes(normalizedSubject)) {
    throw new Error(`Subject must be one of: ${ALLOWED_SUBJECTS.join(", ")}`);
  }

  const records = await AcademicRecord.find({
    semester: semesterNumber,
    section: normalizedSection,
  }).populate("studentId");

  if (!records.length) {
    throw new Error("No students found for this section");
  }

  if (role === "teacher") {
    const assignment = await TeacherAssignment.findOne({
      teacherId: currentUser.id,
      semester: semesterNumber,
      section: normalizedSection,
      subject: normalizedSubject,
    });
    if (!assignment) {
      throw new Error("You are not assigned to this semester-section-subject.");
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

  const [assignments, todaysAttendance, allAttendance] = await Promise.all([
    TeacherAssignment.find({ teacherId: currentUser.id }).lean(),
    Attendance.find({ submittedBy: currentUser.id, date: today }).lean(),
    Attendance.find({ submittedBy: currentUser.id })
      .sort({ date: -1 })
      .limit(10)
      .lean(),
  ]);

  const sections = assignments.map((a) => ({
    semester: a.semester,
    section: a.section,
    subject: a.subject,
  }));

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
      subject: doc.subject,
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
    teacherUsers,
    todayTeacherPunches,
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
    User.find({ role: "teacher" }).select("_id name email").lean(),
    TeacherAttendance.find({ date: { $gte: today, $lt: tomorrow } })
      .populate("teacherId", "name email")
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

  const punchMap = new Map(
    todayTeacherPunches.map((row) => [row.teacherId?._id?.toString(), row])
  );

  const teacherPunches = teacherUsers.map((teacher) => {
    const punch = punchMap.get(teacher._id.toString());
    return {
      teacherId: teacher._id,
      teacherName: teacher.name || "Unknown",
      teacherEmail: teacher.email || "",
      checkInAt: punch?.checkInAt || null,
      checkOutAt: punch?.checkOutAt || null,
    };
  });

  return {
    totalStudents,
    totalTeachers,
    totalSections: uniqueSections.length,
    todayPresent,
    todayAbsent,
    submissions,
    teacherPunches,
  };
};

export const getTodayTeacherPunch = async (currentUser) => {
  const role = currentUser.role?.toLowerCase();
  if (role !== "teacher") throw new Error("Only teachers can view punch status");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const record = await TeacherAttendance.findOne({
    teacherId: currentUser.id,
    date: today,
  }).lean();

  return {
    date: today,
    checkInAt: record?.checkInAt || null,
    checkOutAt: record?.checkOutAt || null,
  };
};

export const teacherCheckIn = async (currentUser) => {
  const role = currentUser.role?.toLowerCase();
  if (role !== "teacher") throw new Error("Only teachers can check in");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await TeacherAttendance.findOne({ teacherId: currentUser.id, date: today });
  if (existing?.checkInAt) throw new Error("You have already checked in today.");

  const now = new Date();
  const record = await TeacherAttendance.findOneAndUpdate(
    { teacherId: currentUser.id, date: today },
    { $set: { teacherId: currentUser.id, date: today, checkInAt: now } },
    { upsert: true, new: true }
  );

  return {
    checkInAt: record.checkInAt,
    checkOutAt: record.checkOutAt,
  };
};

export const teacherCheckOut = async (currentUser) => {
  const role = currentUser.role?.toLowerCase();
  if (role !== "teacher") throw new Error("Only teachers can check out");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const record = await TeacherAttendance.findOne({ teacherId: currentUser.id, date: today });
  if (!record || !record.checkInAt) throw new Error("Check-in is required before check-out.");
  if (record.checkOutAt) throw new Error("You have already checked out today.");

  record.checkOutAt = new Date();
  await record.save();

  return {
    checkInAt: record.checkInAt,
    checkOutAt: record.checkOutAt,
  };
};

export const upsertTimetableSlot = async (data, currentUser) => {
  const role = currentUser.role?.toLowerCase();
  if (role !== "admin") throw new Error("Only Admin can manage timetable");

  const { semester, section, dayOfWeek, periodNumber, subject, teacherId } = data;
  if (!semester || !section || dayOfWeek === undefined || !periodNumber || !subject || !teacherId) {
    throw new Error("Semester, section, dayOfWeek, periodNumber, subject and teacherId are required.");
  }

  if (!isAllowedSemester(semester)) {
    throw new Error("Only Semester 1 is enabled for now.");
  }
  const normalizedSection = normalizeSection(section);
  const normalizedSubject = normalizeSubject(subject);
  if (!ALLOWED_SECTIONS.includes(normalizedSection)) {
    throw new Error(`Section must be one of: ${ALLOWED_SECTIONS.join(", ")}`);
  }
  if (!ALLOWED_SUBJECTS.includes(normalizedSubject)) {
    throw new Error(`Subject must be one of: ${ALLOWED_SUBJECTS.join(", ")}`);
  }

  const slot = await Timetable.findOneAndUpdate(
    {
      semester: Number(semester),
      section: normalizedSection,
      dayOfWeek: Number(dayOfWeek),
      periodNumber: Number(periodNumber),
    },
    {
      semester: Number(semester),
      section: normalizedSection,
      dayOfWeek: Number(dayOfWeek),
      periodNumber: Number(periodNumber),
      subject: normalizedSubject,
      teacherId,
    },
    { upsert: true, new: true }
  );

  return slot;
};

export const getTodayTeacherSchedule = async (currentUser) => {
  const role = currentUser.role?.toLowerCase();
  if (role !== "teacher") throw new Error("Only teachers can view schedule");

  const dayOfWeek = new Date().getDay();
  const slots = await Timetable.find({ teacherId: currentUser.id, dayOfWeek })
    .sort({ periodNumber: 1 })
    .lean();

  return slots;
};