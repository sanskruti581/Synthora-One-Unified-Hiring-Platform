import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarClock, CheckCircle2, FileSpreadsheet, RefreshCw, Send, Sparkles, Trash2, UsersRound, X } from "lucide-react";
import { motion } from "framer-motion";
import DashboardLayout from "../../../layouts/DashboardLayout";
import { deleteHiringDrive, getHiringDrives, updateDriveSchedule, type HiringDrive } from "../../../services/driveService";

export default function CompanyDashboard() {
  const [drives, setDrives] = useState<HiringDrive[]>([]);
  const [message, setMessage] = useState("");

  // Schedule Modification Modal States
  const [activeDriveForSchedule, setActiveDriveForSchedule] = useState<HiringDrive | null>(null);
  const [editExamDate, setEditExamDate] = useState("");
  const [editExamTime, setEditExamTime] = useState("");
  const [editDurationMinutes, setEditDurationMinutes] = useState("");
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  useEffect(() => {
    getHiringDrives()
      .then((response) => setDrives(response.data))
      .catch(() => setDrives([]));
  }, []);

  const handleDelete = async (driveId: string) => {
    await deleteHiringDrive(driveId);
    setDrives((current) => current.filter((drive) => drive._id !== driveId));
  };

  const handleOpenScheduleModal = (drive: HiringDrive) => {
    setActiveDriveForSchedule(drive);
    setEditExamDate(drive.examDate || "");
    setEditExamTime(drive.examTime || "");
    setEditDurationMinutes(String(drive.durationMinutes || 60));
    setNotifyStudents(true);
    setScheduleError("");
  };

  const handleUpdateSchedule = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeDriveForSchedule) return;
    if (!editExamTime || !editExamDate) {
      setScheduleError("Please specify both exam date and start time.");
      return;
    }

    setIsUpdatingSchedule(true);
    setScheduleError("");

    try {
      const res = await updateDriveSchedule(activeDriveForSchedule._id, {
        examDate: editExamDate,
        examTime: editExamTime,
        durationMinutes: Number(editDurationMinutes) || activeDriveForSchedule.durationMinutes,
        notifyStudents,
      });

      setDrives((current) =>
        current.map((d) => (d._id === activeDriveForSchedule._id ? { ...d, ...res.data.drive } : d))
      );
      setMessage(`Exam schedule updated for ${activeDriveForSchedule.driveName} to ${editExamDate} at ${editExamTime}!`);
      setActiveDriveForSchedule(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update exam schedule.";
      setScheduleError(msg);
    } finally {
      setIsUpdatingSchedule(false);
    }
  };

  const totalStudentsInvited = useMemo(
    () => drives.reduce((total, drive) => total + (drive.studentsInvited ?? 0), 0),
    [drives],
  );

  const stats = [
    { label: "Total Drives", value: String(drives.length), icon: CalendarClock, accent: "bg-blue-50 text-synthora-blue" },
    { label: "Students Invited", value: String(totalStudentsInvited), icon: Send, accent: "bg-cyan-50 text-synthora-cyan" },
    { label: "Waiting Students", value: String(drives.reduce((total, drive) => total + (drive.studentsWaiting ?? 0), 0)), icon: CheckCircle2, accent: "bg-emerald-50 text-emerald-600" },
    { label: "Shortlisted Students", value: "0", icon: UsersRound, accent: "bg-amber-50 text-synthora-amber" },
  ];

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Track hiring drives, student invitations, assessment progress, and final shortlists from one command center."
    >
      {message ? (
        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.article
              key={stat.label}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              className="rounded-xl border border-synthora-border bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(15,23,42,.10)]"
            >
              <div className="flex items-center justify-between">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${stat.accent}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowUpRight className="h-5 w-5 text-synthora-cyan" />
              </div>
              <p className="mt-6 text-3xl font-extrabold text-synthora-text">{stat.value}</p>
              <p className="mt-1 text-sm font-semibold text-synthora-muted">{stat.label}</p>
            </motion.article>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-xl border border-synthora-border bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] backdrop-blur">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-extrabold text-synthora-text">Hiring Drives</h2>
              <p className="mt-1 text-sm text-synthora-muted">Create and view company hiring drives.</p>
            </div>
            <Link to="/company/create-drive" className="inline-flex h-11 items-center justify-center rounded-xl bg-synthora-blue px-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(37,99,235,.24)] transition hover:bg-synthora-blue-hover">
              Create Hiring Drive
            </Link>
          </div>

          <div className="mt-5 grid gap-4">
            {drives.length ? drives.map((drive) => (
              <article key={drive._id} className="rounded-xl border border-synthora-border bg-white/80 p-4 transition hover:border-synthora-cyan/50 hover:shadow-[0_14px_35px_rgba(15,23,42,.08)]">
                <div>
                  <p className="font-bold text-synthora-text">{drive.driveName}</p>
                  <p className="text-sm text-synthora-muted">{drive.jobRole}</p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <DriveFact label="Status" value={drive.status} />
                  <DriveFact label="Exam Schedule" value={`${drive.examDate} at ${drive.examTime}`} />
                  <DriveFact label="Students Invited" value={String(drive.studentsInvited ?? 0)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link to={`/company/drives/${drive._id}`} className="inline-flex h-10 items-center justify-center rounded-xl bg-synthora-blue px-4 text-sm font-bold text-white shadow-[0_12px_24px_rgba(37,99,235,.20)] transition hover:bg-synthora-blue-hover">
                    View Details
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleOpenScheduleModal(drive)}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-synthora-border bg-white px-3.5 text-sm font-bold text-synthora-text transition hover:bg-blue-50 hover:text-synthora-blue"
                  >
                    <CalendarClock className="h-4 w-4 text-synthora-blue" />
                    Modify Time
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(drive._id)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </article>
            )) : (
              <div className="rounded-xl bg-blue-50/70 p-6 text-sm font-semibold text-synthora-muted">
                No hiring drives created yet.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-synthora-border bg-synthora-blue p-5 text-white shadow-[0_24px_70px_rgba(37,99,235,.22)]">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-xl font-extrabold">Final Results</h2>
          <p className="mt-3 text-sm leading-6 text-blue-50">Download shortlisted candidates after students complete assessments and AI evaluation is ready.</p>
          <button className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-extrabold text-slate-950 transition hover:bg-sky-50" type="button">
            <FileSpreadsheet className="h-5 w-5 text-synthora-blue" />
            Download Shortlist
          </button>
        </section>
      </div>

      {activeDriveForSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-synthora-border bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-synthora-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-synthora-blue">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-synthora-text">Modify Exam Schedule</h3>
                  <p className="text-xs text-synthora-muted">Update time for {activeDriveForSchedule.driveName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDriveForSchedule(null)}
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
                  Exam Start Time
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
                  onClick={() => setActiveDriveForSchedule(null)}
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

function DriveFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-blue-50/70 p-3">
      <p className="text-xs font-extrabold uppercase text-synthora-muted">{label}</p>
      <p className="mt-1 text-sm font-bold text-synthora-text">{value}</p>
    </div>
  );
}
