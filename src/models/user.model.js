import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      enum: ["admin", "teacher","student"],
      default: "student",
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    adminAccessStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    adminRequestedAt: {
      type: Date,
      default: null,
    },
    adminApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    adminApprovedAt: {
      type: Date,
      default: null,
    },
    adminRejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
    superAdminLoginOtpHash: {
      type: String,
      default: null,
    },
    superAdminLoginOtpExpires: {
      type: Date,
      default: null,
    },
    superAdminOtpVerifiedAt: {
      type: Date,
      default: null,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    department: {
      type: String,
      default: "",
      trim: true,
    },
    designation: {
      type: String,
      default: "",
      trim: true,
    },
    adminAccessReason: {
      type: String,
      default: "",
      trim: true,
    },
    teacherId: {
    type: String,
    unique: true,
    sparse: true
    },
    age: {
      type: Number,
      default: null,
      min: 3,
      max: 120,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
      default: "",
    },
    parentName: {
      type: String,
      default: "",
      trim: true,
    },
    parentRelation: {
      type: String,
      default: "",
      trim: true,
    },
    parentEmail: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },
    parentPhone: {
      type: String,
      default: "",
      trim: true,
    },
    primarySubject: {
      type: String,
      default: "",
      trim: true,
    },
    secondarySubject: {
      type: String,
      default: "",
      trim: true,
    },
    yearsOfExperience: {
      type: Number,
      default: 0,
      min: 0,
      max: 60,
    },
    highestQualification: {
      type: String,
      default: "",
      trim: true,
    },
    educationalBackground: {
      type: String,
      default: "",
      trim: true,
    },
    hasExperience: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;