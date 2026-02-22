import twilio from "twilio";

let client = null;

const getTwilioClient = () => {
  if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH) {
    console.warn("⚠️ Twilio credentials missing");
    return null;
  }

  if (!client) {
    client = twilio(
      process.env.TWILIO_SID,
      process.env.TWILIO_AUTH
    );
  }

  return client;
};

export const sendAbsenceSMS = async (phone, studentName) => {
  try {
    const twilioClient = getTwilioClient();

    if (!twilioClient) {
      throw new Error("Twilio client not initialized");
    }

    if (!phone) {
      throw new Error("Phone number is missing");
    }

    const formattedPhone = phone.startsWith("+")
      ? phone
      : `+91${phone}`;

    const message = await twilioClient.messages.create({
      body: `Your child ${studentName} is absent today.`,
      from: process.env.TWILIO_PHONE,
      to: formattedPhone,
    });

    console.log(
      `✅ SMS Sent | SID: ${message.sid} | To: ${formattedPhone}`
    );

    return { success: true, sid: message.sid };

  } catch (error) {
    console.error(
      `❌ SMS Failed | Phone: ${phone} | Error: ${error.message}`
    );

    return { success: false, error: error.message };
  }
};



