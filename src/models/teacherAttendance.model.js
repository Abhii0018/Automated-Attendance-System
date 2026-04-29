import mongoose from "mongoose";

const teacherAttendanceSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    checkInAt: {
      type: Date,
      default: null,
    },
    checkOutAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

teacherAttendanceSchema.index({ teacherId: 1, date: 1 }, { unique: true });

const TeacherAttendance = mongoose.model("TeacherAttendance", teacherAttendanceSchema);

export default TeacherAttendance;
