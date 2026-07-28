import nodemailer from "nodemailer";

function sanitizeSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");
  const port = Number(process.env.SMTP_PORT || 587);
  const fromAddress = process.env.MAIL_FROM?.trim() || user;
  const fromName = process.env.MAIL_FROM_NAME?.trim() || "Synthora Recruitment";

  return {
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    from: `"${fromName}" <${fromAddress}>`,
    replyTo: process.env.MAIL_REPLY_TO?.trim() || fromAddress,
  };
}

function hasSmtpConfig() {
  const { host, auth } = sanitizeSmtpConfig();
  return Boolean(host && auth.user && auth.pass);
}

export async function sendStudentInvitationEmail({
  to,
  studentName,
  companyName,
  driveName,
  jobRole,
  examDate,
  examTime,
  durationMinutes,
  activationLink,
}) {
  if (!hasSmtpConfig()) {
    return { status: "smtp_not_configured" };
  }

  const { host, port, secure, auth, from, replyTo } = sanitizeSmtpConfig();
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth,
  });

  try {
    const text = [
      `Dear ${studentName || "Student"},`,
      "",
      `You have been invited by ${companyName} to participate in the recruitment process.`,
      "",
      `Company: ${companyName}`,
      `Job Role: ${jobRole}`,
      `Hiring Drive: ${driveName}`,
      "Round: Aptitude Assessment",
      `Exam Date: ${examDate}`,
      `Exam Time: ${examTime}`,
      `Duration: ${durationMinutes} minutes`,
      "",
      "Please open your unique invitation link:",
      activationLink,
      "",
      "This invitation is personal. Do not share this link.",
      "",
      "Regards,",
      "Synthora Recruitment Team",
    ].join("\n");

    const info = await transporter.sendMail({
      from,
      replyTo,
      to,
      subject: `Invitation for Aptitude Assessment - ${companyName}`,
      text,
      headers: {
        "X-Auto-Response-Suppress": "OOF, AutoReply",
      },
      html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <p>Dear ${studentName || "Student"},</p>
        <p>You have been invited by ${companyName} to participate in the recruitment process.</p>
        <p><strong>Company</strong><br/>${companyName}</p>
        <p><strong>Job Role</strong><br/>${jobRole}</p>
        <p><strong>Hiring Drive</strong><br/>${driveName}</p>
        <p><strong>Round</strong><br/>Aptitude Assessment</p>
        <p><strong>Exam Date</strong><br/>${examDate}</p>
        <p><strong>Exam Time</strong><br/>${examTime}</p>
        <p><strong>Duration</strong><br/>${durationMinutes} minutes</p>
        <p>Please use your unique invitation link below.</p>
        <p><a href="${activationLink}">${activationLink}</a></p>
        <p>This invitation is personal.<br/>Do not share this link.</p>
        <p>Regards<br/>Synthora Recruitment Team</p>
      </div>
    `,
    });

    console.log(`Email sent to ${to} via ${host}:${port} (${secure ? "SSL" : "TLS"})`, { messageId: info.messageId });
    return { status: "sent" };
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error?.message || error);
    throw error;
  }
}
