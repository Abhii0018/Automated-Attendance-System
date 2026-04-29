import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./src/models/user.model.js";
import Teacher from "./src/models/teacher.model.js";

dotenv.config();

// The new data Map we intended to apply
const updateData = [
  { oldEmail: "rajiv.sharma@school.edu", newName: "Rajiv Sharma", newEmail: "rajiv123@gmail.com", plainPassword: "Rajiv@123" },
  { oldEmail: "priya.mehta@school.edu", newName: "Priya Mehta", newEmail: "priya123@gmail.com", plainPassword: "Priya@123" },
  { oldEmail: "suresh.patel@school.edu", newName: "Suresh Patel", newEmail: "suresh123@gmail.com", plainPassword: "Suresh@123" },
  { oldEmail: "anita.verma@school.edu", newName: "Anita Verma", newEmail: "anita123@gmail.com", plainPassword: "Anita@123" },
  { oldEmail: "deepak.joshi@school.edu", newName: "Deepak Joshi", newEmail: "deepak123@gmail.com", plainPassword: "Deepak@123" },
  { oldEmail: "admin123@gmail.com", newName: "Aniket Tiwari", newEmail: "aniket123@gmail.com", plainPassword: "Aniket@123" },
  { oldEmail: "anikettiwari123@gmail.com", newName: "Rahul Sharma", newEmail: "rahul123@gmail.com", plainPassword: "Rahul@123" },
  { oldEmail: "resham123@gmail.com", newName: "Resham Singh", newEmail: "resham123@gmail.com", plainPassword: "Resham@123" }
];

async function fixUserCredentials() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ DB Connected. Syncing User collection...");

        for (const update of updateData) {
            // Because Teacher doc was already updated, its "email" is now update.newEmail
            // But User doc still has the old email.
            const user = await User.findOne({ email: update.oldEmail });
            
            if (user) {
                const hashedPassword = await bcrypt.hash(update.plainPassword, 10);
                user.name = update.newName;
                user.email = update.newEmail;
                user.password = hashedPassword;
                await user.save();
                console.log(`✅ Synced User login for: ${update.newName} (${update.newEmail})`);
            } else {
                // Wait, if it didn't find oldEmail, maybe it was already synced or doesn't exist?
                console.log(`⚠️ Could not find User with old email: ${update.oldEmail}`);
            }
        }
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
fixUserCredentials();
