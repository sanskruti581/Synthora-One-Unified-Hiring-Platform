import { sendTechnicalAssessmentInvitationEmail } from "./mailer.js";
import Company from "../models/Company.js";
import Invitation from "../models/Invitation.js";

export const TECHNICAL_ACCESS_WINDOW_MS = 4 * 60 * 60 * 1000;

export function getTechnicalAssessmentState(student, invitation) {
  if (student.technicalAssessmentStatus === "Completed" || student.technicalOralStatus === "Completed") {
    return "Completed";
  }

  const startsAt = invitation?.technicalAssessmentAccessStartsAt || student.technicalAssessmentAccessStartsAt;
  const expiresAt = invitation?.technicalAssessmentAccessExpiresAt || student.technicalAssessmentAccessExpiresAt;

  if (!startsAt || !expiresAt || student.technicalAssessmentStatus === "Not Selected") {
    return "Not Selected";
  }

  const now = Date.now();
  const startTime = new Date(startsAt).getTime();
  const expiryTime = new Date(expiresAt).getTime();

  if (Number.isFinite(expiryTime) && now > expiryTime) {
    return "Expired";
  }

  if (Number.isFinite(startTime) && now < startTime) {
    return "Shortlisted";
  }

  if (student.technicalOralStatus === "In Progress") {
    return "In Progress";
  }

  return "Active";
}

export async function promoteStudentToTechnicalAssessment({ student, drive, company, invitation, forceResendEmail = false, codingScore }) {
  if (!student || !drive) return null;

  let comp = company;
  if (!comp && drive.company) {
    comp = await Company.findById(drive.company);
  }

  let inv = invitation;
  if (!inv) {
    inv = await Invitation.findOne({ student: student._id, drive: drive._id });
  }

  const isAlreadyPromoted =
    student.technicalAssessmentStatus === "Active" ||
    student.technicalAssessmentStatus === "In Progress" ||
    student.technicalAssessmentStatus === "Completed" ||
    student.technicalOralStatus === "Completed";

  const shouldSendEmail = forceResendEmail || !student.technicalAssessmentEmailSent || !isAlreadyPromoted;

  if (isAlreadyPromoted && !shouldSendEmail) {
    return { student, invitation: inv, alreadyPromoted: true };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + TECHNICAL_ACCESS_WINDOW_MS);
  const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");
  const assessmentLink = inv?.token ? `${clientUrl}/invite/${inv.token}` : `${clientUrl}/student/dashboard`;

  student.currentRound = "Technical Oral";
  student.technicalAssessmentStatus = "Active";
  student.technicalAssessmentInvitedAt = now;
  student.technicalAssessmentAccessStartsAt = now;
  student.technicalAssessmentAccessExpiresAt = expiresAt;
  student.technicalOralStatus = student.technicalOralStatus === "In Progress" ? "In Progress" : "Not Started";

  if (student.assessmentStatus !== "Completed") {
    student.assessmentStatus = "Completed";
    student.completedAt = student.completedAt || now;
  }

  if (inv) {
    inv.currentRound = "Technical Oral";
    inv.technicalAssessmentStatus = "Active";
    inv.technicalAssessmentInvitedAt = now;
    inv.technicalAssessmentAccessStartsAt = now;
    inv.technicalAssessmentAccessExpiresAt = expiresAt;
    inv.expiresAt = expiresAt;
    inv.technicalOralStatus = inv.technicalOralStatus === "In Progress" ? "In Progress" : "Not Started";
    if (inv.assessmentStatus !== "Completed") {
      inv.assessmentStatus = "Completed";
      inv.completedAt = inv.completedAt || now;
    }
  }

  if (shouldSendEmail) {
    try {
      const aptitudeScore = student.aptitudeScore ?? student.score;
      const mailResult = await sendTechnicalAssessmentInvitationEmail({
        to: student.email,
        studentName: student.name,
        companyName: comp?.companyName || "the hiring team",
        driveName: drive.driveName,
        jobRole: drive.jobRole,
        accessStartsAt: now,
        accessExpiresAt: expiresAt,
        assessmentLink,
        aptitudeScore,
        codingScore: codingScore ?? student.codingScore,
      });

      student.technicalAssessmentEmailStatus = mailResult.status;
      student.technicalAssessmentEmailSent = mailResult.status === "sent";
      student.technicalAssessmentEmailError = undefined;

      if (inv) {
        inv.technicalAssessmentEmailStatus = mailResult.status;
        inv.technicalAssessmentEmailSent = mailResult.status === "sent";
        inv.technicalAssessmentEmailError = undefined;
      }
    } catch (error) {
      console.error(`Failed to send technical assessment invitation email to ${student.email}:`, error?.message || error);
      student.technicalAssessmentEmailStatus = "failed";
      student.technicalAssessmentEmailSent = false;
      student.technicalAssessmentEmailError = error?.message || "Failed to send email";

      if (inv) {
        inv.technicalAssessmentEmailStatus = "failed";
        inv.technicalAssessmentEmailSent = false;
        inv.technicalAssessmentEmailError = error?.message || "Failed to send email";
      }
    }
  }

  await student.save();
  if (inv) {
    await inv.save();
  }

  return { student, invitation: inv };
}
