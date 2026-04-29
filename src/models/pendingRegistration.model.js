import mongoose from "mongoose";

const pendingRegistrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 8 },
    role: { type: String, enum: ["teacher", "student", "admin"], default: "student" },
    age: { type: Number, default: null, min: 3, max: 120 },
    gender: { type: String, enum: ["male", "female", "other", ""], default: "" },
    parentName: { type: String, default: "", trim: true },
    parentRelation: { type: String, default: "", trim: true },
    parentEmail: { type: String, default: "", lowercase: true, trim: true },
    parentPhone: { type: String, default: "", trim: true },
    primarySubject: { type: String, default: "", trim: true },
    secondarySubject: { type: String, default: "", trim: true },
    yearsOfExperience: { type: Number, default: 0, min: 0, max: 60 },
    highestQualification: { type: String, default: "", trim: true },
    educationalBackground: { type: String, default: "", trim: true },
    hasExperience: { type: Boolean, default: false },
    phone: { type: String, default: "", trim: true },
    department: { type: String, default: "", trim: true },
    designation: { type: String, default: "", trim: true },
    adminAccessReason: { type: String, default: "", trim: true },
    otpHash: { type: String, required: true },
    otpExpires: { type: Date, required: true },
  },
  { timestamps: true }
);

const PendingRegistration = mongoose.model("PendingRegistration", pendingRegistrationSchema);

export default PendingRegistration;
