import mongoose from "mongoose";

const teacherAssignmentSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    section: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

teacherAssignmentSchema.index(
  { teacherId: 1, semester: 1, section: 1, subject: 1 },
  { unique: true }
);

teacherAssignmentSchema.index(
  { semester: 1, section: 1, subject: 1 },
  { unique: true }
);

const TeacherAssignment = mongoose.model("TeacherAssignment", teacherAssignmentSchema);

export default TeacherAssignment;
