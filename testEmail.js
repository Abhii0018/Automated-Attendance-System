import dotenv from "dotenv";
import { sendAbsenceEmail } from "./src/services/notification.service.js";

dotenv.config();

async function testEmail() {
  console.log("Testing email notification...");
  
  // Replace this with your actual email address just to test if it arrives in your inbox!
  const myTestEmail = process.env.EMAIL_USER;

  if (!myTestEmail) {
    console.error("❌ Please add EMAIL_USER and EMAIL_PASS to your .env file first!");
    return;
  }

  const result = await sendAbsenceEmail(
    myTestEmail,           // recipient (sending to yourself to test)
    "Student Demo",        // fake student name
    "PA",                  // section
    1                      // semester
  );

  if (result.success) {
    console.log(`\n✅ TEST SUCCESS! Please check the inbox of ${myTestEmail}`);
  } else {
    console.error("\n❌ TEST FAILED:", result.error);
    console.log("Make sure you generated an App Password from your Google Account settings.");
  }
}

testEmail();
