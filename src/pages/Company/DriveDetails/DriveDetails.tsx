import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, Mail, RefreshCw, type LucideIcon } from "lucide-react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import {
  downloadDriveFile,
  getHiringDriveDetails,
  sendReminderEmails,
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

  if (isLoading) {
    return (
      <DashboardLayout title="Hiring Drive Details" subtitle="Loading live hiring drive information.">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
          Loading drive details...
        </div>
      </DashboardLayout>
    );
  }

  if (!drive) {
    return (
      <DashboardLayout title="Hiring Drive Details" subtitle="The requested drive could not be found.">
        <Link to="/company/dashboard" className="text-sm font-bold text-sky-600 dark:text-sky-300">
          Back to dashboard
        </Link>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={drive.driveName} subtitle="Monitor invitations, assessment progress, scores, and final result downloads.">
      <div className="grid gap-6">
        {message ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
            {message}
          </div>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/10">
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

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/10">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">Students</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Live status is refreshed from MongoDB every 10 seconds.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`h-10 rounded-xl px-3 text-xs font-extrabold transition ${
                    filter === item
                      ? "bg-slate-950 text-white dark:bg-sky-400 dark:text-slate-950"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[1040px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-white/5 dark:text-slate-400">
                <tr>
                  {["Student Name", "Email", "Invitation Status", "Email Sent", "Assessment Status", "Started Time", "Completed Time", "Score", "Qualified / Rejected"].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-extrabold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {visibleStudents.map((student) => (
                  <tr key={student._id}>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{student.studentName || "Student"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{student.email}</td>
                    <td className="px-4 py-3">{student.invitationStatus}</td>
                    <td className="px-4 py-3">{student.emailSent ? "Sent" : student.emailSentStatus}</td>
                    <td className="px-4 py-3">{student.assessmentStatus}</td>
                    <td className="px-4 py-3">{formatDate(student.startedAt)}</td>
                    <td className="px-4 py-3">{formatDate(student.completedAt)}</td>
                    <td className="px-4 py-3">{student.score ?? "-"}</td>
                    <td className="px-4 py-3">{student.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-white/5">
      <p className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/10">
      <p className="text-2xl font-extrabold text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function ActionButton({ label, icon: Icon, onClick }: { label: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-sky-400 dark:text-slate-950"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "-";
}
