import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, Camera, CheckCircle2, Clock3, Maximize2, ShieldCheck } from "lucide-react";
import ThemeToggle from "../../components/ThemeToggle";
import { ProctoringGuard } from "../../components/ProctoringGuard";
import { ProctoringReport } from "../../components/ProctoringReport";
import { getAssessment, saveAssessmentAnswers, startAssessmentForDrive, submitAssessment, type AssessmentData } from "../../services/studentService";
import { useCountdown } from "../../hooks/useCountdown";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import { useFaceDetection } from "../../hooks/useFaceDetection";
import { useTabFocusMonitor } from "../../hooks/useTabFocusMonitor";
import { DEFAULT_PROCTORING_CONFIG, evaluateViolationState, isScreenshotShortcut } from "../../utils/proctoringViolationLogic";
import { logProctoringEvent } from "../../services/proctoringService";
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

interface ProctoringViolation {
  id: number;
  type: string;
  message: string;
  timestamp: string;
}

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
  const [isMicReady, setIsMicReady] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showPrepModal, setShowPrepModal] = useState(false);
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [proctoringWarning, setProctoringWarning] = useState<string | null>(null);
  const [proctoringViolations, setProctoringViolations] = useState<ProctoringViolation[]>([]);
  const [violationCount, setViolationCount] = useState(0);
  const [isAutoSubmitted, setIsAutoSubmitted] = useState(false);
  const [copyPasteToast, setCopyPasteToast] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(Boolean(typeof window !== "undefined" && !window.localStorage.getItem("synthora-token")));
  const hasSubmittedRef = useRef(false);
  const violationCountRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const examEndAt = useMemo(() => {
    if (!assessment?.startedAt) {
      return "";
    }

    return new Date(new Date(assessment.startedAt).getTime() + Number(assessment.durationMinutes) * 60 * 1000).toISOString();
  }, [assessment?.durationMinutes, assessment?.startedAt]);
  const fallbackStartTarget = useMemo(() => assessment?.examStartAt ?? new Date().toISOString(), [assessment?.examStartAt]);
  const startCountdown = useCountdown(fallbackStartTarget);
  const examCountdown = useCountdown(examEndAt || new Date().toISOString());
  const activeCountdown = hasStartedExam && examEndAt ? examCountdown : startCountdown;
  const currentQuestion = questions[currentIndex];
  const proctorReady = isDemoMode ? Boolean(isFullscreen && isMicReady && isCameraReady) : Boolean(cameraStream && isFullscreen && isMicReady && isCameraReady);
  const canStartExam =
    Boolean(assessment) &&
    (isDemoMode || (
      startCountdown.days === 0 &&
      startCountdown.hours === 0 &&
      startCountdown.minutes === 0 &&
      startCountdown.seconds === 0
    ));

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

  const addViolation = useCallback(async (type: string, message: string, metadata?: Record<string, unknown>) => {
    const currentState = { violationCount: violationCountRef.current, autoSubmitted: isAutoSubmitted };
    const result = evaluateViolationState(currentState, {
      type,
      message,
      severity: "high",
      metadata,
    }, DEFAULT_PROCTORING_CONFIG);

    violationCountRef.current = result.violationCount;
    setViolationCount(result.violationCount);
    setProctoringViolations((current) => [
      ...current,
      { id: Date.now(), type, message, timestamp: new Date().toISOString() },
    ]);
    setProctoringWarning(message);
    setProctorViolation(message);

    try {
      await logProctoringEvent({
        eventType: type,
        severity: "high",
        message,
        metadata,
        occurredAt: new Date().toISOString(),
      });
    } catch {
      // Swallow logging failures so the assessment continues gracefully.
    }

    if (result.shouldAutoSubmit && !hasSubmittedRef.current) {
      setIsAutoSubmitted(true);
      await submitNow(`Assessment terminated due to policy violation: ${message}`);
    }
  }, [isAutoSubmitted, submitNow]);

  useEffect(() => {
    getAssessment(driveId)
      .then((response) => {
        setAssessment(response.data);
        setAnswers(response.data.answers || {});
        setHasStartedExam(response.data.assessmentStatus === "Started");
        setIsDemoMode(Boolean(typeof window !== "undefined" && !window.localStorage.getItem("synthora-token")));
      })
      .catch(() => {
        setMessage("Unable to load assessment. Please open your invitation link again.");
        setIsDemoMode(true);
      });
  }, [driveId]);

  useEffect(() => {
    if (videoRef.current && cameraStream && videoRef.current.srcObject !== cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => undefined);
    }
  }, [cameraStream]);

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

  const handleProctorViolation = useCallback((reason: string, details?: { eventType?: string; metadata?: Record<string, unknown> }) => {
    if (!hasStartedExam || !proctorReady || !isProctorArmed || hasSubmittedRef.current) {
      return;
    }

    void addViolation(details?.eventType ?? "policy", reason, details?.metadata);
    setMessage(`${reason} This incident has been logged.`);
  }, [addViolation, hasStartedExam, isProctorArmed, proctorReady]);

  const { warning: faceWarning } = useFaceDetection({
    stream: cameraStream,
    isEnabled: hasStartedExam && isFullscreen && isProctorArmed,
    onFaceMissing: () => {
      void addViolation("face", "Face not detected. Please stay within camera view.", { source: "face-detection" });
    },
  });

  const { warning: deviceWarning } = useDeviceDetection({
    stream: cameraStream,
    isEnabled: hasStartedExam && isFullscreen && isProctorArmed,
    onDeviceDetected: () => {
      void addViolation("device", "Malpractice detected: external device found. This incident has been logged.", { source: "device-detection" });
    },
  });

  useTabFocusMonitor({
    isActive: hasStartedExam && isFullscreen && isProctorArmed,
    onViolation: handleProctorViolation,
  });

  useEffect(() => {
    if (!hasStartedExam || !proctorReady || !isProctorArmed) {
      return;
    }

    const warningMessage = [faceWarning, deviceWarning].filter(Boolean).join(" ");
    if (warningMessage) {
      setProctoringWarning(warningMessage);
      setMessage(warningMessage);
    }
  }, [deviceWarning, faceWarning, hasStartedExam, isProctorArmed, proctorReady]);

  useEffect(() => {
    if (!copyPasteToast) {
      return;
    }

    const timeout = window.setTimeout(() => setCopyPasteToast(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [copyPasteToast]);

  useEffect(() => {
    if (!hasStartedExam || !proctorReady || !isProctorArmed) {
      return;
    }

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
    const handleCopyPaste = (event: KeyboardEvent) => {
      const shortcutPressed = (event.ctrlKey || event.metaKey) && (event.key === "c" || event.key === "v" || event.key === "x");
      if (shortcutPressed) {
        event.preventDefault();
        setCopyPasteToast("Copy-paste is disabled during this assessment.");
        void logProctoringEvent({
          eventType: "copy-paste",
          severity: "medium",
          message: "Copy-paste attempt blocked",
          metadata: { key: event.key, source: "keyboard-shortcut" },
          occurredAt: new Date().toISOString(),
        }).catch(() => undefined);
      }
    };

    const handleScreenshotCapture = (event: KeyboardEvent) => {
      if (!isScreenshotShortcut(event)) {
        return;
      }

      event.preventDefault();
      void handleProctorViolation("Screenshot capture is not allowed during this assessment.", {
        eventType: "screenshot",
        metadata: { key: event.key, code: event.code, source: "keyboard-shortcut" },
      });
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleCopyPaste);
    document.addEventListener("keydown", handleScreenshotCapture);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleCopyPaste);
      document.removeEventListener("keydown", handleScreenshotCapture);
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
    setProctoringWarning(null);
    setHasPermissionError(false);
    setIsSecuringExam(true);

    let stream: MediaStream | null = null;

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setCameraStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            void videoRef.current.play().catch(() => undefined);
          }
          setIsMicReady(true);
          setIsCameraReady(true);
        } catch {
          if (!isDemoMode) {
            setMessage("Camera and microphone access are required before the assessment can begin.");
            return;
          }
          setMessage("Camera access was not granted, so the assessment will continue in demo mode.");
        }
      }

      if (!document.fullscreenElement) {
        try {
          await document.documentElement.requestFullscreen();
        } catch {
          setMessage("Fullscreen mode is recommended so the proctoring checks can run properly.");
        }
      }
      setIsFullscreen(true);

      setHasStartedExam(true);

      if (isDemoMode) {
        setIsMicReady(true);
        setIsCameraReady(Boolean(stream));
        void startAssessmentForDrive(driveId).catch(() => undefined);
        try {
          const response = await getAssessment(driveId);
          setAssessment(response.data);
        } catch {
          setMessage("Assessment started locally. Backend sync may be delayed.");
        }
        return;
      }

      void startAssessmentForDrive(driveId).catch(() => undefined);
      try {
        const response = await getAssessment(driveId);
        setAssessment(response.data);
      } catch {
        setMessage("Assessment started locally. Backend sync may be delayed.");
      }
    } catch (error) {
      const activeStream = stream as MediaStream | null;
      activeStream?.getTracks?.().forEach((track: MediaStreamTrack) => track.stop());
      setCameraStream(null);
      setIsMicReady(false);
      setIsCameraReady(false);

      if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError")) {
        setHasPermissionError(true);
        setMessage("Microphone and camera access are required before the assessment can begin.");
        return;
      }

      setMessage("The assessment can only start during the official exam window and requires camera, microphone, and fullscreen access.");
    } finally {
      setIsSecuringExam(false);
    }
  };

  const handleSubmit = async () => {
    await submitNow();
  };

  if (isAutoSubmitted && hasSubmittedRef.current) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-rose-400/30 bg-white/10 p-8 text-center shadow-2xl shadow-rose-950/40">
          <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-rose-300">Assessment terminated</p>
          <h1 className="mt-3 text-3xl font-extrabold">Test submitted due to policy violation</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Your assessment was automatically submitted because a proctoring violation was recorded. Please contact the administrator if you believe this was a mistake.
          </p>
        </div>
      </main>
    );
  }

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
              {cameraStream ? (
                <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full bg-slate-950 object-cover" />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-slate-950 px-4 text-center text-sm font-semibold text-slate-200">
                  Camera preview will appear once browser access is granted.
                </div>
              )}
              <p className="flex items-center gap-2 px-4 py-3 text-xs font-extrabold uppercase text-emerald-700 dark:text-emerald-200">
                <Camera className="h-4 w-4" />
                {cameraStream ? "Camera Monitoring Active" : "Camera preview pending"}
              </p>
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">Rules</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
              <li>Stable Internet Connection</li>
              <li>Camera must remain ON</li>
              <li>Microphone access is required</li>
              <li>Fullscreen mode is required</li>
              <li>Do not refresh page or switch tabs</li>
              <li>Screenshot attempts are monitored</li>
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
              {isDemoMode ? (
                <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
                  Demo mode is active. The assessment is running locally so proctoring features can be tested without a student session.
                </div>
              ) : null}

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
                  onClick={() => setShowPrepModal(true)}
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
                  Camera, microphone, and fullscreen mode are required before questions are shown.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPrepModal(true)}
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

              <ProctoringGuard
                isActive={hasStartedExam && proctorReady}
                isMicReady={isMicReady}
                isCameraReady={isCameraReady}
                hasPermissionError={hasPermissionError}
                violationCount={violationCount}
                warningMessage={proctoringWarning}
              >
                <div className="mb-4">
                  <ProctoringReport title="Live proctoring report" violations={proctoringViolations} />
                </div>
                {copyPasteToast ? (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
                    {copyPasteToast}
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-extrabold text-slate-500 dark:text-slate-400">
                    Question {currentIndex + 1} of {questions.length}
                  </p>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{Object.keys(answers).length}/{questions.length} answered</p>
                </div>

                <h2 className="mt-4 text-xl font-extrabold text-slate-950 dark:text-white">{currentQuestion.question}</h2>

                <div className="mt-5 grid gap-3 select-none" onCopyCapture={(event) => { event.preventDefault(); setCopyPasteToast("Copy-paste is disabled during this assessment."); void logProctoringEvent({ eventType: "copy-paste", severity: "medium", message: "Copy attempt blocked", metadata: { source: "copy-capture" }, occurredAt: new Date().toISOString() }).catch(() => undefined); }} onCutCapture={(event) => { event.preventDefault(); setCopyPasteToast("Copy-paste is disabled during this assessment."); void logProctoringEvent({ eventType: "copy-paste", severity: "medium", message: "Cut attempt blocked", metadata: { source: "cut-capture" }, occurredAt: new Date().toISOString() }).catch(() => undefined); }} onPasteCapture={(event) => { event.preventDefault(); setCopyPasteToast("Copy-paste is disabled during this assessment."); void logProctoringEvent({ eventType: "copy-paste", severity: "medium", message: "Paste attempt blocked", metadata: { source: "paste-capture" }, occurredAt: new Date().toISOString() }).catch(() => undefined); }} onContextMenuCapture={(event) => { event.preventDefault(); setCopyPasteToast("Copy-paste is disabled during this assessment."); void logProctoringEvent({ eventType: "copy-paste", severity: "medium", message: "Context menu blocked", metadata: { source: "context-menu" }, occurredAt: new Date().toISOString() }).catch(() => undefined); }}>
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
                    disabled={currentIndex === 0 || isSubmitting}
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
              </ProctoringGuard>
            </>
          )}
        </section>
      </section>

      {showPrepModal ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-sky-400/20 bg-slate-900 p-6 text-white shadow-2xl shadow-sky-950/40">
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-sky-300">Before you begin</p>
            <h3 className="mt-3 text-2xl font-extrabold">Close other applications and keep this tab active</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              The assessment will monitor your browser focus, microphone, and camera throughout the exam. Please leave any other apps or tabs closed and continue only when you are ready.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowPrepModal(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 px-4 text-sm font-bold text-slate-200 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPrepModal(false);
                  void handleStartExam();
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-sky-500 px-5 text-sm font-extrabold text-slate-950 transition hover:bg-sky-400"
              >
                I’m ready to begin
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
