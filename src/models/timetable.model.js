import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema(
  {
    semester: { type: Number, required: true, min: 1, max: 8 },
    section: { type: String, required: true, uppercase: true, trim: true },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    periodNumber: { type: Number, required: true, min: 1, max: 12 },
    subject: { type: String, required: true, trim: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

timetableSchema.index(
  { semester: 1, section: 1, dayOfWeek: 1, periodNumber: 1 },
  { unique: true }
);

const Timetable = mongoose.model("Timetable", timetableSchema);

export default Timetable;
