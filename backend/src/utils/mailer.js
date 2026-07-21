import nodemailer from "nodemailer";

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendStudentInvitationEmail({ to, studentName, companyName, driveName, examDate, examTime, password, activationLink }) {
  if (!hasSmtpConfig()) {
    return { status: "smtp_not_configured" };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `${companyName} hiring drive invitation - ${driveName}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2>Synthora Assessment Invitation</h2>
        <p>Hello ${studentName || "Student"},</p>
        <p>You are invited for <strong>${driveName}</strong> by <strong>${companyName}</strong>.</p>
        <p><strong>Exam Date:</strong> ${examDate}<br/><strong>Exam Time:</strong> ${examTime}</p>
        <p>Your login details:</p>
        <p><strong>Email:</strong> ${to}<br/><strong>Password:</strong> ${password}</p>
        <p>Your unique activation link opens 10 minutes before the exam:</p>
        <p><a href="${activationLink}">${activationLink}</a></p>
      </div>
    `,
  });

  return { status: "sent" };
}
