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

export async function sendTechnicalAssessmentInvitationEmail({
  to,
  studentName,
  companyName,
  driveName,
  jobRole,
  accessStartsAt,
  accessExpiresAt,
  assessmentLink,
  aptitudeScore,
  codingScore,
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
    const startsAt = new Date(accessStartsAt).toLocaleString();
    const expiresAt = new Date(accessExpiresAt).toLocaleString();
    const hasAptitude = typeof aptitudeScore === "number";
    const hasCoding = typeof codingScore === "number";
    let scoreSummary = "";
    if (hasAptitude && hasCoding) {
      scoreSummary = ` (Aptitude Score: ${aptitudeScore}/100, Coding Score: ${codingScore})`;
    } else if (hasAptitude) {
      scoreSummary = ` (Aptitude Score: ${aptitudeScore}/100)`;
    } else if (hasCoding) {
      scoreSummary = ` (Coding Score: ${codingScore})`;
    }

    const roundText = hasCoding ? "Aptitude and Coding Assessment rounds" : "Aptitude Assessment round";

    const text = [
      `Dear ${studentName || "Student"},`,
      "",
      `Congratulations! You have successfully cleared the ${roundText} for ${companyName}${scoreSummary}.`,
      "",
      `You are invited to participate in the Technical Oral Round (AI Viva).`,
      "",
      `Company: ${companyName}`,
      `Job Role: ${jobRole}`,
      `Hiring Drive: ${driveName}`,
      "Round: Technical Oral Round (AI Viva)",
      `Available From: ${startsAt}`,
      `Available Until: ${expiresAt}`,
      "Duration: 15 minutes",
      "",
      "Please open your unique invitation link below to begin:",
      assessmentLink,
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
      subject: `Invitation for Technical Oral Round (AI Viva) - ${companyName}`,
      text,
      headers: {
        "X-Auto-Response-Suppress": "OOF, AutoReply",
      },
      html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <p>Dear ${studentName || "Student"},</p>
        <p>Congratulations! You have successfully cleared the <strong>${roundText}</strong> for <strong>${companyName}</strong>${scoreSummary ? `${scoreSummary}` : ""}.</p>
        <p>You have qualified for the next round and are invited to take the <strong>Technical Oral Round (AI Viva)</strong>.</p>
        <p><strong>Company</strong><br/>${companyName}</p>
        <p><strong>Job Role</strong><br/>${jobRole}</p>
        <p><strong>Hiring Drive</strong><br/>${driveName}</p>
        <p><strong>Round</strong><br/>Technical Oral Round (AI Viva)</p>
        <p><strong>Available From</strong><br/>${startsAt}</p>
        <p><strong>Available Until</strong><br/>${expiresAt}</p>
        <p><strong>Duration</strong><br/>15 minutes</p>
        <p>Please use your unique invitation link below to begin.</p>
        <p><a href="${assessmentLink}" style="display:inline-block;background:#0284c7;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">Start Technical Oral Round</a></p>
        <p>If the button does not work, open this link:<br/><a href="${assessmentLink}">${assessmentLink}</a></p>
        <p>This invitation is personal.<br/>Do not share this link.</p>
        <p>Regards<br/>Synthora Recruitment Team</p>
      </div>
    `,
    });

    console.log(`Technical oral invitation email sent to ${to} via ${host}:${port} (${secure ? "SSL" : "TLS"})`, { messageId: info.messageId });
    return { status: "sent" };
  } catch (error) {
    console.error(`Failed to send technical assessment email to ${to}:`, error?.message || error);
    throw error;
  }
}

export async function sendAptitudeClearedEmail({
  to,
  studentName,
  companyName,
  driveName,
  jobRole,
  score,
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
      `Congratulations! You have successfully cleared the Aptitude Assessment for ${companyName}${typeof score === "number" ? ` with a score of ${score}/100` : ""}.`,
      "",
      `Company: ${companyName}`,
      `Job Role: ${jobRole}`,
      `Hiring Drive: ${driveName}`,
      "Round: Aptitude Assessment",
      "Status: Cutoff Cleared",
      "",
      "Our recruitment team will review your application and communicate the next steps to your registered email address.",
      "",
      "Regards,",
      "Synthora Recruitment Team",
    ].join("\n");

    const info = await transporter.sendMail({
      from,
      replyTo,
      to,
      subject: `Aptitude Assessment Cleared - ${companyName}`,
      text,
      headers: {
        "X-Auto-Response-Suppress": "OOF, AutoReply",
      },
      html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <p>Dear ${studentName || "Student"},</p>
        <p>Congratulations! You have successfully cleared the Aptitude Assessment for <strong>${companyName}</strong>${typeof score === "number" ? ` with a score of <strong>${score}/100</strong>` : ""}.</p>
        <p><strong>Company</strong><br/>${companyName}</p>
        <p><strong>Job Role</strong><br/>${jobRole}</p>
        <p><strong>Hiring Drive</strong><br/>${driveName}</p>
        <p><strong>Round</strong><br/>Aptitude Assessment</p>
        <p><strong>Status</strong><br/>Cutoff Cleared</p>
        <p>Our recruitment team will review your application and communicate the next steps to your registered email address.</p>
        <p>Regards<br/>Synthora Recruitment Team</p>
      </div>
    `,
    });

    console.log(`Aptitude cleared email sent to ${to} via ${host}:${port} (${secure ? "SSL" : "TLS"})`, { messageId: info.messageId });
    return { status: "sent" };
  } catch (error) {
    console.error(`Failed to send aptitude cleared email to ${to}:`, error?.message || error);
    throw error;
  }
}
