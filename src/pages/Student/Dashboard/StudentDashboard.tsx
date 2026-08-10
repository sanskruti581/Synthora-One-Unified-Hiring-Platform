import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlayCircle, CalendarDays, Clock3, Building2, BriefcaseBusiness, CheckCircle2, LockKeyhole } from "lucide-react";
import { motion } from "framer-motion";
import ThemeToggle from "../../../components/ThemeToggle";
import { useCountdown } from "../../../hooks/useCountdown";
import { getStudentDashboard, startStudentAssessment, type StudentDashboardData } from "../../../services/studentService";
import logo from "../../../../images/logo.png";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<StudentDashboardData | null>(null);
  const [message, setMessage] = useState("");
  const assessmentStatus = assessment?.assessmentStatus ?? "Pending";
  const examStartAt = assessment?.examStartAt ?? (assessment ? `${assessment.examDate}T${assessment.examTime}:00` : new Date().toISOString());
  const examEndAt = assessment?.examEndAt ?? (assessment ? new Date(new Date(examStartAt).getTime() + Number(assessment.durationMinutes) * 60 * 1000).toISOString() : new Date().toISOString());
  const countdown = useCountdown(examStartAt);
  const now = Date.now();
  const isCompleted = assessmentStatus.toLowerCase() === "completed";
  const isStarted = ["started", "in_progress", "in progress", "in-progress"].includes(assessmentStatus.toLowerCase());
  const isClosed = Boolean(assessment && !isCompleted && now >= new Date(examEndAt).getTime());
  const canStartNow =
    Boolean(assessment) &&
    assessment?.assessmentStatus === "Logged In" &&
    now >= new Date(examStartAt).getTime() &&
    now < new Date(examEndAt).getTime();
  const heading = useMemo(() => getDashboardHeading(assessmentStatus), [assessmentStatus]);

  useEffect(() => {
    getStudentDashboard()
      .then((response) => setAssessment(response.data))
      .catch(() => setMessage("Unable to load assessment details. Please login again from your invitation."));
  }, []);

  const handleStart = async () => {
    if (assessment?.currentRound === "Coding" && assessment?.assessmentStatus === "Started" && assessment.driveId) {
      navigate(`/coding/${assessment.driveId}`);
      return;
    }
    if (assessment?.assessmentStatus === "Started" && assessment.driveId) {
      navigate(`/assessment/${assessment.driveId}`);
      return;
    }

    try {
      await startStudentAssessment();
      const response = await getStudentDashboard();
      setAssessment(response.data);
      if (response.data.currentRound === "Coding") {
        navigate(`/coding/${response.data.driveId}`);
      } else {
        navigate(`/assessment/${response.data.driveId}`);
      }
    } catch {
      setMessage("The assessment can only start during the official exam window.");
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
          <h1 className="text-4xl font-extrabold leading-tight text-slate-950 dark:text-white md:text-5xl">{heading.title}</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300">{heading.subtitle}</p>
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
            <InfoTile icon={LockKeyhole} label="Closes At" value={assessment ? formatTime(examEndAt) : "-"} />
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

          {assessment?.rounds && assessment.rounds.length > 0 && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">Assessment Pipeline</p>
              <div className="flex flex-col gap-3">
                {assessment.rounds.map((round, index) => {
                  const result = assessment.roundResults?.find(r => r.roundName === round);
                  const isCurrent = assessment.currentRound === round;
                  
                  return (
                    <div key={round} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        {result?.status === "Completed" ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : isCurrent ? (
                          <PlayCircle className="w-5 h-5 text-sky-500" />
                        ) : (
                          <LockKeyhole className="w-5 h-5 text-slate-400" />
                        )}
                        <span className={`font-bold ${
                          result?.status === "Completed" ? "text-emerald-700 dark:text-emerald-400" :
                          isCurrent ? "text-sky-700 dark:text-sky-400" :
                          "text-slate-500 dark:text-slate-400"
                        }`}>
                          {round}
                        </span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {result?.status === "Completed" ? `(completed, score: ${result.score ?? "-"})` :
                         isCurrent ? "(current round)" :
                         "(locked)"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={`mt-6 flex flex-col justify-between gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center ${
            isCompleted
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-400/20 dark:bg-emerald-400/10"
              : isClosed
                ? "border-rose-200 bg-rose-50 dark:border-rose-400/20 dark:bg-rose-400/10"
                : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
          }`}>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Assessment Status</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-950 dark:text-white">
                {isClosed ? "Closed" : assessment?.assessmentStatus ?? "Pending"}
              </p>
              {isCompleted ? (
                <p className="mt-2 text-sm font-bold text-emerald-700 dark:text-emerald-200">Your assessment has been submitted successfully.</p>
              ) : null}
              {isClosed ? (
                <p className="mt-2 text-sm font-bold text-rose-700 dark:text-rose-200">The assessment window closed at {formatTime(examEndAt)}.</p>
              ) : null}
              {message ? <p className="mt-2 text-sm font-semibold text-rose-600">{message}</p> : null}
            </div>
            {isCompleted ? (
              <div className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-extrabold text-white">
                <CheckCircle2 className="h-5 w-5" />
                Completed
              </div>
            ) : isClosed ? (
              <div className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-extrabold text-white">
                <LockKeyhole className="h-5 w-5" />
                Window Closed
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStart}
                disabled={!assessment || (!isStarted && !canStartNow)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 text-sm font-extrabold text-white shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlayCircle className="h-5 w-5" />
                {isStarted
                  ? `Continue ${assessment?.currentRound === "Coding" ? "Coding Round" : "Assessment"}`
                  : canStartNow
                    ? `Start ${assessment?.currentRound === "Coding" ? "Coding Round" : "Aptitude Assessment"}`
                    : `Starts in ${formatCountdown(countdown)}`}
              </button>
            )}
          </div>
        </motion.div>
      </section>
    </main>
  );
}

function getDashboardHeading(status: string) {
  const normalized = status?.trim().toLowerCase();

  if (normalized === "completed") {
    return {
      title: "Your invited assessment is completed.",
      subtitle: "You have successfully submitted your assessment.",
    };
  }

  if (["started", "in_progress", "in progress", "in-progress"].includes(normalized)) {
    return {
      title: "Your assessment is in progress.",
      subtitle: "Your assessment is currently running. Continue from where you left off.",
    };
  }

  return {
    title: "Your invited assessment is ready.",
    subtitle: "Review the drive details, keep an eye on the countdown, and start the active round when your assessment window opens.",
  };
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
