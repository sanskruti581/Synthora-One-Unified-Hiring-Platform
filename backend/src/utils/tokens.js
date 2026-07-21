import crypto from "crypto";

export function createInvitationToken() {
  return crypto.randomUUID();
}

export function createStudentPassword() {
  return `Syn-${crypto.randomBytes(4).toString("hex")}`;
}

export function getExamStartDate(examDate, examTime) {
  return new Date(`${examDate}T${examTime}:00`);
}
