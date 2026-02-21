import Attendance from "../models/attendance.model.js";
import AcademicRecord from "../models/academicRecord.model.js";
import Student from "../models/student.model.js";

/*
  Submit Section Attendance
*/
export const submitAttendance = async (data, currentUser) => {
  if (currentUser.role !== "Teacher" && currentUser.role !== "Admin") {
    throw new Error("Not authorized to submit attendance");
  }

  const { semester, section, attendanceList } = data;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1️⃣ Get all students of this section
  const records = await AcademicRecord.find({
    semester,
    section,
  }).populate("studentId");

  if (!records.length) {
    throw new Error("No students found for this section");
  }

  // 2️⃣ Validate full submission
  if (attendanceList.length !== records.length) {
    throw new Error("Attendance must be submitted for all students");
  }

  // 3️⃣ Prevent duplicate submission
  const existing = await Attendance.findOne({
    semester,
    section,
    date: today,
  });

  if (existing) {
    throw new Error("Attendance already submitted for today");
  }

  // 4️⃣ Save attendance
  const attendance = await Attendance.create({
    semester,
    section,
    date: today,
    attendanceList,
    submittedBy: currentUser.id,
  });

  // 5️⃣ Identify absent students
  const absentStudents = attendanceList.filter(
    (s) => s.status === "Absent"
  );

  // 6️⃣ Fetch parent details for SMS
  const absentStudentDetails = await Student.find({
    _id: { $in: absentStudents.map((s) => s.studentId) },
  });

  // Simulated SMS sending
  absentStudentDetails.forEach((student) => {
    console.log(
      `SMS to ${student.parentPhone}: Your child ${student.name} is absent today`
    );
  });

  return {
    totalStudents: records.length,
    totalPresent: records.length - absentStudents.length,
    totalAbsent: absentStudents.length,
  };
};

export const getSectionAttendance = async (query, currentUser) => {
  if (currentUser.role !== "Admin") {
    throw new Error("Only Admin can view attendance");
  }

  const { semester, section, date } = query;

  const selectedDate = new Date(date);
  selectedDate.setHours(0, 0, 0, 0);

  const attendance = await Attendance.findOne({
    semester,
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

  attendance.attendanceList.forEach((entry) => {
    if (entry.status === "Present") {
      presentStudents.push(entry.studentId);
    } else {
      absentStudents.push(entry.studentId);
    }
  });

  return {
    semester,
    section,
    date: selectedDate,
    totalStudents: attendance.attendanceList.length,
    totalPresent: presentStudents.length,
    totalAbsent: absentStudents.length,
    presentStudents,
    absentStudents,
  };
};