import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, Mail, RefreshCw, MessageSquare, UserCheck, type LucideIcon } from "lucide-react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import OralInterviewModal from "../../../components/OralInterviewModal";
import {
  downloadDriveFile,
  getHiringDriveDetails,
  sendReminderEmails,
  selectForTechnicalAssessment,
  type DriveStats,
  type DriveStudent,
  type HiringDrive,
} from "../../../services/driveService";

const filters = ["All Students", "Pending", "Completed", "Qualified", "Rejected"] as const;

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
    if (filter === "All Students") {
      return students;
    }

    if (filter === "Pending") {
      return students.filter((student) => student.assessmentStatus !== "Completed");
    }

    if (filter === "Completed") {
      return students.filter((student) => student.assessmentStatus === "Completed");
    }

    return students.filter((student) => student.result === filter);
  }, [filter, students]);

  const invitationsSent = useMemo(() => students.filter((student) => student.emailSent).length, [students]);
  const loggedInStudents = useMemo(() => students.filter((student) => student.assessmentStatus === "Logged In").length, [students]);
  const startedStudents = useMemo(() => students.filter((student) => student.assessmentStatus === "Started").length, [students]);
  const waitingStudents = Math.max(0, loggedInStudents - startedStudents);
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
            <Detail label="Exam" value={`${drive.examDate} at ${drive.examTime}`} />
            <Detail label="Duration" value={`${drive.durationMinutes} minutes`} />
            <Detail label="Interview Rounds" value={drive.rounds.join(", ")} />
            <Detail label="Aptitude Cutoff" value={String(drive.aptitudeCutoff)} />
            <Detail label="Registration Deadline" value={drive.lastRegistrationDate} />
            <Detail label="Job Description" value={drive.jobDescriptionFile?.originalName ?? "Not uploaded"} />
            <Detail label="Uploaded Excel" value={drive.studentFile?.originalName ?? "Not uploaded"} />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
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
            <table className="min-w-[1280px] w-full text-left text-sm">
              <thead className="bg-blue-50/80 text-xs uppercase text-synthora-muted">
                <tr>
                  {["Student Name", "Email", "Aptitude Status", "Aptitude Score", "Aptitude Result", "Technical Status", "Technical Window", "Technical Score", "Technical Action", "Final Result", "Viva Interview"].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-extrabold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-synthora-border bg-white">
                {visibleStudents.map((student) => (
                  <tr key={student._id} className="transition hover:bg-blue-50/50">
                    <td className="px-4 py-3 font-bold text-synthora-text">{student.studentName || "Student"}</td>
                    <td className="px-4 py-3 text-synthora-muted">{student.email}</td>
                    <td className="px-4 py-3">{student.assessmentStatus}</td>
                    <td className="px-4 py-3 font-bold">{student.aptitudeScore ?? student.score ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                        student.result === "Rejected"
                          ? "bg-rose-50 text-rose-600"
                          : student.aptitudeScore !== null && student.aptitudeScore !== undefined
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-600"
                      }`}>
                        {student.aptitudeScore !== null && student.aptitudeScore !== undefined ? "Aptitude Completed" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-extrabold ${getTechnicalStatusClass(student.technicalAssessmentStatus)}`}>
                        {student.technicalAssessmentStatus ?? "Not Selected"}
                      </span>
                      {student.technicalAssessmentEmailSent ? (
                        <p className="mt-1 text-[11px] font-semibold text-emerald-600">Email sent</p>
                      ) : student.technicalAssessmentEmailStatus && student.technicalAssessmentStatus !== "Not Selected" ? (
                        <p className="mt-1 text-[11px] font-semibold text-slate-500">{student.technicalAssessmentEmailStatus}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-synthora-muted">
                      {student.technicalAssessmentAccessExpiresAt ? `Until ${formatDate(student.technicalAssessmentAccessExpiresAt)}` : "-"}
                    </td>
                    <td className="px-4 py-3 font-bold text-sky-600">
                      {student.technicalOralScore !== null && student.technicalOralScore !== undefined
                        ? `${student.technicalOralScore}/100`
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {canSelectForTechnical(student) ? (
                        <button
                          type="button"
                          onClick={() => handleTechnicalInvite(student)}
                          disabled={invitingStudentId === student._id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          {invitingStudentId === student._id ? "Selecting..." : "Select for Technical"}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">{getTechnicalActionText(student)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                        student.result === "Qualified"
                          ? "bg-emerald-50 text-emerald-600"
                          : student.result === "Rejected"
                            ? "bg-rose-50 text-rose-600"
                            : "bg-slate-100 text-slate-600"
                      }`}>
                        {student.result}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {student.technicalOralScore !== null && student.technicalOralScore !== undefined ? (
                        <button
                          type="button"
                          onClick={() => setSelectedStudentForOral({ id: student._id, name: student.studentName || student.email })}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 transition shadow-sm"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          View Viva
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Pending</span>
                      )}
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

function canSelectForTechnical(student: DriveStudent) {
  const hasAptitudeResult = student.aptitudeScore !== null && student.aptitudeScore !== undefined;
  const technicalStatus = student.technicalAssessmentStatus ?? "Not Selected";

  return hasAptitudeResult && technicalStatus === "Not Selected" && student.result !== "Rejected";
}

function getTechnicalActionText(student: DriveStudent) {
  if (student.technicalAssessmentStatus === "Completed") {
    return "Completed";
  }

  if (student.technicalAssessmentStatus === "Expired") {
    return "Expired";
  }

  if (student.technicalAssessmentStatus && student.technicalAssessmentStatus !== "Not Selected") {
    return "Auto-invited";
  }

  if (student.result === "Rejected") {
    return "Not eligible";
  }

  return "Awaiting aptitude";
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
