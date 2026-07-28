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
                  <DriveFact label="Exam Date" value={drive.examDate} />
                  <DriveFact label="Students Invited" value={String(drive.studentsInvited ?? 0)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link to={`/company/drives/${drive._id}`} className="inline-flex h-10 items-center justify-center rounded-xl bg-synthora-blue px-4 text-sm font-bold text-white shadow-[0_12px_24px_rgba(37,99,235,.20)] transition hover:bg-synthora-blue-hover">
                    View Details
                  </Link>
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
