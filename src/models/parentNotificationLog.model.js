import mongoose from "mongoose";

const parentNotificationLogSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    subjects: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

parentNotificationLogSchema.index({ studentId: 1, date: 1 }, { unique: true });

const ParentNotificationLog = mongoose.model("ParentNotificationLog", parentNotificationLogSchema);

export default ParentNotificationLog;
