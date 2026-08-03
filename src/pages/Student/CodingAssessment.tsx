import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Camera, CheckCircle2, Clock3, Code2, Maximize2, Play, Send, ShieldCheck, XCircle } from "lucide-react";
import Editor from "@monaco-editor/react";
import ThemeToggle from "../../components/ThemeToggle";
import { ProctoringGuard } from "../../components/ProctoringGuard";
import { ProctoringReport } from "../../components/ProctoringReport";
import { useCountdown } from "../../hooks/useCountdown";
import { useTabFocusMonitor } from "../../hooks/useTabFocusMonitor";
import { useFaceDetection } from "../../hooks/useFaceDetection";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import { DEFAULT_PROCTORING_CONFIG, evaluateViolationState, isScreenshotShortcut } from "../../utils/proctoringViolationLogic";
import { logProctoringEvent } from "../../services/proctoringService";
import { getCodingAssessment, getCodingQuestions, runCode, submitCodingRound, type CodingQuestion, type CodingAssessmentData, type TestResult } from "../../services/codingService";
import logo from "../../../images/logo.png";

export default function CodingAssessment() {
  const { driveId = "" } = useParams();
  const navigate = useNavigate();

  // Data States
  const [assessmentData, setAssessmentData] = useState<CodingAssessmentData | null>(null);
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(Boolean(typeof window !== "undefined" && !window.localStorage.getItem("synthora-token")));

  // Proctoring States (matches Assessment.tsx)
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
  const [proctoringViolations, setProctoringViolations] = useState<{id: number; type: string; message: string; timestamp: string}[]>([]);
  const [violationCount, setViolationCount] = useState(0);
  const [isAutoSubmitted, setIsAutoSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasSubmittedRef = useRef(false);
  const violationCountRef = useRef(0);

  // Editor States
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [solutions, setSolutions] = useState<Record<string, { language: string; code: string }>>({});
  const [testResults, setTestResults] = useState<Record<string, TestResult[]>>({});
  const [runningCode, setRunningCode] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains("dark"));

  const proctorReady = isDemoMode ? Boolean(isFullscreen && isMicReady && isCameraReady) : Boolean(cameraStream && isFullscreen && isMicReady && isCameraReady);
  const canStartExam = Boolean(assessmentData); // Simplified for coding round

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          setIsDarkMode(document.documentElement.classList.contains("dark"));
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!driveId) {
        setError("No drive ID provided");
        setLoading(false);
        return;
      }

      // Load assessment metadata first — this determines whether the page can render at all.
      try {
        const assessmentRes = await getCodingAssessment(driveId);
        setAssessmentData(assessmentRes.data);
      } catch {
        setError("Failed to load coding assessment. Please check your session or contact support.");
        setLoading(false);
        return;
      }

      // Load questions separately so a transient questions error does not blank the whole page.
      try {
        const questionsRes = await getCodingQuestions(driveId);
        // Backend returns { questions: [...] }; guard against a bare array for resilience.
        const raw = questionsRes.data;
        const fetchedQuestions: CodingQuestion[] = Array.isArray(raw)
          ? (raw as unknown as CodingQuestion[])
          : ((raw as { questions: CodingQuestion[] }).questions ?? []);

        setQuestions(fetchedQuestions);

        if (fetchedQuestions.length > 0) {
          setActiveQuestionId(fetchedQuestions[0]._id);
          const initialSolutions: Record<string, { language: string; code: string }> = {};
          fetchedQuestions.forEach((q) => {
            initialSolutions[q._id] = {
              language: "javascript",
              code: q.starterCode?.javascript || "// Write your solution here",
            };
          });
          setSolutions(initialSolutions);
        } else {
          setMessage("No coding questions are configured for this drive yet.");
        }
      } catch {
        // The assessment page still renders; questions panel will show a message.
        setMessage("Could not load questions. Please refresh the page.");
      }

      setLoading(false);
    }
    loadData();
  }, [driveId]);

  // Timer logic
  const timerEndAt = useMemo(() => {
    if (!assessmentData) return null;
    if (assessmentData.startedAt) {
      const start = new Date(assessmentData.startedAt).getTime();
      return new Date(start + assessmentData.codingDurationMinutes * 60000).toISOString();
    }
    return assessmentData.examEndAt || null;
  }, [assessmentData]);

  const countdown = useCountdown(hasStartedExam && timerEndAt ? timerEndAt : new Date().toISOString());

  // Submit Logic
  const submitNow = useCallback(async (reason?: string) => {
    if (hasSubmittedRef.current || !driveId) return;
    
    hasSubmittedRef.current = true;
    setIsSubmitting(true);

    if (reason) {
      setProctorViolation(reason);
      setMessage(`${reason} Your assessment is being submitted.`);
    }

    try {
      const payload = {
        driveId,
        solutions: Object.entries(solutions).map(([qId, sol]) => ({
          questionId: qId,
          language: sol.language,
          sourceCode: sol.code
        }))
      };
      const response = await submitCodingRound(payload);
      setMessage(`Submission successful! Score: ${response.data.codingScore}/${response.data.maxCodingScore}.`);
      window.setTimeout(() => {
        // If HR is configured as nextRound, they still go to dashboard where it will be displayed as pending/locked
        navigate("/student/dashboard");
      }, 1200);
    } catch (err) {
      hasSubmittedRef.current = false;
      setMessage("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
      setShowSubmitConfirm(false);
    }
  }, [driveId, solutions, navigate]);

  // Auto-submit on timer end
  useEffect(() => {
    if (hasStartedExam && timerEndAt && Date.now() >= new Date(timerEndAt).getTime()) {
      void submitNow("Time is over.");
    }
  }, [countdown, timerEndAt, hasStartedExam, submitNow]);

  // Proctoring violation handler
  const addViolation = useCallback(async (type: string, message: string, metadata?: Record<string, unknown>) => {
    const currentState = { violationCount: violationCountRef.current, autoSubmitted: isAutoSubmitted };
    const result = evaluateViolationState(currentState, {
      type,
      message,
      severity: "high",
      metadata: { ...metadata, round: "Coding" },
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
        metadata: { ...metadata, round: "Coding" },
        occurredAt: new Date().toISOString(),
      });
    } catch {}

    if (result.shouldAutoSubmit && !hasSubmittedRef.current) {
      setIsAutoSubmitted(true);
      await submitNow(`Assessment terminated due to policy violation: ${message}`);
    }
  }, [isAutoSubmitted, submitNow]);

  const handleProctorViolation = useCallback((reason: string, details?: { eventType?: string; metadata?: Record<string, unknown> }) => {
    if (!hasStartedExam || !proctorReady || !isProctorArmed || hasSubmittedRef.current) return;
    void addViolation(details?.eventType ?? "policy", reason, details?.metadata);
    setMessage(`${reason} This incident has been logged.`);
  }, [addViolation, hasStartedExam, isProctorArmed, proctorReady]);

  // Screen events
  useEffect(() => {
    if (!hasStartedExam || !proctorReady || !isProctorArmed) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleProctorViolation("Fullscreen mode was exited.");
      }
    };
    
    // Allow copy-paste inside the Monaco editor but we can log suspicious keyboard events elsewhere if we wanted
    const handleScreenshotCapture = (event: KeyboardEvent) => {
      if (isScreenshotShortcut(event)) {
        event.preventDefault();
        void handleProctorViolation("Screenshot capture is not allowed during this assessment.", {
          eventType: "screenshot",
          metadata: { key: event.key, code: event.code, source: "keyboard-shortcut" },
        });
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleScreenshotCapture);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleScreenshotCapture);
    };
  }, [handleProctorViolation, hasStartedExam, isProctorArmed, proctorReady]);

  // Video streaming sync
  useEffect(() => {
    if (videoRef.current && cameraStream && videoRef.current.srcObject !== cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => undefined);
    }
  }, [cameraStream]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  // Arm proctoring after delay
  useEffect(() => {
    if (!hasStartedExam || !proctorReady) {
      setIsProctorArmed(false);
      return;
    }
    const timeout = window.setTimeout(() => setIsProctorArmed(true), 3000);
    return () => window.clearTimeout(timeout);
  }, [hasStartedExam, proctorReady]);

  // Hooks
  const { faceStatus, warning: faceWarning } = useFaceDetection({
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
    if (!hasStartedExam || !proctorReady || !isProctorArmed) return;
    const warningMessage = [faceWarning, deviceWarning].filter(Boolean).join(" ");
    if (warningMessage) {
      setProctoringWarning(warningMessage);
      setMessage(warningMessage);
    }
  }, [deviceWarning, faceWarning, hasStartedExam, isProctorArmed, proctorReady]);


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
      }
    } catch (error) {
      const activeStream = stream as MediaStream | null;
      activeStream?.getTracks?.().forEach((track: MediaStreamTrack) => track.stop());
      setCameraStream(null);
      setIsMicReady(false);
      setIsCameraReady(false);
      
      setHasPermissionError(true);
      setMessage("Microphone and camera access are required before the assessment can begin.");
    } finally {
      setIsSecuringExam(false);
    }
  };

  const handleRunCode = async () => {
    if (!activeQuestionId || !driveId) return;
    setRunningCode(true);
    const sol = solutions[activeQuestionId];
    try {
      const res = await runCode({
        questionId: activeQuestionId,
        language: sol.language,
        sourceCode: sol.code,
        driveId
      });
      setTestResults(prev => ({ ...prev, [activeQuestionId]: res.data.results }));
    } catch (err) {
      alert("Failed to run code");
    } finally {
      setRunningCode(false);
    }
  };

  const activeQuestion = questions.find(q => q._id === activeQuestionId);
  const activeSolution = activeQuestionId ? solutions[activeQuestionId] : null;
  const activeTestResults = activeQuestionId ? testResults[activeQuestionId] : null;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 dark:text-white">Loading...</div>;
  }

  if (error || !assessmentData) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-rose-500 dark:bg-slate-950">{error || "Assessment not found"}</div>;
  }

  if (isAutoSubmitted && hasSubmittedRef.current) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-rose-400/30 bg-white/10 p-8 text-center shadow-2xl shadow-rose-950/40">
          <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-rose-300">Assessment terminated</p>
          <h1 className="mt-3 text-3xl font-extrabold">Test submitted due to policy violation</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Your assessment was automatically submitted because a proctoring violation was recorded.
          </p>
          <button onClick={() => navigate("/student/dashboard")} className="mt-6 px-6 py-2 bg-white text-slate-900 rounded-xl font-medium">Return to Dashboard</button>
        </div>
      </main>
    );
  }

  if (!hasStartedExam || !proctorReady) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-6 font-inter text-slate-950 dark:bg-slate-950 dark:text-white sm:px-8">
        <header className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="h-10 w-10" />
            <span className="text-xl font-extrabold">Synthora.AI</span>
          </div>
          <ThemeToggle />
        </header>

        <section className="mx-auto mt-8 max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/10">
          {message ? (
            <p className="mb-4 rounded-xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700 dark:bg-sky-400/10 dark:text-sky-200">
              {message}
            </p>
          ) : null}

          <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">Coding Round</p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">{assessmentData?.driveName ?? "Assessment"}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Candidate: {assessmentData?.studentName}</p>
            </div>

            <div className="bg-sky-50 dark:bg-sky-500/10 rounded-xl p-6 border border-sky-100 dark:border-sky-500/20">
              <h3 className="font-semibold text-sky-900 dark:text-sky-300 mb-4">Proctoring Requirements</h3>
              <ul className="space-y-3 text-sm text-sky-800 dark:text-sky-200 font-medium">
                <li className="flex items-center gap-2"><Camera className="w-4 h-4" /> Camera and Microphone must remain on</li>
                <li className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Assessment will be fullscreen</li>
                <li className="flex items-center gap-2"><Code2 className="w-4 h-4" /> Tab switching is monitored</li>
              </ul>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowPrepModal(true)}
                disabled={!canStartExam || isSecuringExam}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-sky-400 dark:text-slate-950"
              >
                {isSecuringExam ? <Maximize2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                {isSecuringExam ? "Securing..." : "Start Proctored Assessment"}
              </button>
            </div>
          </div>
        </section>

        {showPrepModal && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/80 px-4">
            <div className="w-full max-w-lg rounded-3xl border border-sky-400/20 bg-slate-900 p-6 text-white shadow-2xl shadow-sky-950/40">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-sky-300">Before you begin</p>
              <h3 className="mt-3 text-2xl font-extrabold">Close other applications and keep this tab active</h3>
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
                  onClick={() => { setShowPrepModal(false); void handleStartExam(); }}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-sky-500 px-5 text-sm font-extrabold text-slate-950 transition hover:bg-sky-400"
                >
                  I’m ready to begin
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden font-inter text-slate-900 dark:text-white">
      {/* Hidden video element for face detection processing */}
      <video ref={videoRef} className="hidden" autoPlay playsInline muted />

      {/* Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <img src={logo} alt="Synthora" className="h-8" />
          <div className="h-8 w-px bg-slate-200 dark:bg-white/10"></div>
          <div>
            <h1 className="font-extrabold text-lg leading-tight">{assessmentData.driveName}</h1>
            <p className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Coding Round</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {message && <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{message}</span>}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-800 dark:text-slate-200 font-mono text-sm font-bold border border-slate-200 dark:border-slate-700">
            <Clock3 className="w-4 h-4 text-sky-500" />
            {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
          </div>
          <button onClick={() => setShowSubmitConfirm(true)} disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-sky-400 dark:hover:bg-sky-300 dark:text-slate-950 text-white rounded-xl font-extrabold text-sm transition-colors">
            <Send className="w-4 h-4" />
            Submit All
          </button>
        </div>
      </header>

      {/* Proctoring Guard Bar */}
      <div className="shrink-0 bg-white dark:bg-slate-900 px-4 py-2 border-b border-slate-200 dark:border-white/10">
        <ProctoringGuard 
          isActive={hasStartedExam && proctorReady} 
          isMicReady={isMicReady}
          isCameraReady={isCameraReady}
          hasPermissionError={hasPermissionError}
          violationCount={violationCount}
          warningMessage={proctoringWarning}
        >
          <div className="mt-2">
            <ProctoringReport title="Live proctoring" violations={proctoringViolations} />
          </div>
        </ProctoringGuard>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Questions */}
        <div className="w-1/3 min-w-[350px] max-w-lg bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10 flex flex-col z-0">
          <div className="flex overflow-x-auto border-b border-slate-200 dark:border-white/10 shrink-0 bg-slate-50 dark:bg-slate-950/50">
            {questions.map((q, idx) => (
              <button 
                key={q._id} 
                onClick={() => setActiveQuestionId(q._id)}
                className={`px-5 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeQuestionId === q._id ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
              >
                Question {idx + 1}
              </button>
            ))}
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {activeQuestion ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-xl font-extrabold">{activeQuestion.title}</h2>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                      activeQuestion.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                      activeQuestion.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                      'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                    }`}>
                      {activeQuestion.difficulty}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">{activeQuestion.description}</p>
                </div>
                
                {activeQuestion.constraints?.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4 border border-amber-100 dark:border-amber-500/20">
                    <h4 className="text-xs font-extrabold text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-2">Constraints</h4>
                    <ul className="list-disc pl-4 text-sm text-amber-900 dark:text-amber-200 font-mono space-y-1">
                      {activeQuestion.constraints.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}

                {activeQuestion.examples.map((ex, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-white/10">
                    <h4 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Example {i + 1}</h4>
                    <div className="space-y-3 text-sm">
                      <div><span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Input:</span> <code className="block p-2 bg-white dark:bg-black/40 rounded border border-slate-100 dark:border-white/5">{ex.input}</code></div>
                      <div><span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Output:</span> <code className="block p-2 bg-white dark:bg-black/40 rounded border border-slate-100 dark:border-white/5">{ex.output}</code></div>
                      {ex.explanation && <div><span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Explanation:</span> <span className="text-slate-600 dark:text-slate-400">{ex.explanation}</span></div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Panel - Editor & Results */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#1e1e1e]">
          <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
            <select 
              value={activeSolution?.language || "javascript"}
              onChange={(e) => {
                if (activeQuestionId) {
                  setSolutions(prev => ({
                    ...prev,
                    [activeQuestionId]: { 
                      ...prev[activeQuestionId], 
                      language: e.target.value,
                      code: prev[activeQuestionId]?.code || activeQuestion?.starterCode[e.target.value as keyof typeof activeQuestion.starterCode] || "" 
                    }
                  }));
                }
              }}
              className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 py-2 px-4 focus:ring-2 focus:ring-sky-500 outline-none"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
            </select>
            
            <button 
              onClick={handleRunCode}
              disabled={runningCode}
              className="flex items-center gap-2 px-5 py-2 bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/20 dark:hover:bg-sky-500/30 text-sky-700 dark:text-sky-300 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 border border-sky-200 dark:border-sky-500/30"
            >
              <Play className="w-4 h-4" />
              {runningCode ? "Running..." : "Run Code"}
            </button>
          </div>

          <div className="flex-1 shrink-0 h-[55%] relative">
            <Editor
              height="100%"
              language={activeSolution?.language === "python" ? "python" : "javascript"}
              theme={isDarkMode ? "vs-dark" : "light"}
              value={activeSolution?.code || ""}
              onChange={(val) => {
                if (activeQuestionId && val !== undefined) {
                  setSolutions(prev => ({
                    ...prev,
                    [activeQuestionId]: { ...prev[activeQuestionId], code: val }
                  }));
                }
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                roundedSelection: true,
              }}
            />
          </div>

          {/* Test Results */}
          <div className="flex-1 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 overflow-y-auto p-4 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)]">
            <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">Test Results</h3>
            {activeTestResults ? (
              <div className="space-y-4">
                {activeTestResults.map((tr, i) => (
                  <div key={i} className={`p-5 rounded-2xl border ${tr.passed ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' : 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20'}`}>
                    <div className="flex items-center gap-2 mb-4">
                      {tr.passed ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-500" />}
                      <span className={`font-extrabold ${tr.passed ? 'text-emerald-800 dark:text-emerald-400' : 'text-rose-800 dark:text-rose-400'}`}>
                        Test Case {i + 1}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1.5 uppercase tracking-wider text-[10px]">Input</span>
                        <div className="p-3 bg-white/60 dark:bg-black/30 rounded-lg border border-slate-200/50 dark:border-white/5 break-all">{tr.input}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1.5 uppercase tracking-wider text-[10px]">Expected Output</span>
                        <div className="p-3 bg-white/60 dark:bg-black/30 rounded-lg border border-slate-200/50 dark:border-white/5 break-all">{tr.expectedOutput}</div>
                      </div>
                    </div>
                    {!tr.passed && (
                      <div className="mt-4 text-xs font-mono">
                        <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1.5 uppercase tracking-wider text-[10px]">Actual Output / Error</span>
                        <div className="p-3 bg-white/60 dark:bg-black/30 rounded-lg border border-rose-200/50 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 whitespace-pre-wrap break-all">{tr.error || tr.actualOutput}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center justify-center h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                Run code to see test results.
              </div>
            )}
          </div>
        </div>
      </main>

      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-white/10">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Send className="w-8 h-8 ml-1" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3">Submit Assessment?</h2>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">Are you sure you want to submit? This will submit all your solutions. You cannot change your answers after submission.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowSubmitConfirm(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-extrabold transition-colors">
                  Cancel
                </button>
                <button onClick={() => void submitNow()} disabled={isSubmitting} className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-sky-400 dark:hover:bg-sky-300 text-white dark:text-slate-950 rounded-xl font-extrabold transition-colors disabled:opacity-50">
                  {isSubmitting ? "Submitting..." : "Submit All"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
