import { sendTechnicalAssessmentInvitationEmail } from "./mailer.js";

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

export async function promoteStudentToTechnicalAssessment({ student, drive, company, invitation }) {
  if (!student || !drive) return null;

  // If already active, in-progress or completed, don't duplicate promotion or overwrite
  if (
    student.technicalAssessmentStatus === "Active" ||
    student.technicalAssessmentStatus === "In Progress" ||
    student.technicalAssessmentStatus === "Completed" ||
    student.technicalOralStatus === "Completed"
  ) {
    return { student, invitation, alreadyPromoted: true };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + TECHNICAL_ACCESS_WINDOW_MS);
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const assessmentLink = `${clientUrl}/student/dashboard`;

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

  if (invitation) {
    invitation.currentRound = "Technical Oral";
    invitation.technicalAssessmentStatus = "Active";
    invitation.technicalAssessmentInvitedAt = now;
    invitation.technicalAssessmentAccessStartsAt = now;
    invitation.technicalAssessmentAccessExpiresAt = expiresAt;
    invitation.technicalOralStatus = invitation.technicalOralStatus === "In Progress" ? "In Progress" : "Not Started";
    if (invitation.assessmentStatus !== "Completed") {
      invitation.assessmentStatus = "Completed";
      invitation.completedAt = invitation.completedAt || now;
    }
  }

  try {
    const mailResult = await sendTechnicalAssessmentInvitationEmail({
      to: student.email,
      studentName: student.name,
      companyName: company?.companyName || "the hiring team",
      driveName: drive.driveName,
      jobRole: drive.jobRole,
      accessStartsAt: now,
      accessExpiresAt: expiresAt,
      assessmentLink,
    });

    student.technicalAssessmentEmailStatus = mailResult.status;
    student.technicalAssessmentEmailSent = mailResult.status === "sent";
    student.technicalAssessmentEmailError = undefined;

    if (invitation) {
      invitation.technicalAssessmentEmailStatus = mailResult.status;
      invitation.technicalAssessmentEmailSent = mailResult.status === "sent";
      invitation.technicalAssessmentEmailError = undefined;
    }
  } catch (error) {
    console.error(`Failed to send technical assessment invitation email to ${student.email}:`, error?.message || error);
    student.technicalAssessmentEmailStatus = "failed";
    student.technicalAssessmentEmailSent = false;
    student.technicalAssessmentEmailError = error?.message || "Failed to send email";

    if (invitation) {
      invitation.technicalAssessmentEmailStatus = "failed";
      invitation.technicalAssessmentEmailSent = false;
      invitation.technicalAssessmentEmailError = error?.message || "Failed to send email";
    }
  }

  await student.save();
  if (invitation) {
    await invitation.save();
  }

  return { student, invitation };
}

export async function autoPromoteQualifiedStudentsForDrive(drive, students, invitations, company) {
  const hasOralRound = Array.isArray(drive?.rounds) && drive.rounds.includes("Technical Oral");
  if (!hasOralRound || !Array.isArray(students)) return;

  const invitationByStudentId = new Map(
    (invitations || []).map((invitation) => [String(invitation.student), invitation])
  );

  for (const student of students) {
    const aptitudeScore = student.aptitudeScore ?? student.score;
    const isQualified = typeof aptitudeScore === "number" && aptitudeScore >= Number(drive.aptitudeCutoff);
    const notYetInvited = !student.technicalAssessmentStatus || student.technicalAssessmentStatus === "Not Selected";

    if (isQualified && notYetInvited && student.result !== "Rejected") {
      const invitation = invitationByStudentId.get(String(student._id));
      await promoteStudentToTechnicalAssessment({
        student,
        drive,
        company,
        invitation,
      });
    }
  }
}
