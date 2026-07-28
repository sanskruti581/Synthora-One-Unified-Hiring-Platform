import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, Camera, CheckCircle2, Clock3, Maximize2, ShieldCheck } from "lucide-react";
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
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [proctorViolation, setProctorViolation] = useState("");
  const [isSecuringExam, setIsSecuringExam] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [isProctorArmed, setIsProctorArmed] = useState(false);
  const hasSubmittedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const examEndAt = useMemo(() => {
    if (!assessment?.startedAt) {
      return "";
    }

    return new Date(new Date(assessment.startedAt).getTime() + Number(assessment.durationMinutes) * 60 * 1000).toISOString();
  }, [assessment?.durationMinutes, assessment?.startedAt]);
  const startCountdown = useCountdown(assessment ? assessment.examStartAt : new Date().toISOString());
  const examCountdown = useCountdown(examEndAt || new Date().toISOString());
  const activeCountdown = hasStartedExam && examEndAt ? examCountdown : startCountdown;
  const currentQuestion = questions[currentIndex];
  const proctorReady = Boolean(cameraStream && isFullscreen);
  const canStartExam =
    Boolean(assessment) &&
    startCountdown.days === 0 &&
    startCountdown.hours === 0 &&
    startCountdown.minutes === 0 &&
    startCountdown.seconds === 0;

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
    if (videoRef.current && cameraStream && videoRef.current.srcObject !== cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => undefined);
    }
  });

  useEffect(() => {
    const handleFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));

    document.addEventListener("fullscreenchange", handleFullscreenState);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenState);
  }, []);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  useEffect(() => {
    if (!hasStartedExam || !proctorReady) {
      setIsProctorArmed(false);
      return;
    }

    const timeout = window.setTimeout(() => setIsProctorArmed(true), 3000);
    return () => window.clearTimeout(timeout);
  }, [hasStartedExam, proctorReady]);

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

  const submitNow = useCallback(async (reason?: string) => {
    if (hasSubmittedRef.current) {
      return;
    }

    hasSubmittedRef.current = true;
    setIsSubmitting(true);

    if (reason) {
      setProctorViolation(reason);
      setMessage(`${reason} Your assessment is being submitted.`);
    } else {
      setMessage("");
    }

    try {
      const response = await submitAssessment(score, answers);
      setMessage(`Assessment submitted. Score: ${score}. Result: ${response.data.result}.`);
      window.setTimeout(() => navigate("/student/dashboard"), 1200);
    } catch {
      hasSubmittedRef.current = false;
      setMessage("Could not submit assessment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, navigate, score]);

  const handleProctorViolation = useCallback((reason: string) => {
    if (!hasStartedExam || !proctorReady || !isProctorArmed || hasSubmittedRef.current) {
      return;
    }

    void submitNow(reason);
  }, [hasStartedExam, isProctorArmed, proctorReady, submitNow]);

  useEffect(() => {
    if (!hasStartedExam || !proctorReady || !isProctorArmed) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleProctorViolation("Tab switching is not allowed.");
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleProctorViolation("Fullscreen mode was exited.");
      }
    };
    const handleContextMenu = (event: MouseEvent) => event.preventDefault();
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [handleProctorViolation, hasStartedExam, isProctorArmed, proctorReady]);

  useEffect(() => {
    const timeIsOver =
      hasStartedExam &&
      examEndAt &&
      Date.now() >= new Date(examEndAt).getTime();

    if (timeIsOver) {
      void submitNow("Time is over.");
    }
  }, [examCountdown, examEndAt, hasStartedExam, submitNow]);

  const handleStartExam = async () => {
    setMessage("");
    setProctorViolation("");
    setIsSecuringExam(true);

    let stream: MediaStream | null = null;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage("Camera access is required, but this browser does not support camera permissions.");
        return;
      }

      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setCameraStream(stream);

      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);

      await startAssessmentForDrive(driveId);
      setHasStartedExam(true);
      const response = await getAssessment(driveId);
      setAssessment(response.data);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      setCameraStream(null);

      if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError")) {
        setMessage("Camera and fullscreen permission are required before starting the assessment.");
        return;
      }

      setMessage("The assessment can only start during the official exam window and requires camera plus fullscreen access.");
    } finally {
      setIsSecuringExam(false);
    }
  };

  const handleSubmit = async () => {
    await submitNow();
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
              {hasStartedExam ? "Assessment Timer" : "Countdown Timer"}
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              <TimeBlock label="D" value={activeCountdown.days} />
              <TimeBlock label="H" value={activeCountdown.hours} />
              <TimeBlock label="M" value={activeCountdown.minutes} />
              <TimeBlock label="S" value={activeCountdown.seconds} />
            </div>
          </div>

          {hasStartedExam ? (
            <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-400/20 dark:bg-emerald-400/10">
              <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full bg-slate-950 object-cover" />
              <p className="flex items-center gap-2 px-4 py-3 text-xs font-extrabold uppercase text-emerald-700 dark:text-emerald-200">
                <Camera className="h-4 w-4" />
                Camera Monitoring Active
              </p>
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">Rules</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
              <li>Stable Internet Connection</li>
              <li>Camera must remain ON</li>
              <li>Fullscreen mode is required</li>
              <li>Do not refresh page or switch tabs</li>
              <li>Timer cannot be paused</li>
            </ul>
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/10">
          {message ? (
            <p className={`mb-4 rounded-xl px-4 py-3 text-sm font-bold ${
              proctorViolation
                ? "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-200"
                : "bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-200"
            }`}>
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
                  {canStartExam ? "Allow camera access and fullscreen to begin." : `Assessment starts in ${formatCountdown(startCountdown)}`}
                </p>
                <button
                  type="button"
                  onClick={handleStartExam}
                  disabled={!canStartExam || isSecuringExam}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-400 dark:text-slate-950"
                >
                  {isSecuringExam ? <Maximize2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                  {isSecuringExam ? "Securing..." : "Start Proctored Assessment"}
                </button>
              </div>
            </div>
          ) : !proctorReady ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-400/20 dark:bg-amber-400/10">
                <p className="flex items-center gap-2 text-xs font-extrabold uppercase text-amber-700 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4" />
                  Proctoring Required
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">Secure mode is not active</h2>
                <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                  Camera access and fullscreen mode are required before questions are shown.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartExam}
                disabled={isSecuringExam}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-400 dark:text-slate-950"
              >
                <ShieldCheck className="h-4 w-4" />
                {isSecuringExam ? "Securing..." : "Enable Camera & Fullscreen"}
              </button>
            </div>
          ) : (
            <>
              {proctorViolation ? (
                <div className="mb-5 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-extrabold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                  <AlertTriangle className="h-5 w-5" />
                  {proctorViolation}
                </div>
              ) : null}

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
