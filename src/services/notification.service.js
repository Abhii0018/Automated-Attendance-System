import twilio from "twilio";
import nodemailer from "nodemailer";

// ─── Twilio (SMS) ────────────────────────────────────────────────────────────
let twilioClient = null;

const getTwilioClient = () => {
  if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH) {
    console.warn("⚠️  Twilio credentials missing — SMS disabled");
    return null;
  }
  if (!twilioClient) {
    twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
  }
  return twilioClient;
};

export const sendAbsenceSMS = async (phone, studentName) => {
  try {
    const client = getTwilioClient();
    if (!client) return { success: false, error: "Twilio not configured" };
    if (!phone) return { success: false, error: "Phone number missing" };

    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

    const message = await client.messages.create({
      body: `Dear Parent, your child ${studentName} was marked ABSENT today (${new Date().toLocaleDateString("en-IN")}). Please ensure timely attendance. — AttendX`,
      from: process.env.TWILIO_PHONE,
      to: formattedPhone,
    });

    console.log(`✅ SMS Sent | SID: ${message.sid} | To: ${formattedPhone}`);
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error(`❌ SMS Failed | Phone: ${phone} | Error: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// ─── Nodemailer (Email) ──────────────────────────────────────────────────────
let emailTransporter = null;

const getEmailTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️  Email credentials missing — Email notifications disabled");
    return null;
  }
  if (!emailTransporter) {
    emailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,   // Gmail App Password (not your real password)
      },
    });
  }
  return emailTransporter;
};

/**
 * Send absence notification email to parent.
 * @param {string} parentEmail  - Parent's email address
 * @param {string} studentName  - Student's full name
 * @param {string} section      - Section (e.g. "PA")
 * @param {number} semester     - Semester number
 */
export const sendAbsenceEmail = async (parentEmail, studentName, section = "", semester = "") => {
  try {
    const transporter = getEmailTransporter();
    if (!transporter) return { success: false, error: "Email not configured" };
    if (!parentEmail) return { success: false, error: "Parent email missing" };

    const today = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const mailOptions = {
      from: `"AttendX System" <${process.env.EMAIL_USER}>`,
      to: parentEmail,
      subject: `⚠️ Absence Alert: ${studentName} was absent today`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f6fa; padding: 24px; border-radius: 12px;">
          <div style="background: #0a1628; border-radius: 10px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: #c9a84c; margin: 0; font-size: 24px;">📋 AttendX</h1>
            <p style="color: rgba(255,255,255,0.6); margin: 6px 0 0; font-size: 13px;">Automated Attendance System</p>
          </div>

          <div style="background: #fff; border-radius: 10px; padding: 28px; border: 1px solid #dde3ef;">
            <h2 style="color: #dc2626; margin: 0 0 16px; font-size: 18px;">⚠️ Absence Notification</h2>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">Dear Parent / Guardian,</p>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              We regret to inform you that your child <strong style="color: #0a1628;">${studentName}</strong>
              was marked <strong style="color: #dc2626;">ABSENT</strong> today.
            </p>
            <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <table style="width: 100%; font-size: 14px; color: #374151;">
                <tr><td style="padding: 4px 0; font-weight: 600; width: 130px;">Student Name:</td><td>${studentName}</td></tr>
                ${section ? `<tr><td style="padding: 4px 0; font-weight: 600;">Section:</td><td>${section}</td></tr>` : ""}
                ${semester ? `<tr><td style="padding: 4px 0; font-weight: 600;">Semester:</td><td>${semester}</td></tr>` : ""}
                <tr><td style="padding: 4px 0; font-weight: 600;">Date:</td><td>${today}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600;">Status:</td><td style="color: #dc2626; font-weight: 700;">Absent</td></tr>
              </table>
            </div>
            <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
              Please ensure regular attendance. If you have any questions, kindly contact the school administration.
            </p>
            <p style="color: #374151; font-size: 15px; margin-top: 20px;">Thank you,<br><strong>AttendX — School Administration</strong></p>
          </div>

          <p style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 16px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email Sent | To: ${parentEmail} | MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Email Failed | To: ${parentEmail} | Error: ${error.message}`);
    return { success: false, error: error.message };
  }
};
