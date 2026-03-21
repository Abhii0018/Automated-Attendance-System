import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
    },
    admissionYear: {
      type: Number,
      required: true,
    },
    parentEmail: {
      type: String,
      required: true,
    },
    parentPhone: {
      type: String,
      required: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,   // optional — set when student self-registers
      sparse: true,      // allows multiple documents with no userId
      unique: true,
    },
    isRegistered: {
      type: Boolean,
      default: false,
    },


  },
  { timestamps: true }
);

const Student = mongoose.model("Student", studentSchema);

export default Student;