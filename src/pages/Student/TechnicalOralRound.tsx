import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Camera,
  CheckCircle2,
  Clock,
  Loader2,
  Maximize2,
  Mic,
  MicOff,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import ThemeToggle from "../../components/ThemeToggle";
import { ProctoringGuard } from "../../components/ProctoringGuard";
import { useDeviceDetection } from "../../hooks/useDeviceDetection";
import { useFaceDetection } from "../../hooks/useFaceDetection";
import { useTabFocusMonitor } from "../../hooks/useTabFocusMonitor";
import { DEFAULT_PROCTORING_CONFIG, evaluateViolationState } from "../../utils/proctoringViolationLogic";
import { logProctoringEvent } from "../../services/proctoringService";
import {
  getOralSession,
  startOralInterview,
  submitOralAnswer,
  type OralAnswerResponse,
  type OralInterviewSession,
  type OralQuestionTurn,
} from "../../services/oralInterviewService";
import logo from "../../../images/logo.png";

const QUESTION_TIME_LIMIT = 90; // 90 seconds per question
const DEMO_DRIVE_ID = "demo";

const DEMO_QUESTIONS: OralQuestionTurn[] = [
  {
    questionNumber: 1,
    category: "Fundamental",
    question: "Can you explain the difference between synchronous and asynchronous execution in JavaScript?",
  },
  {
    questionNumber: 2,
    category: "Conceptual",
    question: "How does React state management work, and when would you move state into a shared store?",
  },
  {
    questionNumber: 3,
    category: "Practical",
    question: "Walk me through how you would design and secure a REST API endpoint for user login.",
  },
  {
    questionNumber: 4,
    category: "Scenario",
    question: "An API is slow during peak traffic. What steps would you take to diagnose and improve it?",
  },
  {
    questionNumber: 5,
    category: "Adaptive Follow-up",
    question: "Based on your previous answers, how would you use caching and indexing to improve scalability?",
  },
];

function buildDemoSession(): OralInterviewSession {
  return {
    sessionId: "demo-technical-oral",
    jobRole: "MERN Stack Developer",
    status: "In Progress",
    currentQuestionIndex: 0,
    maxQuestions: DEMO_QUESTIONS.length,
    currentQuestion: DEMO_QUESTIONS[0],
    answeredCount: 0,
    questions: [DEMO_QUESTIONS[0]],
  };
}

function buildDemoEvaluation(answer: string, questionIndex: number): OralAnswerResponse["evaluation"] {
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  const baseScore = wordCount < 3 ? 1 : Math.min(Math.max(Math.round(wordCount / 9) + 3, 4), 8);
  const score = Math.min(baseScore + (questionIndex >= 2 ? 1 : 0), 10);

  return {
    score,
    technicalAccuracy: score,
    conceptualKnowledge: Math.max(score - 1, 0),
    communicationSkill: wordCount >= 12 ? 8 : 5,
    completeness: wordCount >= 18 ? 8 : Math.max(score - 1, 0),
    relevance: wordCount >= 6 ? 8 : 4,
    feedback:
      wordCount < 3
        ? "Demo evaluation: little or no answer was recorded."
        : "Demo evaluation: answer recorded successfully. Real scoring is performed by the backend AI evaluator.",
    isSatisfactory: score >= 6,
  };
}

interface SpeechRecognitionEventLike {
  results: {
    length: number;
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal?: boolean;
    };
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const anyWindow = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return anyWindow.SpeechRecognition || anyWindow.webkitSpeechRecognition || null;
}

export default function TechnicalOralRound() {
  const { driveId = "" } = useParams();
  const navigate = useNavigate();
  const isDemoMode = driveId === DEMO_DRIVE_ID;

  // Interview state
  const [session, setSession] = useState<OralInterviewSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<OralQuestionTurn | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [maxQuestions, setMaxQuestions] = useState(5);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [finalSummary, setFinalSummary] = useState<{
    overallScore?: number;
    overallFeedback?: string;
    result?: string;
  } | null>(null);
  const [latestFeedback, setLatestFeedback] = useState<OralAnswerResponse["evaluation"] | null>(null);

  // Speech & Voice state
  const [spokenTranscript, setSpokenTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingAi, setIsSpeakingAi] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [speechApiSupported, setSpeechApiSupported] = useState(true);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);

  // Proctoring state
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [proctorWarning, setProctorWarning] = useState<string | null>(null);
  const [isProctorArmed, setIsProctorArmed] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [isAutoSubmitted, setIsAutoSubmitted] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timerRef = useRef<number | null>(null);
  const isSubmittingRef = useRef(false);
  const violationCountRef = useRef(0);
  const currentQuestionIndexRef = useRef(0);

  currentQuestionIndexRef.current = currentQuestionIndex;

  // Speak AI question using Text-to-Speech
  const speakQuestion = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeakingAi(true);
      utterance.onend = () => setIsSpeakingAi(false);
      utterance.onerror = () => setIsSpeakingAi(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeakingAi(false);
    }
  }, []);

  // Initialize Oral Interview Session
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      setIsInitializing(true);
      try {
        if (isDemoMode) {
          const demoSession = buildDemoSession();
          if (!isMounted) return;

          setSession(demoSession);
          setMaxQuestions(demoSession.maxQuestions);
          setCurrentQuestion(demoSession.currentQuestion || null);
          setCurrentQuestionIndex(0);
          if (demoSession.currentQuestion?.question) {
            speakQuestion(demoSession.currentQuestion.question);
          }
          return;
        }

        const response = await startOralInterview();
        if (!isMounted) return;

        setSession(response.data);
        setMaxQuestions(response.data.maxQuestions || 5);

        if (response.data.status === "Completed" || response.data.isFinished) {
          setIsFinished(true);
          setFinalSummary({
            overallScore: response.data.overallScore ?? 0,
            overallFeedback: response.data.overallFeedback || "Interview completed successfully.",
          });
          return;
        }

        const activeQ = response.data.currentQuestion || null;
        setCurrentQuestion(activeQ);
        setCurrentQuestionIndex(response.data.currentQuestionIndex || 0);

        if (activeQ?.question) {
          speakQuestion(activeQ.question);
        }
      } catch (err: unknown) {
        console.error("Failed to start oral interview:", err);
        setMicError("Failed to initialize oral round. Please ensure you are logged in and qualified.");
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    }

    void initSession();

    return () => {
      isMounted = false;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isDemoMode, speakQuestion]);

  // Setup Camera for Proctoring
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
      .then((s) => {
        stream = s;
        setCameraStream(s);
      })
      .catch((err) => {
        console.warn("Could not start video for proctoring:", err);
      });

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && cameraStream && videoRef.current.srcObject !== cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => undefined);
    }
  }, [cameraStream]);

  // Fullscreen tracking
  useEffect(() => {
    const handleFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreenState);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenState);
  }, []);

  // Arm proctoring after 2 seconds
  useEffect(() => {
    const timeout = window.setTimeout(() => setIsProctorArmed(true), 2500);
    return () => window.clearTimeout(timeout);
  }, []);

  // Setup Speech-to-Text Recognition
  useEffect(() => {
    const RecognitionClass = getSpeechRecognitionConstructor();
    if (!RecognitionClass) {
      setSpeechApiSupported(false);
      return;
    }

    try {
      const recognition = new RecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let finalTrans = "";
        let currentInterim = "";

        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTrans += `${item[0].transcript} `;
          } else {
            currentInterim += item[0].transcript;
          }
        }

        if (finalTrans) {
          setSpokenTranscript((prev) => `${prev} ${finalTrans}`.trim());
        }
        setInterimText(currentInterim);
      };

      recognition.onerror = (event: { error: string }) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setMicError("Microphone access is denied. Please grant permission in your browser.");
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch {
      setSpeechApiSupported(false);
    }

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  // Toggle Speech Listening
  const toggleListening = () => {
    if (!recognitionRef.current) return;
    setMicError(null);

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err: unknown) {
        console.warn("Failed to start speech recognition:", err);
        setIsListening(false);
      }
    }
  };

  // Submit Answer
  const handleAnswerSubmit = useCallback(async () => {
    if (isSubmittingRef.current || !session?.sessionId) return;
    isSubmittingRef.current = true;
    setIsEvaluating(true);

    // Stop listening & AI speech
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const fullSpokenAnswer = `${spokenTranscript} ${interimText}`.trim();

    try {
      if (isDemoMode) {
        const evaluation = buildDemoEvaluation(fullSpokenAnswer, currentQuestionIndexRef.current);
        setLatestFeedback(evaluation);

        if (currentQuestionIndexRef.current >= DEMO_QUESTIONS.length - 1) {
          const completedQuestions = [
            ...(session.questions || []),
            {
              ...DEMO_QUESTIONS[currentQuestionIndexRef.current],
              spokenAnswer: fullSpokenAnswer,
              ...evaluation,
              answeredAt: new Date().toISOString(),
            },
          ];
          const overallScore = Math.round(
            (completedQuestions.reduce((total, question) => total + (question.score || 0), 0) / DEMO_QUESTIONS.length) * 10
          );

          setSession((current) => current ? {
            ...current,
            status: "Completed",
            questions: completedQuestions,
            answeredCount: DEMO_QUESTIONS.length,
            overallScore,
            overallFeedback: "Demo interview completed. Backend AI scoring is used in the authenticated student flow.",
            isFinished: true,
          } : current);
          setIsFinished(true);
          setFinalSummary({
            overallScore,
            overallFeedback: "Demo interview completed. Backend AI scoring is used in the authenticated student flow.",
            result: overallScore >= 60 ? "Qualified" : "Completed",
          });
          return;
        }

        const nextIndex = currentQuestionIndexRef.current + 1;
        const nextQuestion = DEMO_QUESTIONS[nextIndex];
        setSession((current) => current ? {
          ...current,
          currentQuestionIndex: nextIndex,
          currentQuestion: nextQuestion,
          answeredCount: nextIndex,
          questions: [
            ...(current.questions || []),
            {
              ...DEMO_QUESTIONS[currentQuestionIndexRef.current],
              spokenAnswer: fullSpokenAnswer,
              ...evaluation,
              answeredAt: new Date().toISOString(),
            },
            nextQuestion,
          ],
        } : current);
        setCurrentQuestion(nextQuestion);
        setCurrentQuestionIndex(nextIndex);
        setSpokenTranscript("");
        setInterimText("");
        setTimeLeft(QUESTION_TIME_LIMIT);
        speakQuestion(nextQuestion.question);
        return;
      }

      const response = await submitOralAnswer(session.sessionId, fullSpokenAnswer);
      const data = response.data;
      setLatestFeedback(data.evaluation);

      if (data.isFinished) {
        setIsFinished(true);
        setFinalSummary({
          overallScore: data.overallScore,
          overallFeedback: data.overallFeedback,
          result: data.result,
        });
      } else if (data.nextQuestion) {
        setCurrentQuestion(data.nextQuestion);
        setCurrentQuestionIndex(data.currentQuestionIndex || currentQuestionIndexRef.current + 1);
        setSpokenTranscript("");
        setInterimText("");
        setTimeLeft(QUESTION_TIME_LIMIT);
        speakQuestion(data.nextQuestion.question);
      }
    } catch (err: unknown) {
      console.error("Error submitting oral answer:", err);
      setMicError("Failed to evaluate answer. Please try submitting again.");
    } finally {
      setIsEvaluating(false);
      isSubmittingRef.current = false;
    }
  }, [interimText, isDemoMode, isListening, session, session?.sessionId, speakQuestion, spokenTranscript]);

  // Question Timer
  useEffect(() => {
    if (isInitializing || isEvaluating || isFinished) return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          void handleAnswerSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [handleAnswerSubmit, isEvaluating, isFinished, isInitializing, currentQuestionIndex]);

  // Proctoring Violations
  const addViolation = useCallback(
    async (type: string, message: string, metadata?: Record<string, unknown>) => {
      const currentState = { violationCount: violationCountRef.current, autoSubmitted: isAutoSubmitted };
      const result = evaluateViolationState(
        currentState,
        { type, message, severity: "high", metadata },
        DEFAULT_PROCTORING_CONFIG
      );

      violationCountRef.current = result.violationCount;
      setViolationCount(result.violationCount);
      setProctorWarning(message);

      try {
        await logProctoringEvent({
          eventType: type,
          severity: "high",
          message,
          metadata,
          occurredAt: new Date().toISOString(),
        });
      } catch {
        // ignore
      }

      if (result.shouldAutoSubmit && !isAutoSubmitted) {
        setIsAutoSubmitted(true);
        void handleAnswerSubmit();
      }
    },
    [handleAnswerSubmit, isAutoSubmitted]
  );

  useFaceDetection({
    stream: cameraStream,
    isEnabled: !isFinished && isFullscreen && isProctorArmed,
    onFaceMissing: () => {
      void addViolation("face", "Face not detected. Please remain centered in your camera view.", { source: "oral-face-detection" });
    },
  });

  useDeviceDetection({
    stream: cameraStream,
    isEnabled: !isFinished && isFullscreen && isProctorArmed,
    onDeviceDetected: () => {
      void addViolation("device", "External device detected. Please keep devices away.", { source: "oral-device-detection" });
    },
  });

  useTabFocusMonitor({
    isActive: !isFinished && isProctorArmed,
    onViolation: (reason, details) => {
      void addViolation(details?.eventType ?? "tab-switch", reason, {
        source: "oral-tab-focus",
        ...details?.metadata,
      });
    },
  });

  const requestFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch {
      // ignore
    }
  };

  const timerColor = useMemo(() => {
    if (timeLeft > 40) return "text-emerald-500";
    if (timeLeft > 15) return "text-amber-500";
    return "text-rose-500";
  }, [timeLeft]);

  // Finished Screen
  if (isFinished) {
    return (
      <main className="min-h-screen bg-slate-950 px-5 py-10 font-inter text-white flex items-center justify-center">
        <div className="w-full max-w-2xl rounded-3xl border border-sky-400/20 bg-slate-900/90 p-8 shadow-2xl backdrop-blur text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400">
            <CheckCircle2 className="h-10 w-10 text-sky-400" />
          </div>
          <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.2em] text-sky-400">Oral Viva Complete</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Technical Oral Round Finished</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Your spoken technical responses have been evaluated by Synthora AI and recorded securely.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-950/60 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">Overall Score</p>
              <p className="mt-1 text-3xl font-extrabold text-sky-400">
                {finalSummary?.overallScore ?? session?.overallScore ?? 0}
                <span className="text-base text-slate-400"> / 100</span>
              </p>
            </div>
            <div className="rounded-xl bg-slate-950/60 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">Questions Answered</p>
              <p className="mt-1 text-3xl font-extrabold text-white">5 / 5</p>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-xl bg-slate-950/60 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">Performance Status</p>
              <p className="mt-1 text-lg font-extrabold text-emerald-400">
                {finalSummary?.result || (session?.overallScore && session.overallScore >= 60 ? "Qualified" : "Completed")}
              </p>
            </div>
          </div>

          {finalSummary?.overallFeedback || session?.overallFeedback ? (
            <div className="mt-6 rounded-2xl border border-sky-400/20 bg-sky-950/30 p-5 text-left">
              <p className="text-xs font-extrabold uppercase tracking-wider text-sky-300">AI Viva Summary & Feedback</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                {finalSummary?.overallFeedback || session?.overallFeedback}
              </p>
            </div>
          ) : null}

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => navigate("/student/dashboard")}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 text-sm font-extrabold text-slate-950 transition hover:bg-sky-400 shadow-lg shadow-sky-500/20"
            >
              Back to Dashboard
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 font-inter text-slate-950 dark:bg-slate-950 dark:text-white sm:px-8">
      {/* Top Header */}
      <header className="mx-auto flex max-w-7xl items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Synthora Logo" className="h-10 w-10" />
          <div>
            <h1 className="text-lg font-extrabold">Synthora.AI</h1>
            <p className="text-xs text-sky-600 dark:text-sky-400 font-bold">
              Technical Oral Round (AI Viva) • {session?.jobRole || "Technical Role"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!isFullscreen ? (
            <button
              type="button"
              onClick={requestFullscreen}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-extrabold text-amber-500 hover:bg-amber-500/20 transition"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Enable Fullscreen
            </button>
          ) : null}
          <ThemeToggle />
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="mx-auto mt-6 grid max-w-7xl gap-6 lg:grid-cols-[380px_1fr]">
        {/* Left Column: Proctoring & Candidate Camera */}
        <section className="flex flex-col gap-4">
          <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Camera className="h-4 w-4 text-sky-500" />
                Live Proctoring Feed
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Monitoring
              </span>
            </div>

            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-900 border border-slate-800">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover -scale-x-100"
              />
              {!cameraStream ? (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                  Camera feed active
                </div>
              ) : null}

              {/* Live Audio Indicator Pill */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-slate-950/80 px-3 py-1 text-xs backdrop-blur">
                {isListening ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                    <span className="font-bold text-rose-400">Microphone Active</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-slate-500" />
                    <span className="text-slate-400">Mic Idle</span>
                  </>
                )}
              </div>
            </div>

            {proctorWarning ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-500 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{proctorWarning}</span>
              </div>
            ) : null}

            {violationCount > 0 ? (
              <p className="mt-2 text-right text-[11px] font-bold text-slate-400">
                Security incidents recorded: <span className="text-rose-500">{violationCount}</span>
              </p>
            ) : null}
          </div>

          {/* Guidelines Box */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 text-xs text-slate-600 dark:text-slate-300">
            <h3 className="font-extrabold uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-500" />
              Viva Interview Rules
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-4">
              <li>Each question has a strict <strong>90-second</strong> timer.</li>
              <li>Click <strong>Start Speaking</strong> and answer clearly.</li>
              <li>Your spoken response will transcribe live in real-time.</li>
              <li>Click <strong>Submit Answer</strong> when finished.</li>
              <li>Groq AI adapts questions based on your technical depth.</li>
            </ul>
          </div>
        </section>

        {/* Right Column: AI Interviewer & Voice Workspace */}
        <section className="flex flex-col gap-6">
          {/* Top Status Bar: Question Progress & Timer */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-sm">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                Question Progress
              </span>
              <h2 className="text-2xl font-black">
                Question {currentQuestionIndex + 1} <span className="text-base text-slate-400">of {maxQuestions}</span>
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-white/10 px-4 py-2">
                <Clock className={`h-5 w-5 ${timerColor}`} />
                <span className={`text-xl font-extrabold tabular-nums ${timerColor}`}>
                  {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>

          {/* AI Interviewer Question Card */}
          <div className="relative overflow-hidden rounded-3xl border border-sky-400/30 bg-gradient-to-br from-sky-500/5 to-indigo-500/5 p-6 shadow-sm dark:border-sky-500/20 dark:bg-slate-900/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-slate-950 font-bold">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold">Synthora AI Interviewer</h3>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Category: <span className="text-sky-500 font-bold">{currentQuestion?.category || "Technical Viva"}</span>
                  </p>
                </div>
              </div>

              {/* Replay Audio Button */}
              {currentQuestion?.question ? (
                <button
                  type="button"
                  onClick={() => speakQuestion(currentQuestion.question)}
                  className="flex items-center gap-1.5 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 transition hover:bg-sky-500/20"
                >
                  <Volume2 className="h-4 w-4" />
                  {isSpeakingAi ? "Speaking..." : "Replay Question"}
                </button>
              ) : null}
            </div>

            {/* Question Text Display */}
            <div className="mt-5 min-h-[72px]">
              {isInitializing ? (
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin text-sky-500" />
                  Generating first technical oral question...
                </div>
              ) : (
                <p className="text-lg font-bold leading-relaxed text-slate-900 dark:text-white">
                  "{currentQuestion?.question || "Please wait..."}"
                </p>
              )}
            </div>

            {/* AI Audio Visualizer Waveform Animation */}
            {isSpeakingAi ? (
              <div className="mt-4 flex items-center gap-1">
                {[4, 12, 8, 16, 10, 14, 6, 12, 4].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-sky-500 animate-pulse"
                    style={{ height: `${h}px`, animationDelay: `${i * 120}ms` }}
                  />
                ))}
                <span className="ml-2 text-xs font-bold text-sky-400">AI speaking...</span>
              </div>
            ) : null}
          </div>

          {/* Candidate Spoken Transcript & Controls */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Mic className="h-4 w-4 text-sky-500" />
                Your Spoken Answer (Live Transcript)
              </span>

              {spokenTranscript || interimText ? (
                <button
                  type="button"
                  onClick={() => {
                    setSpokenTranscript("");
                    setInterimText("");
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-rose-400 transition"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear
                </button>
              ) : null}
            </div>

            {/* Transcript Textbox */}
            <div className="relative min-h-[140px] rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 p-4 text-sm leading-relaxed">
              {spokenTranscript || interimText ? (
                <p className="text-slate-900 dark:text-slate-100 font-medium whitespace-pre-wrap">
                  {spokenTranscript}
                  <span className="text-sky-500 italic font-normal"> {interimText}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  {isListening
                    ? "Listening... Speak your answer now."
                    : speechApiSupported
                    ? "Click 'Start Speaking' below to activate your microphone and answer verbally."
                    : "Speech recognition is unsupported in this browser. You may type your technical answer below."}
                </p>
              )}

              {/* Fallback Textarea if Speech API is not supported in the browser */}
              {!speechApiSupported ? (
                <textarea
                  value={spokenTranscript}
                  onChange={(e) => setSpokenTranscript(e.target.value)}
                  placeholder="Type your technical answer here..."
                  className="mt-3 w-full rounded-xl border border-slate-300 dark:border-white/10 bg-transparent p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  rows={4}
                />
              ) : null}
            </div>

            {micError ? (
              <p className="mt-2 text-xs font-bold text-rose-500">{micError}</p>
            ) : null}

            {/* Bottom Action Controls */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              {speechApiSupported ? (
                <button
                  type="button"
                  disabled={isEvaluating}
                  onClick={toggleListening}
                  className={`inline-flex h-12 items-center gap-2 rounded-2xl px-5 text-sm font-extrabold transition shadow-sm ${
                    isListening
                      ? "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20"
                      : "bg-sky-500 text-slate-950 hover:bg-sky-400 shadow-sky-500/20"
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-5 w-5" />
                      Stop Speaking
                    </>
                  ) : (
                    <>
                      <Mic className="h-5 w-5" />
                      Start Speaking
                    </>
                  )}
                </button>
              ) : <div />}

              <button
                type="button"
                disabled={isEvaluating || (!spokenTranscript.trim() && !interimText.trim())}
                onClick={handleAnswerSubmit}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-950 px-6 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
                    AI Evaluating Answer...
                  </>
                ) : (
                  <>
                    Submit Answer
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feedback pill from previous question */}
          {latestFeedback ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Last Question Evaluation
                </span>
                <span className="font-extrabold text-emerald-500">
                  Score: {latestFeedback.score}/10
                </span>
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                {latestFeedback.feedback}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
