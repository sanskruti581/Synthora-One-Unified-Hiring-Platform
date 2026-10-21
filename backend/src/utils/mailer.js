import nodemailer from "nodemailer";

function redactSmtpSecrets(value) {
  let text = String(value ?? "");
  const secretName = /(?:PASS|PASSWORD|SECRET|TOKEN|API[_-]?KEY|MONGO_URI|SMTP_USER)/i;
  const secrets = Object.entries(process.env)
    .filter(([name, secret]) => secretName.test(name) && typeof secret === "string" && secret.length >= 4)
    .flatMap(([, secret]) => [secret, secret.replace(/\s+/g, ""), encodeURIComponent(secret)])
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const secret of secrets) {
    text = text.split(secret).join("[REDACTED]");
  }

  return text.slice(0, 1000);
}

function logMailFailure(error) {
  const safeError = {
    message: redactSmtpSecrets(error?.message || "Unknown SMTP error"),
    code: redactSmtpSecrets(error?.code || ""),
    command: redactSmtpSecrets(error?.command || ""),
    responseCode: error?.responseCode,
    response: redactSmtpSecrets(error?.response || ""),
  };

  console.error("[mailer] Email delivery failed", safeError);

  // Pass only sanitized diagnostics to route-level catch handlers and persistence.
  const sanitizedError = new Error(safeError.message);
  Object.assign(sanitizedError, safeError);
  return sanitizedError;
}

function sanitizeSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");
  const port = Number(process.env.SMTP_PORT || 587);
  const configuredFrom = process.env.MAIL_FROM?.trim();
  const fromAddress = configuredFrom || user;
  const fromName = process.env.MAIL_FROM_NAME?.trim() || "Synthora Recruitment";
  const from = fromAddress?.includes("<")
    ? fromAddress
    : `"${fromName}" <${fromAddress}>`;

  return {
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    from,
    replyTo: process.env.MAIL_REPLY_TO?.trim() || fromAddress,
  };
}

function hasSmtpConfig() {
  const { host, auth } = sanitizeSmtpConfig();
  return Boolean(host && auth.user && auth.pass);
}

function isBrevoSelected() {
  return process.env.EMAIL_PROVIDER?.trim().toLowerCase() === "brevo" || Boolean(process.env.BREVO_API_KEY?.trim());
}

function hasBrevoConfig() {
  return Boolean(process.env.BREVO_API_KEY?.trim() && process.env.MAIL_FROM?.trim());
}

function hasEmailConfig() {
  return isBrevoSelected() ? hasBrevoConfig() : hasSmtpConfig();
}

function parseMailbox(value) {
  if (typeof value !== "string") return value;
  const match = value.trim().match(/^(.*?)\s*<([^<>]+)>$/);
  if (!match) return { email: value.trim() };
  return {
    name: match[1].trim().replace(/^\"|\"$/g, ""),
    email: match[2].trim(),
  };
}

async function sendConfiguredEmail(message) {
  if (isBrevoSelected()) {
    const apiKey = process.env.BREVO_API_KEY?.trim();
    const from = parseMailbox(message.from);
    const replyTo = message.replyTo ? parseMailbox(message.replyTo) : undefined;
    const recipients = (Array.isArray(message.to) ? message.to : [message.to]).map(parseMailbox);
    const payload = {
      sender: from,
      to: recipients,
      subject: message.subject,
      ...(message.html ? { htmlContent: message.html } : {}),
      ...(message.text ? { textContent: message.text } : {}),
      ...(replyTo ? { replyTo } : {}),
      ...(message.headers ? { headers: message.headers } : {}),
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey || "",
        "accept": "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const responseBody = await response.text();
    if (!response.ok) {
      throw new Error(`Brevo API returned HTTP ${response.status}: ${responseBody}`);
    }

    let result = {};
    try {
      result = responseBody ? JSON.parse(responseBody) : {};
    } catch {
      result = {};
    }
    return { messageId: result.messageId || "accepted-by-brevo" };
  }

  const { host, port, secure, auth } = sanitizeSmtpConfig();
  const transporter = nodemailer.createTransport({ host, port, secure, auth });
  return transporter.sendMail(message);
}

export function formatGreetingName(name) {
  if (!name) return "Candidate";
  const trimmed = String(name).trim();
  const lower = trimmed.toLowerCase();
  const genericTitles = new Set([
    "student records",
    "student record",
    "students",
    "student",
    "candidates",
    "candidate",
    "candidate name",
    "student name",
    "full name",
    "name",
    "records",
    "record",
    "unnamed",
    "column 1",
    "column 2",
    "column 3"
  ]);
  if (genericTitles.has(lower) || /^column \d+$/i.test(lower)) {
    return "Candidate";
  }
  return trimmed;
}

export async function sendStudentInvitationEmail({
  to,
  studentName,
  companyName,
  driveName,
  jobRole,
  examDate,
  examTime,
  timeZone = "Asia/Kolkata",
  examEndTime,
  durationMinutes,
  activationLink,
}) {
  if (!hasEmailConfig()) {
    return { status: "smtp_not_configured" };
  }

  const { from, replyTo } = sanitizeSmtpConfig();

  try {
    const greeting = formatGreetingName(studentName);
    const windowText = examEndTime ? `${examTime} to ${examEndTime}` : `${examTime} onwards`;
    const text = [
      `Dear ${greeting},`,
      "",
      `You have been invited by ${companyName} to participate in the recruitment process.`,
      "",
      `Company: ${companyName}`,
      `Job Role: ${jobRole}`,
      `Hiring Drive: ${driveName}`,
      "Round: Aptitude Assessment",
      `Exam Date: ${examDate}`,
      `Exam Window: ${windowText}`,
      `Time Zone: ${timeZone}`,
      `Duration: ${durationMinutes} minutes (start anytime during the open window)`,
      "",
      "Please open your unique invitation link:",
      activationLink,
      "",
      "This invitation is personal. Do not share this link.",
      "",
      "Regards,",
      "Synthora Recruitment Team",
    ].join("\n");

    const info = await sendConfiguredEmail({
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
        <p>Dear ${formatGreetingName(studentName)},</p>
        <p>You have been invited by ${companyName} to participate in the recruitment process.</p>
        <p><strong>Company</strong><br/>${companyName}</p>
        <p><strong>Job Role</strong><br/>${jobRole}</p>
        <p><strong>Hiring Drive</strong><br/>${driveName}</p>
        <p><strong>Round</strong><br/>Aptitude Assessment</p>
        <p><strong>Exam Date</strong><br/>${examDate}</p>
        <p><strong>Exam Window</strong><br/>${windowText}</p>
        <p><strong>Time Zone</strong><br/>${timeZone}</p>
        <p><strong>Duration</strong><br/>${durationMinutes} minutes (You can start at any time during this window)</p>
        <p>Please use your unique invitation link below.</p>
        <p><a href="${activationLink}">${activationLink}</a></p>
        <p>This invitation is personal.<br/>Do not share this link.</p>
        <p>Regards<br/>Synthora Recruitment Team</p>
      </div>
    `,
    });

    console.log(`Email accepted for ${to} via ${isBrevoSelected() ? "Brevo API" : "SMTP"}`, { messageId: info.messageId });
    return { status: "sent" };
  } catch (error) {
    throw logMailFailure(error);
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
  if (!hasEmailConfig()) {
    return { status: "smtp_not_configured" };
  }

  const { from, replyTo } = sanitizeSmtpConfig();

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
    const greeting = formatGreetingName(studentName);

    const text = [
      `Dear ${greeting},`,
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

    const info = await sendConfiguredEmail({
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
        <p>Dear ${formatGreetingName(studentName)},</p>
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

    console.log(`Technical oral invitation email accepted for ${to} via ${isBrevoSelected() ? "Brevo API" : "SMTP"}`, { messageId: info.messageId });
    return { status: "sent" };
  } catch (error) {
    throw logMailFailure(error);
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
  if (!hasEmailConfig()) {
    return { status: "smtp_not_configured" };
  }

  const { from, replyTo } = sanitizeSmtpConfig();

  try {
    const greeting = formatGreetingName(studentName);
    const text = [
      `Dear ${greeting},`,
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

    const info = await sendConfiguredEmail({
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
        <p>Dear ${formatGreetingName(studentName)},</p>
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

    console.log(`Aptitude cleared email accepted for ${to} via ${isBrevoSelected() ? "Brevo API" : "SMTP"}`, { messageId: info.messageId });
    return { status: "sent" };
  } catch (error) {
    throw logMailFailure(error);
  }
}
