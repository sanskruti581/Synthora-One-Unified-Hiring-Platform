import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarClock, CheckCircle2, FileSpreadsheet, Send, Sparkles, Trash2, UsersRound } from "lucide-react";
import { motion } from "framer-motion";
import DashboardLayout from "../../../layouts/DashboardLayout";
import { deleteHiringDrive, getHiringDrives, type HiringDrive } from "../../../services/driveService";

export default function CompanyDashboard() {
  const [drives, setDrives] = useState<HiringDrive[]>([]);

  useEffect(() => {
    getHiringDrives()
      .then((response) => setDrives(response.data))
      .catch(() => setDrives([]));
  }, []);

  const handleDelete = async (driveId: string) => {
    await deleteHiringDrive(driveId);
    setDrives((current) => current.filter((drive) => drive._id !== driveId));
  };

  const totalStudentsInvited = useMemo(
    () => drives.reduce((total, drive) => total + (drive.studentsInvited ?? 0), 0),
    [drives],
  );

  const stats = [
    { label: "Total Drives", value: String(drives.length), icon: CalendarClock, accent: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200" },
    { label: "Students Invited", value: String(totalStudentsInvited), icon: Send, accent: "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200" },
    { label: "Waiting Students", value: String(drives.reduce((total, drive) => total + (drive.studentsWaiting ?? 0), 0)), icon: CheckCircle2, accent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200" },
    { label: "Shortlisted Students", value: "0", icon: UsersRound, accent: "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-200" },
  ];

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Track hiring drives, student invitations, assessment progress, and final shortlists from one command center."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.article
              key={stat.label}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition dark:border-white/10 dark:bg-white/10"
            >
              <div className="flex items-center justify-between">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${stat.accent}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowUpRight className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-6 text-3xl font-extrabold text-slate-950 dark:text-white">{stat.value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{stat.label}</p>
            </motion.article>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">Hiring Drives</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create and view company hiring drives.</p>
            </div>
            <Link to="/company/create-drive" className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-sky-400 dark:text-slate-950">
              Create Hiring Drive
            </Link>
          </div>

          <div className="mt-5 grid gap-4">
            {drives.length ? drives.map((drive) => (
              <article key={drive._id} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{drive.driveName}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{drive.jobRole}</p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <DriveFact label="Status" value={drive.status} />
                  <DriveFact label="Exam Date" value={drive.examDate} />
                  <DriveFact label="Students Invited" value={String(drive.studentsInvited ?? 0)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link to={`/company/drives/${drive._id}`} className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-sky-400 dark:text-slate-950">
                    View Details
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(drive._id)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 text-sm font-bold text-rose-600 transition hover:bg-rose-50 dark:border-rose-400/20 dark:hover:bg-rose-400/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </article>
            )) : (
              <div className="p-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
                No hiring drives created yet.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-glow dark:border-white/10">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sky-200">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-xl font-extrabold">Final Results</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">Download shortlisted candidates after students complete assessments and AI evaluation is ready.</p>
          <button className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-extrabold text-slate-950 transition hover:bg-sky-50" type="button">
            <FileSpreadsheet className="h-5 w-5" />
            Download Shortlist
          </button>
        </section>
      </div>
    </DashboardLayout>
  );
}

function DriveFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
      <p className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
