import mongoose from "mongoose";

/**
 * Teacher profile — stored in the "teachers" collection.
 * Linked 1-to-1 with User via userId.
 */
const teacherSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        teacherId: {
            type: String,
            unique: true,
            sparse: true,
        },
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, lowercase: true },
        department: { type: String, default: "" },
        qualification: { type: String, default: "" },
        assignedSections: [
            {
                semester: Number,
                section: String,
                subject: String,
            },
        ],
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const Teacher = mongoose.model("Teacher", teacherSchema);
export default Teacher;
