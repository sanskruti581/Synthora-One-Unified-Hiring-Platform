import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock3,
  Home,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { getAssessment, saveAssessmentAnswers, startAssessmentForDrive, submitAssessment, type AssessmentData } from "../../services/studentService";
import { logProctoringEvent } from "../../services/proctoringService";
import api from "../../services/api";
import logo from "../../../images/logo.png";

// ── Types ──────────────────────────────────────────────────────────────────────
interface AptitudeQuestion {
  id: string;
  question: string;
  options: string[];
  marks: number;
  category: string;
}

interface ProctoringViolation {
  id: number;
  type: string;
  message: string;
  timestamp: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatTimer(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${String(hours).padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;
}

async function fetchAptitudeQuestions(driveId: string): Promise<AptitudeQuestion[]> {
  try {
    const response = await api.get<{ questions: AptitudeQuestion[] }>(`/students/assessment/${driveId}/questions`);
    return response.data.questions || [];
  } catch {
    // Fallback to demo questions if API not available
    return [
      { id: "demo_q1", question: "If a number is increased by 20% and then decreased by 20%, what is the net change?", options: ["No change", "4% decrease", "4% increase", "2% decrease"], marks: 20, category: "Quantitative" },
      { id: "demo_q2", question: "A train covers 180 km in 3 hours. What is its average speed?", options: ["45 km/h", "50 km/h", "60 km/h", "75 km/h"], marks: 20, category: "Quantitative" },
      { id: "demo_q3", question: "Choose the next term: 2, 6, 12, 20, 30, ?", options: ["40", "42", "44", "48"], marks: 20, category: "Logical Reasoning" },
      { id: "demo_q4", question: "If 8 workers finish a task in 12 days, how many days will 6 workers take at the same rate?", options: ["14", "16", "18", "20"], marks: 20, category: "Quantitative" },
      { id: "demo_q5", question: "Which word is closest in meaning to 'efficient'?", options: ["Wasteful", "Productive", "Slow", "Careless"], marks: 20, category: "Verbal" },
    ];
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Assessment() {
  const { driveId = "" } = useParams();
  const navigate = useNavigate();

  // Assessment data
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [questions, setQuestions] = useState<AptitudeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // UI state
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasStartedExam, setHasStartedExam] = useState(false);
  const [showPrepModal, setShowPrepModal] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSecuringExam, setIsSecuringExam] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [isDemoMode] = useState(Boolean(typeof window !== "undefined" && !window.localStorage.getItem("synthora-token")));

  // Camera
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<"idle" | "requesting" | "active" | "denied" | "unavailable">("idle");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Timer state (server-authoritative)
  const [aptitudeExpiresAt, setAptitudeExpiresAt] = useState<string | null>(null);
  const [timeRemainingMs, setTimeRemainingMs] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  // Proctoring
  const [proctoringViolations, setProctoringViolations] = useState<ProctoringViolation[]>([]);
  const [isProctorArmed, setIsProctorArmed] = useState(false);

  // Submission result
  const [completionResult, setCompletionResult] = useState<{
    score: number;
    maxScore: number;
    isAptitudeQualified: boolean;
    nextRound?: string | null;
    message?: string;
  } | null>(null);

  const hasSubmittedRef = useRef(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).filter(id => answers[id]).length;
  const canStartExam = Boolean(assessment?.canStartAssessment || assessment?.assessmentStatus === "Started") || isDemoMode;

  // ── Camera Management ────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraStatus("idle");
  }, [cameraStream]);

  const requestCamera = useCallback(async (): Promise<MediaStream | null> => {
    setCameraStatus("requesting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus("unavailable");
        return null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraStream(stream);
      setCameraStatus("active");
      return stream;
    } catch (err: unknown) {
      if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
        setCameraStatus("denied");
      } else {
        setCameraStatus("unavailable");
      }
      return null;
    }
  }, []);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && cameraStream && videoRef.current.srcObject !== cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => undefined);
    }
  }, [cameraStream]);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach(track => track.stop());
    };
  }, [cameraStream]);

  // ── Fullscreen ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Load Assessment Data ─────────────────────────────────────────────────────
  useEffect(() => {
    getAssessment(driveId)
      .then((response) => {
        const data = response.data;
        setAssessment(data);
        setAnswers(data.answers || {});

        if (data.assessmentStatus === "Completed") {
          hasSubmittedRef.current = true;
          setCompletionResult({
            score: data.aptitudeScore ?? data.score ?? 0,
            maxScore: 100,
            isAptitudeQualified: data.result !== "Rejected",
            nextRound: null,
          });
          return;
        }

        if (data.assessmentStatus === "Started") {
          setHasStartedExam(true);
          // Use server-provided deadline
          const deadline = (data as AssessmentData & { aptitudeExpiresAt?: string }).aptitudeExpiresAt
            || (data.startedAt
              ? new Date(new Date(data.startedAt).getTime() + Number(data.durationMinutes) * 60 * 1000).toISOString()
              : null);
          if (deadline) {
            setAptitudeExpiresAt(deadline);
          }
        }
      })
      .catch(() => {
        setMessage("Unable to load assessment. Please open your invitation link again.");
      });
  }, [driveId]);

  // Keep the waiting room in sync with the server schedule so a student who
  // opened the email early can start as soon as the window opens.
  useEffect(() => {
    if (!assessment || canStartExam || assessment.assessmentStatus === "Started" || assessment.assessmentStatus === "Completed") return;

    const refreshSchedule = () => {
      getAssessment(driveId)
        .then((response) => setAssessment(response.data))
        .catch(() => undefined);
    };
    const interval = window.setInterval(refreshSchedule, 10_000);
    return () => window.clearInterval(interval);
  }, [assessment, canStartExam, driveId]);

  // ── Load Questions ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasStartedExam || questions.length > 0) return;
    setLoadingQuestions(true);
    fetchAptitudeQuestions(driveId)
      .then(setQuestions)
      .finally(() => setLoadingQuestions(false));
  }, [hasStartedExam, driveId, questions.length]);

  // ── Server-Authoritative Timer ───────────────────────────────────────────────
  useEffect(() => {
    if (!aptitudeExpiresAt || !hasStartedExam) return;

    const tick = () => {
      const remaining = new Date(aptitudeExpiresAt).getTime() - Date.now();
      setTimeRemainingMs(remaining);

      if (remaining <= 5 * 60 * 1000 && remaining > 0) {
        setShowWarning(true);
      }

      if (remaining <= 0 && !hasSubmittedRef.current) {
        // Time expired — auto-submit
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        void handleAutoSubmit();
      }
    };

    tick(); // immediate first tick
    timerIntervalRef.current = setInterval(tick, 1000);
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [aptitudeExpiresAt, hasStartedExam]);

  // ── Proctoring arm ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasStartedExam) {
      setIsProctorArmed(false);
      return;
    }
    const timeout = window.setTimeout(() => setIsProctorArmed(true), 3000);
    return () => window.clearTimeout(timeout);
  }, [hasStartedExam]);

  // ── Tab / fullscreen violations ──────────────────────────────────────────────
  useEffect(() => {
    if (!hasStartedExam || !isProctorArmed) return;

    const handleVisibility = () => {
      if (document.hidden) addViolation("tab-switch", "Tab switch detected during assessment.");
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        addViolation("fullscreen", "Fullscreen mode exited during assessment.");
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    const handleKeydown = (e: KeyboardEvent) => {
      // Block copy-paste
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x"].includes(e.key)) {
        e.preventDefault();
        addViolation("copy-paste", "Copy-paste blocked during assessment.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeydown);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasStartedExam, isProctorArmed]);

  function addViolation(type: string, msg: string) {
    setProctoringViolations(prev => [...prev, { id: Date.now(), type, message: msg, timestamp: new Date().toISOString() }]);
    logProctoringEvent({ eventType: type, severity: "medium", message: msg, metadata: {}, occurredAt: new Date().toISOString() }).catch(() => undefined);
  }

  // ── Auto-save answers ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasStartedExam) return;
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveAssessmentAnswers(driveId, answers).catch(() => undefined);
    }, 800);
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [answers, hasStartedExam, driveId]);

  // ── Submit logic ─────────────────────────────────────────────────────────────
  const submitNow = useCallback(async (reason?: string) => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setIsSubmitting(true);

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    stopCamera();

    try {
      // Save latest answers first
      await saveAssessmentAnswers(driveId, answers).catch(() => undefined);

      // Submit — backend calculates score server-side
      const response = await submitAssessment(0, answers);
      const isQualified = Boolean(response.data.isAptitudeQualified || response.data.result === "Qualified");
      const nextRound = response.data.nextRound;

      setCompletionResult({
        score: response.data.score ?? 0,
        maxScore: response.data.maxScore ?? 100,
        isAptitudeQualified: isQualified,
        nextRound,
        message: reason ? `Assessment auto-submitted: ${reason}` : response.data.message,
      });
    } catch {
      hasSubmittedRef.current = false;
      setIsSubmitting(false);
      setMessage("Could not submit assessment. Please try again.");
    }
  }, [answers, driveId, isDemoMode, stopCamera]);

  const handleAutoSubmit = useCallback(() => {
    return submitNow("Time limit reached");
  }, [submitNow]);

  // ── Start exam ───────────────────────────────────────────────────────────────
  const handleStartExam = async () => {
    setMessage("");
    setIsSecuringExam(true);

    try {
      const stream = await requestCamera();
      if (!stream && !isDemoMode) {
        setMessage("Camera and microphone access are required before starting this proctored assessment. Please allow browser permissions and try again.");
        setIsSecuringExam(false);
        return;
      }

      // Enter fullscreen
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen().catch(() => undefined);
      }
      setIsFullscreen(true);

      // Start on backend
      const startResponse = await startAssessmentForDrive(driveId);
      const deadline = (startResponse.data as { aptitudeExpiresAt?: string }).aptitudeExpiresAt;

      // Reload assessment to get authoritative data
      const assessmentResponse = await getAssessment(driveId);
      setAssessment(assessmentResponse.data);
      setAnswers(assessmentResponse.data.answers || {});

      const serverDeadline = deadline
        || (assessmentResponse.data as AssessmentData & { aptitudeExpiresAt?: string }).aptitudeExpiresAt
        || (assessmentResponse.data.startedAt
          ? new Date(new Date(assessmentResponse.data.startedAt).getTime() + Number(assessmentResponse.data.durationMinutes) * 60 * 1000).toISOString()
          : new Date(Date.now() + Number(assessmentResponse.data.durationMinutes) * 60 * 1000).toISOString());

      setAptitudeExpiresAt(serverDeadline);
      setHasStartedExam(true);

    } catch (err: unknown) {
      const errMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage(errMessage || "Unable to start assessment. Please check your internet connection and try again.");
    } finally {
      setIsSecuringExam(false);
    }
  };

  // ── Render states ────────────────────────────────────────────────────────────

  // Submission success screen
  if (completionResult) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="w-full max-w-xl">
          <div className="rounded-3xl border border-emerald-400/20 bg-slate-800/80 backdrop-blur-xl p-10 text-center shadow-2xl shadow-emerald-900/30">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 ring-4 ring-emerald-500/20">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>

            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-400">
              Assessment Submitted
            </p>
            <h1 className="mt-3 text-3xl font-black text-white leading-tight">
              Assessment Submitted Successfully!
            </h1>
            <p className="mt-4 text-sm text-slate-300 leading-7">
              Your responses have been submitted successfully. You may now close this window.
            </p>

            {completionResult.message && (
              <div className="mt-5 rounded-xl border border-slate-600/40 bg-slate-700/50 px-5 py-4 text-left">
                <p className="text-sm text-slate-300">{completionResult.message}</p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              {completionResult.isAptitudeQualified && completionResult.nextRound === "Coding" ? (
                <button
                  type="button"
                  onClick={() => navigate(`/coding/${driveId}`, { state: { fromAptitude: true } })}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-extrabold text-white transition hover:bg-emerald-400"
                >
                  Proceed to Coding Round
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => navigate("/")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-600 px-6 text-sm font-bold text-slate-200 transition hover:bg-slate-700"
              >
                <Home className="h-4 w-4" />
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Pre-exam waiting room ────────────────────────────────────────────────────
  if (!hasStartedExam) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 px-5 py-6">
        <header className="mx-auto flex max-w-5xl items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src={logo} alt="Synthora" className="h-10 w-10" />
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">Synthora.AI</span>
          </a>
        </header>

        <div className="mx-auto mt-10 max-w-2xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-extrabold uppercase tracking-widest text-sky-600 dark:text-sky-400">
              {assessment?.currentRound || "Aptitude"} Assessment
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
              {assessment?.driveName || "Assessment"}
            </h1>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <InfoCard label="Company" value={assessment?.companyName || "-"} />
              <InfoCard label="Candidate" value={assessment?.studentName || "-"} />
              <InfoCard label="Duration" value={assessment ? `${assessment.durationMinutes} minutes` : "-"} />
              <InfoCard label="Round" value={assessment?.currentRound || "Aptitude"} />
            </div>

            {!canStartExam && assessment && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
                <Clock3 className="inline h-4 w-4 mr-1.5" />
                Assessment window has not opened yet. Please wait.
              </div>
            )}

            {message && (
              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300">
                <AlertTriangle className="inline h-4 w-4 mr-1.5" />
                {message}
              </div>
            )}

            <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/5">
              <p className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">Instructions</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <li>• Camera and microphone access required for proctoring.</li>
                <li>• Assessment will run in fullscreen mode.</li>
                <li>• Timer starts when you click "Start Assessment".</li>
                <li>• Do not switch tabs or exit fullscreen.</li>
                <li>• Assessment auto-submits when time expires.</li>
              </ul>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPrepModal(true)}
                disabled={!canStartExam || isSecuringExam}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-7 text-sm font-extrabold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-400"
              >
                <ShieldCheck className="h-5 w-5" />
                {isSecuringExam ? "Starting..." : "Start Proctored Assessment"}
              </button>
            </div>
          </div>
        </div>

        {/* Prep Modal */}
        {showPrepModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-sky-400/20 bg-slate-900 p-8 text-white shadow-2xl">
              <h3 className="text-2xl font-extrabold">Ready to begin?</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Clicking "Start" will:
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
                <li>• Request camera and microphone access</li>
                <li>• Enter fullscreen mode</li>
                <li>• Start the {assessment?.durationMinutes}-minute countdown</li>
              </ul>
              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPrepModal(false)}
                  className="flex-1 h-11 rounded-xl border border-white/15 text-sm font-bold text-slate-200 transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPrepModal(false); void handleStartExam(); }}
                  disabled={isSecuringExam}
                  className="flex-1 h-11 rounded-xl bg-sky-500 text-sm font-extrabold text-white transition hover:bg-sky-400 disabled:opacity-60"
                >
                  {isSecuringExam ? "Starting..." : "I'm Ready — Start"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // ── Active exam interface ────────────────────────────────────────────────────
  const timerWarning = timeRemainingMs !== null && timeRemainingMs <= 5 * 60 * 1000 && timeRemainingMs > 0;
  const timerCritical = timeRemainingMs !== null && timeRemainingMs <= 60 * 1000 && timeRemainingMs > 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <header className="flex h-14 items-center justify-between border-b border-slate-800 px-5">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Synthora" className="h-8 w-8" />
          <span className="text-sm font-extrabold text-white hidden sm:block">
            {assessment?.driveName || "Assessment"}
          </span>
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-lg font-black tabular-nums transition-colors ${
          timerCritical ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-400/40" :
          timerWarning ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-400/40" :
          "bg-slate-800 text-white"
        }`}>
          <Clock3 className="h-4 w-4 shrink-0" />
          {timeRemainingMs !== null ? formatTimer(timeRemainingMs) : "--:--"}
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:block text-slate-400 font-semibold">
            {answeredCount}/{questions.length} answered
          </span>
          <button
            type="button"
            onClick={() => setShowSubmitConfirm(true)}
            disabled={isSubmitting}
            className="h-9 rounded-xl bg-sky-500 px-4 text-sm font-extrabold text-white transition hover:bg-sky-400 disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </header>

      {/* ── Warning Banner ───────────────────────────────────────────────────── */}
      {showWarning && (
        <div className={`flex items-center gap-3 px-5 py-2.5 text-sm font-bold ${
          timerCritical ? "bg-rose-600/90 text-white" : "bg-amber-500/90 text-slate-900"
        }`}>
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {timerCritical
            ? "Less than 1 minute remaining. Assessment will auto-submit soon."
            : "Warning: Less than 5 minutes remaining. Please review and submit your answers."
          }
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar ─────────────────────────────────────────────────── */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 p-4 overflow-y-auto">
          {/* Camera Preview */}
          <div className="rounded-xl overflow-hidden border border-slate-700">
            {cameraStatus === "active" && cameraStream ? (
              <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full bg-slate-950 object-cover" />
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center bg-slate-800 gap-2">
                {cameraStatus === "denied" && <CameraOff className="h-8 w-8 text-rose-400" />}
                {cameraStatus === "unavailable" && <CameraOff className="h-8 w-8 text-amber-400" />}
                {cameraStatus === "idle" && <Camera className="h-8 w-8 text-slate-500" />}
                <p className="text-xs text-slate-400 px-3 text-center">
                  {cameraStatus === "denied" ? "Camera access denied" :
                   cameraStatus === "unavailable" ? "Camera unavailable" :
                   "Camera not active"}
                </p>
              </div>
            )}
            <p className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold ${
              cameraStatus === "active" ? "text-emerald-400" :
              cameraStatus === "denied" ? "text-rose-400" : "text-slate-400"
            }`}>
              {cameraStatus === "active" ? <Camera className="h-3.5 w-3.5" /> : <CameraOff className="h-3.5 w-3.5" />}
              {cameraStatus === "active" ? "Camera Active" :
               cameraStatus === "denied" ? "Camera Denied" :
               cameraStatus === "unavailable" ? "Camera Unavailable" : "Camera Off"}
            </p>
          </div>

          {/* Question Palette */}
          <div className="mt-5">
            <p className="text-xs font-extrabold uppercase text-slate-500 mb-3">Question Palette</p>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-9 w-full rounded-lg text-xs font-extrabold transition ${
                    idx === currentIndex
                      ? "bg-sky-500 text-white ring-2 ring-sky-400/50"
                      : answers[q.id]
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-1.5 text-xs text-slate-400">
              <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-sm bg-emerald-500/20 border border-emerald-500/40" /> Answered</div>
              <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-sm bg-slate-800" /> Not answered</div>
              <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-sm bg-sky-500" /> Current</div>
            </div>
          </div>

          {/* Proctoring violations summary */}
          {proctoringViolations.length > 0 && (
            <div className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3">
              <p className="text-xs font-bold text-rose-400">Violations: {proctoringViolations.length}</p>
            </div>
          )}
        </aside>

        {/* ── Question Panel ───────────────────────────────────────────────── */}
        <section className="flex-1 overflow-y-auto p-6 lg:p-8">
          {message && (
            <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-300">
              <AlertTriangle className="inline h-4 w-4 mr-1.5" />
              {message}
            </div>
          )}

          {loadingQuestions ? (
            <div className="flex items-center justify-center h-40 text-slate-400">
              Loading questions...
            </div>
          ) : !currentQuestion ? (
            <div className="flex items-center justify-center h-40 text-slate-400">
              No questions available.
            </div>
          ) : (
            <>
              {/* Question header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-extrabold uppercase text-sky-400 tracking-wider">
                    Question {currentIndex + 1} of {questions.length}
                  </p>
                  {currentQuestion.category && (
                    <p className="mt-0.5 text-xs text-slate-500">{currentQuestion.category}</p>
                  )}
                </div>
                <span className="text-xs text-slate-500 font-semibold">
                  {currentQuestion.marks} mark{currentQuestion.marks !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Question text */}
              <h2 className="text-lg font-bold text-white leading-8 select-none">
                {currentQuestion.question}
              </h2>

              {/* Options */}
              <div className="mt-6 grid gap-3 select-none"
                onCopyCapture={e => e.preventDefault()}
                onCutCapture={e => e.preventDefault()}
                onPasteCapture={e => e.preventDefault()}
                onContextMenuCapture={e => e.preventDefault()}
              >
                {currentQuestion.options.map((option, optIdx) => {
                  const selected = answers[currentQuestion.id] === option;
                  const letters = ["A", "B", "C", "D", "E"];
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion.id]: option }))}
                      className={`flex items-center gap-4 rounded-xl border px-5 py-4 text-left text-sm font-semibold transition ${
                        selected
                          ? "border-sky-500 bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30"
                          : "border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-500 hover:bg-slate-700/70"
                      }`}
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                        selected ? "bg-sky-500 text-white" : "bg-slate-700 text-slate-400"
                      }`}>
                        {letters[optIdx] || optIdx + 1}
                      </span>
                      {option}
                      {selected && <CheckCircle2 className="ml-auto h-5 w-5 text-sky-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Clear answer */}
              {answers[currentQuestion.id] && (
                <button
                  type="button"
                  onClick={() => setAnswers(prev => { const next = { ...prev }; delete next[currentQuestion.id]; return next; })}
                  className="mt-3 text-xs font-semibold text-slate-500 hover:text-rose-400 transition"
                >
                  <XCircle className="inline h-3.5 w-3.5 mr-1" />
                  Clear answer
                </button>
              )}

              {/* Navigation */}
              <div className="mt-8 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(i => Math.max(i - 1, 0))}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-700 px-5 text-sm font-bold text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </button>

                {currentIndex === questions.length - 1 ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowSubmitConfirm(true)}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-sky-500 px-6 text-sm font-extrabold text-white transition hover:bg-sky-400 disabled:opacity-60"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Assessment"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex(i => Math.min(i + 1, questions.length - 1))}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-700 px-5 text-sm font-bold text-white transition hover:bg-slate-600"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Mobile question palette */}
              <div className="mt-8 lg:hidden">
                <p className="text-xs font-extrabold uppercase text-slate-500 mb-3">Questions</p>
                <div className="flex flex-wrap gap-2">
                  {questions.map((q, idx) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-9 w-9 rounded-lg text-xs font-extrabold transition ${
                        idx === currentIndex ? "bg-sky-500 text-white" :
                        answers[q.id] ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" :
                        "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* ── Submit Confirmation Modal ────────────────────────────────────────── */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-7 text-white shadow-2xl">
            <h3 className="text-xl font-extrabold">Submit Assessment?</h3>
            <p className="mt-3 text-sm text-slate-300 leading-6">
              You have answered <strong className="text-white">{answeredCount}</strong> of{" "}
              <strong className="text-white">{questions.length}</strong> questions.
              {answeredCount < questions.length && (
                <span className="text-amber-400"> {questions.length - answeredCount} question(s) unanswered.</span>
              )}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Once submitted, you cannot change your answers.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 h-11 rounded-xl border border-slate-600 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
              >
                Review Answers
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => { setShowSubmitConfirm(false); void submitNow(); }}
                className="flex-1 h-11 rounded-xl bg-sky-500 text-sm font-extrabold text-white transition hover:bg-sky-400 disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Yes, Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-3">
      <p className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
