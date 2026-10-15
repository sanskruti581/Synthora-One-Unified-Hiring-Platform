import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, Mail, RefreshCw, MessageSquare, UserCheck, CalendarClock, X, type LucideIcon } from "lucide-react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import OralInterviewModal from "../../../components/OralInterviewModal";
import {
  downloadDriveFile,
  getHiringDriveDetails,
  sendReminderEmails,
  selectForTechnicalAssessment,
  updateDriveSchedule,
  type DriveStats,
  type DriveStudent,
  type HiringDrive,
} from "../../../services/driveService";

const filters = ["All Students", "Pending", "In Progress", "Aptitude Completed", "Coding Completed", "Completed", "Qualified", "Rejected"] as const;

const emptyStats: DriveStats = {
  studentsInvited: 0,
  studentsLoggedIn: 0,
  studentsStarted: 0,
  studentsCompleted: 0,
  averageScore: 0,
  highestScore: 0,
  lowestScore: 0,
  qualifiedStudents: 0,
  rejectedStudents: 0,
};

export default function DriveDetails() {
  const { driveId = "" } = useParams();
  const [drive, setDrive] = useState<HiringDrive | null>(null);
  const [stats, setStats] = useState<DriveStats>(emptyStats);
  const [students, setStudents] = useState<DriveStudent[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]>("All Students");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudentForOral, setSelectedStudentForOral] = useState<{ id: string; name: string } | null>(null);
  const [invitingStudentId, setInvitingStudentId] = useState<string | null>(null);

  // Schedule Modification States
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editExamDate, setEditExamDate] = useState("");
  const [editExamTime, setEditExamTime] = useState("");
  const [editExamEndTime, setEditExamEndTime] = useState("");
  const [editDurationMinutes, setEditDurationMinutes] = useState("");
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  const loadDetails = async () => {
    const response = await getHiringDriveDetails(driveId);
    setDrive(response.data.drive);
    setStats(response.data.stats);
    setStudents(response.data.students);
  };

  useEffect(() => {
    setIsLoading(true);
    loadDetails()
      .catch(() => setMessage("Unable to load hiring drive details."))
      .finally(() => setIsLoading(false));

    const interval = window.setInterval(() => {
      loadDetails().catch(() => undefined);
    }, 10000);

    return () => window.clearInterval(interval);
  }, [driveId]);

  const visibleStudents = useMemo(() => {
    if (filter === "All Students") return students;
    if (filter === "Pending") return students.filter((student) => student.assessmentStatus !== "Completed");
    if (filter === "In Progress") return students.filter((student) => student.assessmentStatus === "Started" || student.assessmentStatus === "In Progress");
    if (filter === "Aptitude Completed") return students.filter(s => s.roundResults?.some(r => r.roundName === "Aptitude" && r.status === "Completed") || (s.aptitudeScore !== null && s.aptitudeScore !== undefined));
    if (filter === "Coding Completed") return students.filter(s => s.roundResults?.some(r => r.roundName === "Coding" && r.status === "Completed") || (s.codingScore !== null && s.codingScore !== undefined));
    if (filter === "Completed") return students.filter((student) => student.assessmentStatus === "Completed");
    return students.filter((student) => student.result === filter);
  }, [filter, students]);

  const invitationsSent = useMemo(() => students.filter((student) => student.emailSent).length, [students]);
  const loggedInStudents = useMemo(() => students.filter((student) => student.assessmentStatus === "Logged In").length, [students]);
  const startedStudents = useMemo(() => students.filter((student) => student.assessmentStatus === "Started").length, [students]);
  const waitingStudents = loggedInStudents;
  const completedStudents = useMemo(() => students.filter((student) => student.assessmentStatus === "Completed").length, [students]);
  const qualifiedStudents = useMemo(() => students.filter((student) => student.result === "Qualified").length, [students]);
  const rejectedStudents = useMemo(() => students.filter((student) => student.result === "Rejected").length, [students]);

  const handleReminder = async () => {
    setMessage("");
    const response = await sendReminderEmails(driveId);
    setMessage(`${response.data.message}. Sent: ${response.data.sent}, failed: ${response.data.failed}, total: ${response.data.total}.`);
    await loadDetails();
  };

  const handleDownload = async (type: "jd" | "students-file" | "qualified" | "results" | "report") => {
    const fallbackName = `${drive?.driveName ?? "drive"}-${type}`;
    const filename =
      type === "jd"
        ? drive?.jobDescriptionFile?.originalName ?? "job-description"
        : type === "students-file"
          ? drive?.studentFile?.originalName ?? "students"
          : type === "report"
            ? `${fallbackName}.pdf`
            : `${fallbackName}.csv`;

    await downloadDriveFile(driveId, type, filename);
  };

  const handleTechnicalInvite = async (student: DriveStudent) => {
    setMessage("");
    setInvitingStudentId(student._id);

    try {
      const response = await selectForTechnicalAssessment(driveId, student._id);
      setMessage(`${student.studentName || student.email} selected for Technical Assessment. ${response.data.technicalAssessmentEmailSent ? "Email sent." : `Email status: ${response.data.technicalAssessmentEmailStatus}.`}`);
      await loadDetails();
    } catch {
      setMessage("Unable to select this student for Technical Assessment.");
    } finally {
      setInvitingStudentId(null);
    }
  };

  const openScheduleModal = () => {
    if (!drive) return;
    setEditExamDate(drive.examDate || "");
    setEditExamTime(drive.examTime || "");
    setEditExamEndTime(drive.examEndTime || "");
    setEditDurationMinutes(String(drive.durationMinutes || 60));
    setNotifyStudents(true);
    setScheduleError("");
    setShowScheduleModal(true);
  };

  const handleUpdateSchedule = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editExamTime) {
      setScheduleError("Please specify a valid start window time.");
      return;
    }
    if (!editExamDate) {
      setScheduleError("Please specify a valid exam date.");
      return;
    }

    setIsUpdatingSchedule(true);
    setScheduleError("");

    try {
      const res = await updateDriveSchedule(driveId, {
        examDate: editExamDate,
        examTime: editExamTime,
        timeZone: drive?.timeZone || "Asia/Kolkata",
        examEndTime: editExamEndTime || undefined,
        durationMinutes: Number(editDurationMinutes) || drive?.durationMinutes || 60,
        notifyStudents,
      });

      setMessage(
        `Exam schedule updated to ${editExamDate} (${editExamTime}${editExamEndTime ? ` - ${editExamEndTime}` : ""})! ${
          notifyStudents && res.data.notifiedStudents !== undefined
            ? `Updated invitations sent to ${res.data.notifiedStudents} student(s).`
            : ""
        }`
      );
      setShowScheduleModal(false);
      await loadDetails();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update exam schedule.";
      setScheduleError(msg);
    } finally {
      setIsUpdatingSchedule(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Hiring Drive Details" subtitle="Loading live hiring drive information.">
        <div className="rounded-xl border border-synthora-border bg-white/95 p-6 text-sm font-semibold text-synthora-muted shadow-[0_18px_50px_rgba(15,23,42,.07)]">
          Loading drive details...
        </div>
      </DashboardLayout>
    );
  }

  if (!drive) {
    return (
      <DashboardLayout title="Hiring Drive Details" subtitle="The requested drive could not be found.">
        <Link to="/company/dashboard" className="text-sm font-bold text-synthora-blue">
          Back to dashboard
        </Link>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={drive.driveName} subtitle="Monitor invitations, assessment progress, scores, and final result downloads.">
      <div className="grid gap-6">
        {message ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700">
            {message}
          </div>
        ) : null}

        <section className="rounded-xl border border-synthora-border bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] backdrop-blur">
          <div className="grid gap-4 lg:grid-cols-3">
            <Detail label="Job Role" value={drive.jobRole} />
            <Detail label="Status" value={drive.status} />
            <div className="rounded-xl bg-blue-50/70 p-4 relative group">
              <div className="flex items-center justify-between">
                <p className="text-xs font-extrabold uppercase text-synthora-muted">Exam Window</p>
                <button
                  type="button"
                  onClick={openScheduleModal}
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-synthora-blue hover:text-synthora-blue-hover hover:underline"
                  title="Modify exam date or window times"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Modify Time
                </button>
              </div>
              <p className="mt-1 break-words text-sm font-bold text-synthora-text">
                {drive.examDate} | {drive.examTime} {drive.examEndTime ? `– ${drive.examEndTime}` : "(Open Window)"}
              </p>
            </div>
            <Detail label="Duration" value={`${drive.durationMinutes} minutes`} />
            <Detail label="Interview Rounds" value={drive.rounds.join(", ")} />
            <Detail label="Aptitude Cutoff" value={String(drive.aptitudeCutoff)} />
            {drive.lastRegistrationDate ? <Detail label="Registration Deadline" value={drive.lastRegistrationDate} /> : null}
            <Detail label="Job Description" value={drive.jobDescriptionFile?.originalName ?? "Not uploaded"} />
            <Detail label="Uploaded Excel" value={drive.studentFile?.originalName ?? "Not uploaded"} />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <ActionButton label="Modify Exam Time" icon={CalendarClock} onClick={openScheduleModal} />
            <ActionButton label="Download JD" icon={Download} onClick={() => handleDownload("jd")} />
            <ActionButton label="Download Uploaded Excel" icon={Download} onClick={() => handleDownload("students-file")} />
            <ActionButton label="Send Reminder Email" icon={Mail} onClick={handleReminder} />
            <ActionButton label="Download Final Qualified Students" icon={Download} onClick={() => handleDownload("qualified")} />
            <ActionButton label="Download Result Excel" icon={Download} onClick={() => handleDownload("results")} />
            <ActionButton label="Download PDF Report" icon={Download} onClick={() => handleDownload("report")} />
            <ActionButton label="View Results" icon={RefreshCw} onClick={loadDetails} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Stat label="Total Students" value={stats.studentsInvited} />
          <Stat label="Invitations Sent" value={invitationsSent} />
          <Stat label="Logged In" value={loggedInStudents} />
          <Stat label="Waiting" value={waitingStudents} />
          <Stat label="Assessment Started" value={startedStudents} />
          <Stat label="Assessment Completed" value={completedStudents} />
          <Stat label="Qualified Students" value={qualifiedStudents} />
          <Stat label="Rejected Students" value={rejectedStudents} />
          <Stat label="Average Score" value={stats.averageScore} />
          <Stat label="Highest Score" value={stats.highestScore} />
          <Stat label="Lowest Score" value={stats.lowestScore} />
          <Stat label="Qualified / Rejected" value={`${stats.qualifiedStudents} / ${stats.rejectedStudents}`} />
        </section>

        <section className="rounded-xl border border-synthora-border bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] backdrop-blur">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-extrabold text-synthora-text">Students</h2>
              <p className="mt-1 text-sm text-synthora-muted">Live status is refreshed from MongoDB every 10 seconds.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`h-10 rounded-xl px-3 text-xs font-extrabold transition ${
                    filter === item
                      ? "bg-synthora-blue text-white shadow-[0_10px_22px_rgba(37,99,235,.18)]"
                      : "bg-blue-50 text-synthora-muted hover:bg-blue-100 hover:text-synthora-blue"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-synthora-border">
            <table className="min-w-[1500px] w-full text-left text-sm">
              <thead className="bg-blue-50/80 text-xs uppercase text-synthora-muted">
                <tr>
                  <th className="px-4 py-3 font-extrabold">Student</th>
                  <th className="px-4 py-3 font-extrabold">Submission</th>
                  <th className="px-4 py-3 font-extrabold">Started At</th>
                  <th className="px-4 py-3 font-extrabold">Submitted At</th>
                  <th className="px-4 py-3 font-extrabold">Time Spent</th>
                  <th className="px-4 py-3 font-extrabold">Aptitude Score</th>
                  <th className="px-4 py-3 font-extrabold">Aptitude %</th>
                  <th className="px-4 py-3 font-extrabold">Cutoff</th>
                  <th className="px-4 py-3 font-extrabold">Apt. Result</th>
                  <th className="px-4 py-3 font-extrabold">Coding Score</th>
                  <th className="px-4 py-3 font-extrabold">Oral Score</th>
                  <th className="px-4 py-3 font-extrabold">Final Result</th>
                  <th className="px-4 py-3 font-extrabold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-synthora-border bg-white">
                {visibleStudents.map((student) => (
                  <tr key={student._id} className="transition hover:bg-blue-50/50">
                    {/* Student info */}
                    <td className="px-4 py-3">
                      <p className="font-bold text-synthora-text">{student.studentName || "Student"}</p>
                      <p className="text-xs text-synthora-muted mt-0.5">{student.email}</p>
                      <span className="inline-block mt-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-synthora-blue">
                        {student.currentRound ?? "Aptitude"}
                      </span>
                    </td>

                    {/* Submission status */}
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                        student.submissionStatus === "Submitted" ? "bg-emerald-50 text-emerald-700" :
                        student.submissionStatus === "In Progress" ? "bg-amber-50 text-amber-700" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {student.submissionStatus ?? student.assessmentStatus}
                      </span>
                    </td>

                    {/* Started at */}
                    <td className="px-4 py-3 text-xs text-synthora-muted">
                      {student.startedAt ? formatDateTime(student.startedAt) : "-"}
                    </td>

                    {/* Submitted at */}
                    <td className="px-4 py-3 text-xs text-synthora-muted">
                      {student.completedAt ? formatDateTime(student.completedAt) : "-"}
                    </td>

                    {/* Time spent */}
                    <td className="px-4 py-3 text-xs font-semibold text-synthora-text">
                      {student.timeSpentMinutes != null ? `${student.timeSpentMinutes} min` : "-"}
                    </td>

                    {/* Aptitude score: marks obtained / total */}
                    <td className="px-4 py-3">
                      {student.aptitudeScore != null ? (
                        <span className="font-bold text-synthora-text">
                          {student.aptitudeScore}
                          {student.aptitudeMaxScore != null ? <span className="text-synthora-muted font-normal">/{student.aptitudeMaxScore}</span> : null}
                        </span>
                      ) : student.assessmentStatus === "Completed" ? (
                        <span className="text-synthora-muted">0</span>
                      ) : "-"}
                    </td>

                    {/* Aptitude percentage */}
                    <td className="px-4 py-3">
                      {student.aptitudePercentage != null ? (
                        <span className={`font-extrabold ${
                          student.aptitudePassed ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          {student.aptitudePercentage}%
                        </span>
                      ) : "-"}
                    </td>

                    {/* Cutoff threshold */}
                    <td className="px-4 py-3 text-xs font-semibold text-synthora-muted">
                      {student.aptitudeCutoff != null ? `${student.aptitudeCutoff}` : drive?.aptitudeCutoff ?? "-"}
                    </td>

                    {/* Aptitude pass/fail */}
                    <td className="px-4 py-3">
                      {student.aptitudePassed === true ? (
                        <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700">Passed</span>
                      ) : student.aptitudePassed === false ? (
                        <span className="inline-block rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-extrabold text-rose-700">Failed</span>
                      ) : "-"}
                    </td>

                    {/* Coding score */}
                    <td className="px-4 py-3 font-bold text-indigo-600">
                      {student.codingScore != null ? student.codingScore : "-"}
                    </td>

                    {/* Technical oral score */}
                    <td className="px-4 py-3">
                      {student.technicalOralScore != null ? (
                        <div>
                          <span className="font-bold text-sky-600">{student.technicalOralScore}/100</span>
                          <span className={`ml-1.5 text-[10px] font-extrabold ${
                            student.technicalOralPassed ? "text-emerald-600" : "text-rose-600"
                          }`}>
                            {student.technicalOralPassed ? "✓ Pass" : "✗ Fail"}
                          </span>
                        </div>
                      ) : "-"}
                    </td>

                    {/* Final result */}
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                        student.result === "Qualified" ? "bg-emerald-50 text-emerald-600" :
                        student.result === "Rejected" ? "bg-rose-50 text-rose-600" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {student.result}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        {canSelectForTechnical(student, drive?.rounds) ? (
                          <button
                            type="button"
                            onClick={() => handleTechnicalInvite(student)}
                            disabled={invitingStudentId === student._id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            {invitingStudentId === student._id ? "Selecting..." : "Select for Technical"}
                          </button>
                        ) : null}
                        {student.technicalOralScore !== null && student.technicalOralScore !== undefined ? (
                          <button
                            type="button"
                            onClick={() => setSelectedStudentForOral({ id: student._id, name: student.studentName || student.email })}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 transition shadow-sm"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            View Viva
                          </button>
                        ) : !canSelectForTechnical(student, drive?.rounds) ? (
                          <span className="text-xs text-slate-400">{getTechnicalActionText(student, drive?.rounds)}</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedStudentForOral ? (
        <OralInterviewModal
          driveId={driveId}
          studentId={selectedStudentForOral.id}
          studentName={selectedStudentForOral.name}
          onClose={() => setSelectedStudentForOral(null)}
        />
      ) : null}

      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-synthora-border bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-synthora-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-synthora-blue">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-synthora-text">Modify Exam Schedule</h3>
                  <p className="text-xs text-synthora-muted">Update time & date for {drive.driveName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {scheduleError ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700">
                {scheduleError}
              </div>
            ) : null}

            <form onSubmit={handleUpdateSchedule} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase text-synthora-muted mb-1.5">
                  Exam Date
                </label>
                <input
                  type="date"
                  value={editExamDate}
                  onChange={(e) => setEditExamDate(e.target.value)}
                  required
                  className="w-full h-11 rounded-xl border border-synthora-border bg-white px-3.5 text-sm font-bold text-synthora-text outline-none focus:border-synthora-blue focus:ring-2 focus:ring-synthora-blue/20"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-synthora-muted mb-1.5">
                  Start Window Time
                </label>
                <input
                  type="time"
                  value={editExamTime}
                  onChange={(e) => setEditExamTime(e.target.value)}
                  required
                  className="w-full h-11 rounded-xl border border-synthora-border bg-white px-3.5 text-sm font-bold text-synthora-text outline-none focus:border-synthora-blue focus:ring-2 focus:ring-synthora-blue/20"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-synthora-muted mb-1.5">
                  End Window Time (Optional)
                </label>
                <input
                  type="time"
                  value={editExamEndTime}
                  onChange={(e) => setEditExamEndTime(e.target.value)}
                  className="w-full h-11 rounded-xl border border-synthora-border bg-white px-3.5 text-sm font-bold text-synthora-text outline-none focus:border-synthora-blue focus:ring-2 focus:ring-synthora-blue/20"
                />
                <span className="text-[11px] text-synthora-muted mt-1 block">
                  Candidates can start anytime between Start and End times.
                </span>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-synthora-muted mb-1.5">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  value={editDurationMinutes}
                  onChange={(e) => setEditDurationMinutes(e.target.value)}
                  required
                  className="w-full h-11 rounded-xl border border-synthora-border bg-white px-3.5 text-sm font-bold text-synthora-text outline-none focus:border-synthora-blue focus:ring-2 focus:ring-synthora-blue/20"
                />
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyStudents}
                    onChange={(e) => setNotifyStudents(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-synthora-blue focus:ring-synthora-blue"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-synthora-text block">Send updated schedule email</span>
                    <span className="text-synthora-muted">
                      Notify invited candidates of the rescheduled exam time immediately.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="h-11 rounded-xl border border-synthora-border px-4 text-xs font-bold text-synthora-muted hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingSchedule}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-synthora-blue px-5 text-xs font-bold text-white shadow-[0_12px_24px_rgba(37,99,235,.20)] hover:bg-synthora-blue-hover transition disabled:opacity-50"
                >
                  {isUpdatingSchedule ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                  {isUpdatingSchedule ? "Updating..." : "Save Exam Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-blue-50/70 p-4">
      <p className="text-xs font-extrabold uppercase text-synthora-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-synthora-text">{value}</p>
    </div>
  );
}

function canSelectForTechnical(student: DriveStudent, driveRounds?: string[]) {
  const hasAptitudeResult = student.aptitudeScore !== null && student.aptitudeScore !== undefined;
  const technicalStatus = student.technicalAssessmentStatus ?? "Not Selected";

  if (!hasAptitudeResult || technicalStatus !== "Not Selected" || student.result === "Rejected") {
    return false;
  }

  if (driveRounds && driveRounds.includes("Coding")) {
    const codingCleared = student.roundResults?.some(
      r => r.roundName === "Coding" && (r.status === "Cleared" || r.status === "Completed")
    ) || student.currentRound === "Technical Oral" || (student.codingScore !== null && student.codingScore !== undefined);

    return Boolean(codingCleared);
  }

  return true;
}

function getTechnicalActionText(student: DriveStudent, driveRounds?: string[]) {
  if (student.technicalAssessmentStatus === "Completed") {
    return "Completed";
  }

  if (student.technicalAssessmentStatus === "Expired") {
    return "Expired";
  }

  if (student.technicalAssessmentStatus && student.technicalAssessmentStatus !== "Not Selected") {
    return "Invited";
  }

  if (student.result === "Rejected") {
    return "Not eligible";
  }

  const hasAptitudeResult = student.aptitudeScore !== null && student.aptitudeScore !== undefined;
  if (!hasAptitudeResult) {
    return "Awaiting aptitude";
  }

  if (driveRounds && driveRounds.includes("Coding")) {
    const codingCleared = student.roundResults?.some(
      r => r.roundName === "Coding" && (r.status === "Cleared" || r.status === "Completed")
    ) || student.currentRound === "Technical Oral" || (student.codingScore !== null && student.codingScore !== undefined);

    if (!codingCleared) {
      return "Awaiting coding";
    }
  }

  return "Eligible";
}

function getTechnicalStatusClass(status?: string) {
  if (status === "Completed") {
    return "bg-emerald-50 text-emerald-600";
  }

  if (status === "Active" || status === "In Progress") {
    return "bg-sky-50 text-sky-600";
  }

  if (status === "Shortlisted") {
    return "bg-amber-50 text-amber-600";
  }

  if (status === "Expired") {
    return "bg-rose-50 text-rose-600";
  }

  return "bg-slate-100 text-slate-600";
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-synthora-border bg-white/95 p-5 shadow-[0_14px_35px_rgba(15,23,42,.06)]">
      <p className="text-2xl font-extrabold text-synthora-text">{value}</p>
      <p className="mt-1 text-sm font-semibold text-synthora-muted">{label}</p>
    </div>
  );
}

function ActionButton({ label, icon: Icon, onClick }: { label: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-synthora-blue px-4 text-sm font-bold text-white shadow-[0_12px_24px_rgba(37,99,235,.20)] transition hover:bg-synthora-blue-hover"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "-";
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
