import { useEffect, useState } from "react";
import { PlayCircle, CalendarDays, Clock3, Building2, BriefcaseBusiness } from "lucide-react";
import { motion } from "framer-motion";
import ThemeToggle from "../../../components/ThemeToggle";
import { useCountdown } from "../../../hooks/useCountdown";
import { getStudentDashboard, startStudentAssessment, type StudentDashboardData } from "../../../services/studentService";
import logo from "../../../../images/logo.png";

export default function StudentDashboard() {
  const [assessment, setAssessment] = useState<StudentDashboardData | null>(null);
  const [message, setMessage] = useState("");
  const countdown = useCountdown(assessment ? `${assessment.examDate}T${assessment.examTime}:00` : new Date().toISOString());
  const canStartNow = countdown.days === 0 && countdown.hours === 0 && countdown.minutes === 0 && countdown.seconds === 0;

  useEffect(() => {
    getStudentDashboard()
      .then((response) => setAssessment(response.data))
      .catch(() => setMessage("Unable to load assessment details. Please login again from your invitation."));
  }, []);

  const handleStart = async () => {
    try {
      await startStudentAssessment();
      const response = await getStudentDashboard();
      setAssessment(response.data);
    } catch {
      setMessage("The assessment can only start at the official exam time.");
    }
  };

  return (
    <main className="min-h-screen bg-synthora-radial px-5 py-6 font-inter text-slate-950 transition dark:bg-none dark:bg-slate-950 dark:text-white sm:px-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <img src={logo} alt="" className="h-10 w-10" />
          <span className="text-xl font-extrabold">Synthora.AI</span>
        </a>
        <ThemeToggle />
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-96px)] max-w-6xl items-center gap-8 py-10 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <p className="mb-4 text-sm font-extrabold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">Student dashboard</p>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-950 dark:text-white md:text-5xl">Your invited assessment is ready.</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300">
            Review the drive details, keep an eye on the countdown, and start the active round when your assessment window opens.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-white/70 bg-white/[0.88] p-5 shadow-glass backdrop-blur-2xl dark:border-white/10 dark:bg-white/10 sm:p-7"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoTile icon={Building2} label="Company Name" value={assessment?.companyName ?? "-"} />
            <InfoTile icon={BriefcaseBusiness} label="Drive Name" value={assessment?.driveName ?? "-"} />
            <InfoTile icon={CalendarDays} label="Exam Date" value={assessment?.examDate ?? "-"} />
            <InfoTile icon={Clock3} label="Exam Time" value={assessment?.examTime ?? "-"} />
          </div>

          <div className="mt-6 rounded-2xl bg-slate-950 p-5 text-white dark:bg-white dark:text-slate-950">
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-sky-300 dark:text-sky-700">Countdown Timer</p>
            <div className="mt-4 grid grid-cols-4 gap-3">
              <CountdownBlock label="Days" value={countdown.days} />
              <CountdownBlock label="Hours" value={countdown.hours} />
              <CountdownBlock label="Minutes" value={countdown.minutes} />
              <CountdownBlock label="Seconds" value={countdown.seconds} />
            </div>
          </div>

          <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Assessment Status</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-950 dark:text-white">{assessment?.assessmentStatus ?? "Pending"}</p>
              {message ? <p className="mt-2 text-sm font-semibold text-rose-600">{message}</p> : null}
            </div>
            <button
              type="button"
              onClick={handleStart}
              disabled={!assessment || assessment.assessmentStatus !== "Logged In" || !canStartNow}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 text-sm font-extrabold text-white shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:bg-sky-600"
            >
              <PlayCircle className="h-5 w-5" />
              {assessment?.assessmentStatus === "Started"
                ? "Assessment Started"
                : canStartNow
                  ? "Start Aptitude Assessment"
                  : `Starts in ${formatCountdown(countdown)}`}
            </button>
          </div>
        </motion.div>
      </section>
    </main>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/10">
      <Icon className="h-5 w-5 text-sky-500" />
      <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-base font-extrabold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function CountdownBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 p-3 text-center dark:bg-slate-950/10">
      <p className="text-2xl font-extrabold tabular-nums">{String(value).padStart(2, "0")}</p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-normal opacity-70">{label}</p>
    </div>
  );
}

function formatCountdown(value: { days: number; hours: number; minutes: number; seconds: number }) {
  if (value.days > 0) {
    return `${String(value.days).padStart(2, "0")}:${String(value.hours).padStart(2, "0")}:${String(value.minutes).padStart(2, "0")}:${String(value.seconds).padStart(2, "0")}`;
  }

  return `${String(value.hours).padStart(2, "0")}:${String(value.minutes).padStart(2, "0")}:${String(value.seconds).padStart(2, "0")}`;
}
