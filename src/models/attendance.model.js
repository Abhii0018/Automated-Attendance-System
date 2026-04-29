import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
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
      match: [/^[A-Z]{1,2}$/, "Section must be 1–2 uppercase letters"],
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    periodNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },

    date: {
      type: Date,
      required: true,
    },

    attendanceList: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
          required: true,
        },
        status: {
          type: String,
          enum: ["Present", "Absent"],
          required: true,
        },
      },
    ],

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isFinalized: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);


attendanceSchema.index(
  { semester: 1, section: 1, subject: 1, periodNumber: 1, date: 1 },
  { unique: true }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;