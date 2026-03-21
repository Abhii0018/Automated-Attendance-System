import mongoose from "mongoose";

/**
 * Admin profile — stored in the "admins" collection.
 * Linked 1-to-1 with User via userId.
 */
const adminSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, lowercase: true },
        department: { type: String, default: "Administration" },
        permissions: {
            type: [String],
            default: ["manage_students", "manage_teachers", "view_reports"],
        },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
