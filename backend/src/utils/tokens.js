import crypto from "crypto";

export function createInvitationToken() {
  return crypto.randomUUID();
}

export function createStudentPassword() {
  return `Syn-${crypto.randomBytes(4).toString("hex")}`;
}

export function normalizeTimeString(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return "00:00";
  const trimmed = timeStr.trim();

  // Handle 12-hour AM/PM e.g. "02:30 PM", "2:30pm"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const modifier = match12[3].toLowerCase();
    if (modifier === "pm" && hours < 12) hours += 12;
    if (modifier === "am" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }

  // Handle standard "HH:mm" or "H:mm"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const hours = String(parseInt(match24[1], 10)).padStart(2, "0");
    const minutes = match24[2];
    return `${hours}:${minutes}`;
  }

  return trimmed;
}

export function getExamStartDate(examDate, examTime, timeZone = "Asia/Kolkata") {
  const normTime = normalizeTimeString(examTime);
  const match = String(examDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = normTime.match(/^(\d{2}):(\d{2})$/);
  if (!match || !timeMatch) return new Date(NaN);

  const [, year, month, day] = match;
  const [, hours, minutes] = timeMatch;
  if (Number(hours) > 23 || Number(minutes) > 59) return new Date(NaN);
  const targetUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
  if (new Date(targetUtc).toISOString().slice(0, 10) !== examDate) return new Date(NaN);

  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    let timestamp = targetUtc;
    // Resolve the wall-clock time in the configured zone without relying on the server's TZ.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map(({ type, value }) => [type, value]));
      const zonedAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
      timestamp += targetUtc - zonedAsUtc;
    }
    return new Date(timestamp);
  } catch {
    return new Date(NaN);
  }
}

export function getExamEndDate(drive) {
  if (!drive) return new Date(Date.now() + 6 * 60 * 60 * 1000);

  const start = getExamStartDate(drive.examDate, drive.examTime, drive.timeZone);

  // If company configured an explicit window end time
  if (drive.examEndTime && typeof drive.examEndTime === "string" && drive.examEndTime.trim()) {
    const normEndTime = normalizeTimeString(drive.examEndTime);
    const endDateStr = drive.examEndDate || drive.examDate;
    let end = getExamStartDate(endDateStr, normEndTime, drive.timeZone);

    if (!isNaN(end.getTime())) {
      // If end time is before or equal to start time on the same date (e.g., start 22:00, end 02:00 next morning)
      if (end.getTime() <= start.getTime()) {
        end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
      }
      return end;
    }
  }

  // Fallback: Default window is at least (drive.windowDurationHours || 6) hours
  const windowHours = Math.max(6, Number(drive.windowDurationHours) || 6);
  const defaultWindowEnd = new Date(start.getTime() + windowHours * 60 * 60 * 1000);
  const durationEnd = new Date(start.getTime() + Number(drive.durationMinutes || 60) * 60 * 1000);

  return defaultWindowEnd.getTime() > durationEnd.getTime() ? defaultWindowEnd : durationEnd;
}
