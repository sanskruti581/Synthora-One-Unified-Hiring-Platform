import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import ThemeToggle from "../../components/ThemeToggle";
import { getAssessment, saveAssessmentAnswers, startAssessmentForDrive, submitAssessment, type AssessmentData } from "../../services/studentService";
import { useCountdown } from "../../hooks/useCountdown";
import logo from "../../../images/logo.png";

const questions = [
  {
    id: "q1",
    question: "If a number is increased by 20% and then decreased by 20%, what is the net change?",
    options: ["No change", "4% decrease", "4% increase", "2% decrease"],
    answer: "4% decrease",
  },
  {
    id: "q2",
    question: "A train covers 180 km in 3 hours. What is its average speed?",
    options: ["45 km/h", "50 km/h", "60 km/h", "75 km/h"],
    answer: "60 km/h",
  },
  {
    id: "q3",
    question: "Choose the next term: 2, 6, 12, 20, 30, ?",
    options: ["40", "42", "44", "48"],
    answer: "42",
  },
  {
    id: "q4",
    question: "If 8 workers finish a task in 12 days, how many days will 6 workers take at the same rate?",
    options: ["14", "16", "18", "20"],
    answer: "16",
  },
  {
    id: "q5",
    question: "Which word is closest in meaning to 'efficient'?",
    options: ["Wasteful", "Productive", "Slow", "Careless"],
    answer: "Productive",
  },
];

export default function Assessment() {
  const { driveId = "" } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasStartedExam, setHasStartedExam] = useState(false);
  const countdown = useCountdown(assessment ? assessment.examStartAt : new Date().toISOString());
  const currentQuestion = questions[currentIndex];
  const canStartExam =
    Boolean(assessment) &&
    countdown.days === 0 &&
    countdown.hours === 0 &&
    countdown.minutes === 0 &&
    countdown.seconds === 0;

  useEffect(() => {
    getAssessment(driveId)
      .then((response) => {
        setAssessment(response.data);
        setAnswers(response.data.answers || {});
        setHasStartedExam(response.data.assessmentStatus === "Started");
      })
      .catch(() => setMessage("Unable to load assessment. Please open your invitation link again."));
  }, [driveId]);

  useEffect(() => {
    if (!assessment || !hasStartedExam) {
      return;
    }

    const timeout = window.setTimeout(() => {
      saveAssessmentAnswers(driveId, answers).catch(() => undefined);
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [answers, assessment, driveId]);

  const score = useMemo(
    () => questions.reduce((total, question) => total + (answers[question.id] === question.answer ? 20 : 0), 0),
    [answers],
  );

  const handleStartExam = async () => {
    setMessage("");

    try {
      await startAssessmentForDrive(driveId);
      setHasStartedExam(true);
      const response = await getAssessment(driveId);
      setAssessment(response.data);
    } catch {
      setMessage("The assessment can only start at the official exam time.");
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await submitAssessment(score, answers);
      setMessage(`Assessment submitted. Score: ${score}. Result: ${response.data.result}.`);
      window.setTimeout(() => navigate("/student/dashboard"), 1200);
    } catch {
      setMessage("Could not submit assessment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-6 font-inter text-slate-950 dark:bg-slate-950 dark:text-white sm:px-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <img src={logo} alt="" className="h-10 w-10" />
          <span className="text-xl font-extrabold">Synthora.AI</span>
        </a>
        <ThemeToggle />
      </header>

      <section className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[0.72fr_1.28fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/10">
          <p className="text-xs font-extrabold uppercase text-sky-600 dark:text-sky-300">Aptitude Assessment</p>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">{assessment?.driveName ?? "Assessment"}</h1>
          <div className="mt-5 grid gap-3 text-sm">
            <Info label="Student Name" value={assessment?.studentName ?? "-"} />
            <Info label="Company" value={assessment?.companyName ?? "-"} />
            <Info label="Drive Name" value={assessment?.driveName ?? "-"} />
          </div>

          <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white dark:bg-white dark:text-slate-950">
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase text-sky-300 dark:text-sky-700">
              <Clock3 className="h-4 w-4" />
              Countdown Timer
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              <TimeBlock label="D" value={countdown.days} />
              <TimeBlock label="H" value={countdown.hours} />
              <TimeBlock label="M" value={countdown.minutes} />
              <TimeBlock label="S" value={countdown.seconds} />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">Rules</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
              <li>Stable Internet Connection</li>
              <li>Camera should remain ON (future feature)</li>
              <li>Do not refresh page</li>
              <li>Timer cannot be paused</li>
            </ul>
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/10">
          {message ? (
            <p className="mb-4 rounded-xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700 dark:bg-sky-400/10 dark:text-sky-200">
              {message}
            </p>
          ) : null}

          {!hasStartedExam ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">Waiting Room</p>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">{assessment?.driveName ?? "Assessment"}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Info label="Company" value={assessment?.companyName ?? "-"} />
                  <Info label="Candidate Name" value={assessment?.studentName ?? "-"} />
                  <Info label="Round" value="APTITUDE" />
                  <Info label="Exam Time" value={`${assessment?.examDate ?? "-"} ${assessment?.examTime ?? ""}`} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                  {canStartExam ? "The exam has started. You can begin now." : `Assessment starts in ${formatCountdown(countdown)}`}
                </p>
                <button
                  type="button"
                  onClick={handleStartExam}
                  disabled={!canStartExam}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-400 dark:text-slate-950"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Start Assessment
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-extrabold text-slate-500 dark:text-slate-400">
                  Question {currentIndex + 1} of {questions.length}
                </p>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{Object.keys(answers).length}/{questions.length} answered</p>
              </div>

              <h2 className="mt-4 text-xl font-extrabold text-slate-950 dark:text-white">{currentQuestion.question}</h2>

              <div className="mt-5 grid gap-3">
                {currentQuestion.options.map((option) => {
                  const selected = answers[currentQuestion.id] === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAnswers((current) => ({ ...current, [currentQuestion.id]: option }))}
                      className={`flex min-h-12 items-center justify-between rounded-xl border px-4 text-left text-sm font-bold transition ${
                        selected
                          ? "border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-200"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                      }`}
                    >
                      {option}
                      {selected ? <CheckCircle2 className="h-5 w-5" /> : null}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </button>

                {currentIndex === questions.length - 1 ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-sky-400 dark:text-slate-950"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Assessment"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((index) => Math.min(index + 1, questions.length - 1))}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-extrabold text-white transition hover:bg-slate-800 dark:bg-sky-400 dark:text-slate-950"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
      <p className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function TimeBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 p-2 dark:bg-slate-950/10">
      <p className="text-xl font-extrabold tabular-nums">{String(value).padStart(2, "0")}</p>
      <p className="text-[11px] font-bold opacity-70">{label}</p>
    </div>
  );
}

function formatCountdown(value: { days: number; hours: number; minutes: number; seconds: number }) {
  if (value.days > 0) {
    return `${String(value.days).padStart(2, "0")}:${String(value.hours).padStart(2, "0")}:${String(value.minutes).padStart(2, "0")}:${String(value.seconds).padStart(2, "0")}`;
  }

  return `${String(value.hours).padStart(2, "0")}:${String(value.minutes).padStart(2, "0")}:${String(value.seconds).padStart(2, "0")}`;
}
