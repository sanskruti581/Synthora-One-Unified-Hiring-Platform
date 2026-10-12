import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock3,
  Code2,
  GripHorizontal,
  GripVertical,
  Maximize2,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Terminal,
  XCircle,
} from "lucide-react";
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
import {
  getCodingAssessment,
  getCodingQuestions,
  runCode,
  submitCodingRound,
  type CodingQuestion,
  type CodingAssessmentData,
  type TestResult,
  type RunCodeResponse,
} from "../../services/codingService";
import logo from "../../../images/logo.png";

const SUPPORTED_LANGUAGES = [
  { value: "javascript", label: "JavaScript (Node.js)", monaco: "javascript" },
  { value: "python", label: "Python (3.x)", monaco: "python" },
  { value: "java", label: "Java (JDK)", monaco: "java" },
  { value: "c", label: "C (GCC)", monaco: "c" },
  { value: "cpp", label: "C++ (G++)", monaco: "cpp" },
] as const;

type LanguageKey = (typeof SUPPORTED_LANGUAGES)[number]["value"];

const DEFAULT_STARTER_CODES: Record<LanguageKey, string> = {
  javascript: `// JavaScript Solution
const fs = require('fs');

function solve() {
  const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
  if (input.length >= 2) {
    const a = parseInt(input[0], 10);
    const b = parseInt(input[1], 10);
    console.log(a + b);
  }
}

solve();
`,
  python: `# Python Solution
import sys

def main():
    data = sys.stdin.read().split()
    if len(data) >= 2:
        a = int(data[0])
        b = int(data[1])
        print(a + b)

if __name__ == '__main__':
    main()
`,
  java: `// Java Solution
import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int a = sc.nextInt();
            int b = sc.nextInt();
            System.out.println(a + b);
        }
    }
}
`,
  c: `// C Solution
#include <stdio.h>

int main() {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) == 2) {
        printf("%lld\\n", a + b);
    }
    return 0;
}
`,
  cpp: `// C++ Solution
#include <iostream>
using namespace std;

int main() {
    long long a, b;
    if (cin >> a >> b) {
        cout << a + b << endl;
    }
    return 0;
}
`,
};

function getStarterCode(q: CodingQuestion | undefined, lang: LanguageKey): string {
  if (!q) return DEFAULT_STARTER_CODES[lang];
  const custom = q.starterCode?.[lang];
  if (custom && custom.trim().length > 0) return custom;
  return DEFAULT_STARTER_CODES[lang];
}

export default function CodingAssessment() {
  const { driveId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromAptitude = Boolean((location.state as { fromAptitude?: boolean } | null)?.fromAptitude);

  // Data States
  const [assessmentData, setAssessmentData] = useState<CodingAssessmentData | null>(null);
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(Boolean(typeof window !== "undefined" && !window.localStorage.getItem("synthora-token")));

  // Proctoring States
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
  const [proctoringViolations, setProctoringViolations] = useState<{ id: number; type: string; message: string; timestamp: string }[]>([]);
  const [violationCount, setViolationCount] = useState(0);
  const [isAutoSubmitted, setIsAutoSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasSubmittedRef = useRef(false);
  const violationCountRef = useRef(0);

  // Multi-Language Editor States
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  // questionId -> language
  const [selectedLanguages, setSelectedLanguages] = useState<Record<string, LanguageKey>>({});
  // questionId -> language -> user edited code
  const [userCodes, setUserCodes] = useState<Record<string, Record<string, string>>>({});
  // questionId -> RunCodeResponse
  const [runResults, setRunResults] = useState<Record<string, RunCodeResponse>>({});
  const [activeTestCaseIndex, setActiveTestCaseIndex] = useState<number>(0);
  const [runningCode, setRunningCode] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains("dark"));
  const [completionResult, setCompletionResult] = useState<{
    codingScore: number;
    maxCodingScore: number;
    nextRound?: string;
    isQualified: boolean;
  } | null>(null);

  // Layout & Responsive States
  const [leftWidthPercent, setLeftWidthPercent] = useState<number>(38);
  const [editorHeightPercent, setEditorHeightPercent] = useState<number>(58);
  const [mobileTab, setMobileTab] = useState<"question" | "editor">("editor");
  const isDraggingHorizRef = useRef(false);
  const isDraggingVertRef = useRef(false);

  const proctorReady = isDemoMode ? Boolean(isMicReady && isCameraReady) : Boolean(cameraStream && isMicReady && isCameraReady);
  const canStartExam = Boolean(assessmentData);

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

  // Fetch assessment data and coding questions
  useEffect(() => {
    async function loadData() {
      if (!driveId) {
        setError("No drive ID provided");
        setLoading(false);
        return;
      }

      try {
        const assessmentRes = await getCodingAssessment(driveId);
        setAssessmentData(assessmentRes.data);
      } catch {
        setError("Failed to load coding assessment. Please check your session or contact support.");
        setLoading(false);
        return;
      }

      try {
        const questionsRes = await getCodingQuestions(driveId);
        const raw = questionsRes.data;
        const fetchedQuestions: CodingQuestion[] = Array.isArray(raw)
          ? (raw as unknown as CodingQuestion[])
          : ((raw as { questions: CodingQuestion[] }).questions ?? []);

        setQuestions(fetchedQuestions);

        if (fetchedQuestions.length > 0) {
          const firstId = fetchedQuestions[0]._id;
          setActiveQuestionId(firstId);

          const initialLanguages: Record<string, LanguageKey> = {};
          const initialCodes: Record<string, Record<string, string>> = {};

          fetchedQuestions.forEach((q) => {
            initialLanguages[q._id] = "javascript";
            initialCodes[q._id] = {
              javascript: getStarterCode(q, "javascript"),
              python: getStarterCode(q, "python"),
              java: getStarterCode(q, "java"),
              c: getStarterCode(q, "c"),
              cpp: getStarterCode(q, "cpp"),
            };
          });

          setSelectedLanguages(initialLanguages);
          setUserCodes(initialCodes);
        } else {
          setMessage("No coding questions are configured for this drive yet.");
        }
      } catch {
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
  const submitNow = useCallback(
    async (reason?: string) => {
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
          solutions: questions.map((q) => {
            const lang = selectedLanguages[q._id] || "javascript";
            const code = userCodes[q._id]?.[lang] || getStarterCode(q, lang);
            return {
              questionId: q._id,
              language: lang,
              sourceCode: code,
            };
          }),
        };
        const response = await submitCodingRound(payload);
        const isQualified = response.data.result !== "Rejected";
        const nextRound = response.data.nextRound;
        setCompletionResult({
          codingScore: response.data.codingScore,
          maxCodingScore: response.data.maxCodingScore,
          nextRound: nextRound ?? undefined,
          isQualified,
        });
        setMessage(`Submission successful! Score: ${response.data.codingScore}/${response.data.maxCodingScore}.`);
      } catch {
        hasSubmittedRef.current = false;
        setMessage("Failed to submit. Please try again.");
      } finally {
        setIsSubmitting(false);
        setShowSubmitConfirm(false);
      }
    },
    [driveId, questions, selectedLanguages, userCodes]
  );

  // Auto-submit on timer end
  useEffect(() => {
    if (hasStartedExam && timerEndAt && Date.now() >= new Date(timerEndAt).getTime()) {
      void submitNow("Time is over.");
    }
  }, [countdown, timerEndAt, hasStartedExam, submitNow]);

  // Proctoring violation handler
  const addViolation = useCallback(
    async (type: string, violationMsg: string, metadata?: Record<string, unknown>) => {
      const currentState = { violationCount: violationCountRef.current, autoSubmitted: isAutoSubmitted };
      const result = evaluateViolationState(
        currentState,
        {
          type,
          message: violationMsg,
          severity: "high",
          metadata: { ...metadata, round: "Coding" },
        },
        DEFAULT_PROCTORING_CONFIG
      );

      violationCountRef.current = result.violationCount;
      setViolationCount(result.violationCount);
      setProctoringViolations((current) => [
        ...current,
        { id: Date.now(), type, message: violationMsg, timestamp: new Date().toISOString() },
      ]);
      setProctoringWarning(violationMsg);
      setProctorViolation(violationMsg);

      try {
        await logProctoringEvent({
          eventType: type,
          severity: "high",
          message: violationMsg,
          metadata: { ...metadata, round: "Coding" },
          occurredAt: new Date().toISOString(),
        });
      } catch {}

      if (result.shouldAutoSubmit && !hasSubmittedRef.current) {
        setIsAutoSubmitted(true);
        await submitNow(`Assessment terminated due to policy violation: ${violationMsg}`);
      }
    },
    [isAutoSubmitted, submitNow]
  );

  const handleProctorViolation = useCallback(
    (reason: string, details?: { eventType?: string; metadata?: Record<string, unknown> }) => {
      if (!hasStartedExam || !proctorReady || !isProctorArmed || hasSubmittedRef.current) return;
      void addViolation(details?.eventType ?? "policy", reason, details?.metadata);
      setMessage(`${reason} This incident has been logged.`);
    },
    [addViolation, hasStartedExam, isProctorArmed, proctorReady]
  );

  // Fullscreen & Shortcut events
  useEffect(() => {
    if (!hasStartedExam || !proctorReady || !isProctorArmed) return;

    const handleFullscreenChange = () => {
      const full = Boolean(document.fullscreenElement);
      setIsFullscreen(full);
      if (!full) {
        handleProctorViolation("Fullscreen mode was exited.");
      }
    };

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

  // Video element binding
  const setVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (el && cameraStream) {
        if (el.srcObject !== cameraStream) {
          el.srcObject = cameraStream;
        }
        el.play().catch(() => undefined);
      }
    },
    [cameraStream]
  );

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      if (videoRef.current.srcObject !== cameraStream) {
        videoRef.current.srcObject = cameraStream;
      }
      videoRef.current.play().catch(() => undefined);
    }
  }, [cameraStream, hasStartedExam]);

  // Auto-start exam if transitioned continuously from Aptitude
  useEffect(() => {
    if (!loading && assessmentData && fromAptitude && !hasStartedExam && !isSecuringExam) {
      void handleStartExam();
    }
  }, [loading, assessmentData, fromAptitude, hasStartedExam, isSecuringExam]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  // Arm proctoring after brief buffer
  useEffect(() => {
    if (!hasStartedExam || !proctorReady) {
      setIsProctorArmed(false);
      return;
    }
    const timeout = window.setTimeout(() => setIsProctorArmed(true), 3000);
    return () => window.clearTimeout(timeout);
  }, [hasStartedExam, proctorReady]);

  // Proctoring monitors
  const { faceStatus, warning: faceWarning } = useFaceDetection({
    stream: cameraStream,
    isEnabled: hasStartedExam && isProctorArmed,
    onFaceMissing: () => {
      void addViolation("face", "Face not detected. Please stay within camera view.", { source: "face-detection" });
    },
  });

  const { warning: deviceWarning } = useDeviceDetection({
    stream: cameraStream,
    isEnabled: hasStartedExam && isProctorArmed,
    onDeviceDetected: () => {
      void addViolation("device", "Malpractice detected: external device found. This incident has been logged.", {
        source: "device-detection",
      });
    },
  });

  useTabFocusMonitor({
    isActive: hasStartedExam && isProctorArmed,
    onViolation: handleProctorViolation,
  });

  useEffect(() => {
    if (!hasStartedExam || !proctorReady || !isProctorArmed) return;
    const warningText = [faceWarning, deviceWarning].filter(Boolean).join(" ");
    if (warningText) {
      setProctoringWarning(warningText);
      setMessage(warningText);
    }
  }, [deviceWarning, faceWarning, hasStartedExam, isProctorArmed, proctorReady]);

  // Start Exam Initialization (Fast & Reliable)
  const handleStartExam = async () => {
    if (hasStartedExam || isSecuringExam) return;

    setMessage("");
    setProctorViolation("");
    setProctoringWarning(null);
    setHasPermissionError(false);
    setIsSecuringExam(true);

    let stream: MediaStream | null = null;

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 } },
            audio: true,
          });
          setCameraStream(stream);
          setIsMicReady(true);
          setIsCameraReady(true);
          setHasPermissionError(false);
        } catch (err: unknown) {
          const mediaErr = err as { name?: string; message?: string };
          console.warn("Camera/mic access warning:", mediaErr);
          if (mediaErr?.name === "NotAllowedError" || mediaErr?.name === "PermissionDeniedError") {
            setMessage("Camera & microphone access was denied. Please allow permissions in your browser to proceed.");
          } else if (mediaErr?.name === "NotFoundError" || mediaErr?.name === "DevicesNotFoundError") {
            setMessage("No camera or microphone device found. Please connect a webcam.");
          } else if (mediaErr?.name === "NotReadableError" || mediaErr?.name === "TrackStartError") {
            setMessage("Camera is currently in use by another application. Please close other camera tabs.");
          } else {
            setMessage("Camera and microphone access could not be acquired.");
          }
          setHasPermissionError(true);
          setIsCameraReady(false);
          setIsMicReady(false);
          if (!isDemoMode) {
            setIsSecuringExam(false);
            return;
          }
        }
      }

      if (!document.fullscreenElement) {
        try {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        } catch {
          // Gracefully continue even if browser policy requires direct gesture
        }
      } else {
        setIsFullscreen(true);
      }

      if (isDemoMode) {
        setIsMicReady(true);
        setIsCameraReady(Boolean(stream));
      }

      setHasStartedExam(true);
    } catch (error) {
      console.error("Failed to secure exam:", error);
      setMessage("An unexpected error occurred while starting the assessment.");
    } finally {
      setIsSecuringExam(false);
      setShowPrepModal(false);
    }
  };

  // Run Code
  const handleRunCode = async () => {
    if (!activeQuestionId || !driveId) return;

    const currentLang = selectedLanguages[activeQuestionId] || "javascript";
    const currentCode =
      userCodes[activeQuestionId]?.[currentLang] || getStarterCode(activeQuestion, currentLang);

    setRunningCode(true);
    setMessage("");

    try {
      const res = await runCode({
        questionId: activeQuestionId,
        language: currentLang,
        sourceCode: currentCode,
        driveId,
      });

      setRunResults((prev) => ({
        ...prev,
        [activeQuestionId]: res.data,
      }));
      setActiveTestCaseIndex(0);
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Execution service encountered an error. Please try again.";
      setRunResults((prev) => ({
        ...prev,
        [activeQuestionId]: {
          passedCount: 0,
          totalCount: 0,
          compilationError: errorMsg,
          results: [],
        },
      }));
    } finally {
      setRunningCode(false);
    }
  };

  // Active question and code resolution
  const activeQuestion = questions.find((q) => q._id === activeQuestionId);
  const currentLanguage: LanguageKey = (activeQuestionId && selectedLanguages[activeQuestionId]) || "javascript";
  const currentLanguageConfig =
    SUPPORTED_LANGUAGES.find((l) => l.value === currentLanguage) ?? SUPPORTED_LANGUAGES[0];
  const currentCode =
    (activeQuestionId && userCodes[activeQuestionId]?.[currentLanguage]) ??
    getStarterCode(activeQuestion, currentLanguage);
  const activeRunResult = activeQuestionId ? runResults[activeQuestionId] : null;

  const handleLanguageChange = (newLang: LanguageKey) => {
    if (!activeQuestionId) return;

    setSelectedLanguages((prev) => ({
      ...prev,
      [activeQuestionId]: newLang,
    }));

    setUserCodes((prev) => {
      const existingQuestionCodes = prev[activeQuestionId] || {};
      if (!existingQuestionCodes[newLang]) {
        return {
          ...prev,
          [activeQuestionId]: {
            ...existingQuestionCodes,
            [newLang]: getStarterCode(activeQuestion, newLang),
          },
        };
      }
      return prev;
    });
  };

  const handleCodeChange = (newCode: string) => {
    if (!activeQuestionId) return;
    setUserCodes((prev) => ({
      ...prev,
      [activeQuestionId]: {
        ...(prev[activeQuestionId] || {}),
        [currentLanguage]: newCode,
      },
    }));
  };

  const handleResetCode = () => {
    if (!activeQuestionId || !activeQuestion) return;
    const starter = getStarterCode(activeQuestion, currentLanguage);
    handleCodeChange(starter);
  };

  // Resizable Dividers Logic
  const handleMouseDownHorizDivider = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingHorizRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingHorizRef.current) return;
      const windowWidth = window.innerWidth;
      const newPercent = (moveEvent.clientX / windowWidth) * 100;
      if (newPercent >= 22 && newPercent <= 62) {
        setLeftWidthPercent(newPercent);
      }
    };

    const onMouseUp = () => {
      isDraggingHorizRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleMouseDownVertDivider = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingVertRef.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";

    const container = document.getElementById("right-editor-pane");
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingVertRef.current) return;
      const relY = moveEvent.clientY - rect.top;
      const newPercent = (relY / rect.height) * 100;
      if (newPercent >= 28 && newPercent <= 78) {
        setEditorHeightPercent(newPercent);
      }
    };

    const onMouseUp = () => {
      isDraggingVertRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 dark:text-white font-inter">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Loading Coding Assessment...</p>
        </div>
      </div>
    );
  }

  if (error || !assessmentData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-rose-500 dark:bg-slate-950 p-6 font-inter">
        <div className="max-w-md text-center">
          <AlertTriangle className="h-10 w-10 mx-auto text-rose-500 mb-3" />
          <h2 className="text-xl font-bold mb-2">Unable to Load Assessment</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">{error || "Assessment not found"}</p>
          <button
            onClick={() => navigate("/student/dashboard")}
            className="px-5 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-950 rounded-xl font-bold text-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isAutoSubmitted && hasSubmittedRef.current) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10 text-white font-inter">
        <div className="w-full max-w-xl rounded-3xl border border-rose-400/30 bg-white/10 p-8 text-center shadow-2xl shadow-rose-950/40">
          <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-rose-300">Assessment Terminated</p>
          <h1 className="mt-3 text-3xl font-extrabold">Test submitted due to policy violation</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Your assessment was automatically submitted because a proctoring violation was recorded.
          </p>
          <button
            onClick={() => navigate("/student/dashboard")}
            className="mt-6 px-6 py-2.5 bg-white text-slate-900 rounded-xl font-bold transition hover:bg-slate-100"
          >
            Return to Dashboard
          </button>
        </div>
      </main>
    );
  }

  // Preparation Screen: Shown ONLY when candidate has not started exam yet
  if (!hasStartedExam) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-6 font-inter text-slate-950 dark:bg-slate-950 dark:text-white sm:px-8">
        <header className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="h-10 w-10" />
            <span className="text-xl font-extrabold">Synthora.AI</span>
          </div>
          <ThemeToggle />
        </header>

        <section className="mx-auto mt-8 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/10">
          {message ? (
            <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-400/10 dark:text-amber-200">
              {message}
            </div>
          ) : null}

          <div className="grid gap-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase text-sky-600 dark:text-sky-400">Coding Assessment</span>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800 dark:bg-sky-500/20 dark:text-sky-300">
                  {assessmentData.codingDurationMinutes || 45} Minutes
                </span>
              </div>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">{assessmentData.driveName}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Candidate: {assessmentData.studentName}</p>
            </div>

            <div className="rounded-xl border border-sky-100 bg-sky-50 p-5 dark:border-sky-500/20 dark:bg-sky-500/10">
              <h3 className="mb-3 font-bold text-sky-900 dark:text-sky-300">Supported Programming Languages</h3>
              <div className="flex flex-wrap gap-2 text-xs font-bold text-sky-800 dark:text-sky-200">
                {SUPPORTED_LANGUAGES.map((l) => (
                  <span
                    key={l.value}
                    className="rounded-lg border border-sky-200 bg-white/80 px-2.5 py-1 shadow-sm dark:border-sky-500/30 dark:bg-slate-900/60"
                  >
                    {l.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
              <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Proctoring Requirements</h3>
              <ul className="space-y-2.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-2.5">
                  <Camera className="h-4 w-4 text-emerald-500" /> Web camera and microphone must remain on throughout the round
                </li>
                <li className="flex items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Assessment runs in fullscreen; exiting is flagged as a violation
                </li>
                <li className="flex items-center gap-2.5">
                  <Code2 className="h-4 w-4 text-sky-500" /> Tab-switching and external monitors are automatically detected
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowPrepModal(true)}
                disabled={!canStartExam || isSecuringExam}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300"
              >
                {isSecuringExam ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {isSecuringExam ? "Securing Exam..." : "Start Proctored Assessment"}
              </button>
            </div>
          </div>
        </section>

        {showPrepModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-sky-400/20 bg-slate-900 p-6 text-white shadow-2xl shadow-sky-950/40">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-sky-300">Ready to Begin</p>
              <h3 className="mt-3 text-2xl font-extrabold">Close other tabs & keep camera visible</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Clicking continue will request camera and microphone permissions and launch the proctored coding workspace.
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
                    void handleStartExam();
                  }}
                  disabled={isSecuringExam}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 text-sm font-extrabold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
                >
                  {isSecuringExam ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                  {isSecuringExam ? "Initializing..." : "I'm ready to begin"}
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
      {/* Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm z-20 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src={logo} alt="Synthora" className="h-8 shrink-0" />
          <div className="h-6 w-px bg-slate-200 dark:bg-white/10 hidden sm:block"></div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm sm:text-base leading-tight truncate">{assessmentData.driveName}</h1>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                Coding Round
              </span>
              <span className="text-slate-400 text-xs hidden md:inline">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 hidden md:inline truncate">
                {assessmentData.studentName}
              </span>
            </div>
          </div>
        </div>

        {/* Small Screen Tab Switcher */}
        <div className="flex lg:hidden rounded-lg bg-slate-100 p-1 dark:bg-slate-800 text-xs font-bold">
          <button
            onClick={() => setMobileTab("question")}
            className={`px-3 py-1.5 rounded-md transition ${mobileTab === "question" ? "bg-white text-sky-600 shadow dark:bg-slate-900 dark:text-sky-400" : "text-slate-500"}`}
          >
            Problem
          </button>
          <button
            onClick={() => setMobileTab("editor")}
            className={`px-3 py-1.5 rounded-md transition ${mobileTab === "editor" ? "bg-white text-sky-600 shadow dark:bg-slate-900 dark:text-sky-400" : "text-slate-500"}`}
          >
            Editor & Tests
          </button>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {message ? (
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 hidden xl:inline max-w-xs truncate">
              {message}
            </span>
          ) : null}

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-800 dark:text-slate-200 font-mono text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700">
            <Clock3 className="w-3.5 h-3.5 text-sky-500" />
            {String(countdown.hours).padStart(2, "0")}:{String(countdown.minutes).padStart(2, "0")}:
            {String(countdown.seconds).padStart(2, "0")}
          </div>

          <ThemeToggle />

          <button
            onClick={() => setShowSubmitConfirm(true)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-sky-400 dark:hover:bg-sky-300 dark:text-slate-950 text-white rounded-xl font-extrabold text-xs sm:text-sm transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit All</span>
          </button>
        </div>
      </header>

      {/* Proctoring Guard Bar */}
      <div className="shrink-0 bg-white dark:bg-slate-900 px-4 py-2 border-b border-slate-200 dark:border-white/10 z-10">
        <ProctoringGuard
          isActive={hasStartedExam && proctorReady}
          isMicReady={isMicReady}
          isCameraReady={isCameraReady}
          hasPermissionError={hasPermissionError}
          violationCount={violationCount}
          warningMessage={proctoringWarning}
        >
          <div className="mt-1">
            <ProctoringReport title="Live proctoring" violations={proctoringViolations} />
          </div>
        </ProctoringGuard>
      </div>

      {/* Main Workspace Layout */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: Questions, Problem Details & Camera Preview */}
        <section
          style={{ width: undefined }}
          className={`h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10 flex flex-col z-0 shrink-0 ${
            mobileTab === "question" ? "flex w-full" : "hidden lg:flex"
          }`}
          // Desktop width applied dynamically via style
          ref={(node) => {
            if (node && window.innerWidth >= 1024) {
              node.style.width = `${leftWidthPercent}%`;
            }
          }}
        >
          {/* Live Camera Preview Widget */}
          <div className="p-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/50 shrink-0">
            <div className="relative overflow-hidden rounded-xl border border-emerald-300 dark:border-emerald-500/30 bg-slate-950 aspect-video shadow-sm max-h-48 mx-auto">
              <video ref={setVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {cameraStream ? (
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-sm text-[11px] font-bold text-white">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Camera Monitoring Active</span>
                  </span>
                  <span className="text-slate-300">{faceStatus?.isFacePresent ? "Face Verified" : "Monitoring"}</span>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-slate-900 text-slate-300 text-xs">
                  <Camera className="w-6 h-6 mb-1 text-slate-400" />
                  <span>{hasPermissionError ? "Camera Access Required" : "Camera Initializing..."}</span>
                  {hasPermissionError && (
                    <button
                      type="button"
                      onClick={() => void handleStartExam()}
                      className="mt-2 px-3 py-1 bg-sky-500 text-slate-950 text-[11px] font-bold rounded-lg hover:bg-sky-400"
                    >
                      Retry Camera
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Question Switcher Tabs */}
          <div className="flex overflow-x-auto border-b border-slate-200 dark:border-white/10 shrink-0 bg-slate-50 dark:bg-slate-950/50">
            {questions.map((q, idx) => (
              <button
                key={q._id}
                onClick={() => setActiveQuestionId(q._id)}
                className={`px-4 py-3 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                  activeQuestionId === q._id
                    ? "border-sky-500 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                Question {idx + 1}
              </button>
            ))}
          </div>

          {/* Question Details Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {activeQuestion ? (
              <>
                <div>
                  <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-extrabold">{activeQuestion.title}</h2>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                        activeQuestion.difficulty === "Easy"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : activeQuestion.difficulty === "Medium"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                      }`}
                    >
                      {activeQuestion.difficulty}
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Marks: {activeQuestion.marks || 10}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
                    {activeQuestion.description}
                  </p>
                </div>

                {activeQuestion.constraints?.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3.5 border border-amber-100 dark:border-amber-500/20">
                    <h4 className="text-xs font-extrabold text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-1.5">
                      Constraints
                    </h4>
                    <ul className="list-disc pl-4 text-xs font-mono text-amber-900 dark:text-amber-200 space-y-1">
                      {activeQuestion.constraints.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeQuestion.examples?.map((ex, i) => (
                  <div
                    key={i}
                    className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-200 dark:border-white/10 space-y-2 text-xs"
                  >
                    <h4 className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Example {i + 1}
                    </h4>
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Input:</span>
                      <pre className="p-2 bg-white dark:bg-black/40 rounded border border-slate-200 dark:border-white/5 font-mono overflow-x-auto">
                        {ex.input}
                      </pre>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Output:</span>
                      <pre className="p-2 bg-white dark:bg-black/40 rounded border border-slate-200 dark:border-white/5 font-mono overflow-x-auto">
                        {ex.output}
                      </pre>
                    </div>
                    {ex.explanation && (
                      <p className="text-slate-600 dark:text-slate-400">
                        <span className="font-bold">Explanation: </span>
                        {ex.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center text-slate-400 py-8">Select a question to view details.</div>
            )}
          </div>
        </section>

        {/* Resizable Horizontal Divider (Desktop only) */}
        <div
          onMouseDown={handleMouseDownHorizDivider}
          className="hidden lg:flex w-2 bg-slate-200 dark:bg-slate-800 hover:bg-sky-500 dark:hover:bg-sky-400 cursor-col-resize transition-colors items-center justify-center shrink-0 z-20 group"
          title="Drag to resize panels"
        >
          <GripVertical className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
        </div>

        {/* Right Panel: Language Selector, Code Editor, Test Results */}
        <section
          id="right-editor-pane"
          style={{ width: undefined }}
          className={`flex-1 flex flex-col bg-slate-50 dark:bg-[#1e1e1e] overflow-hidden ${
            mobileTab === "editor" ? "flex w-full" : "hidden lg:flex"
          }`}
          ref={(node) => {
            if (node && window.innerWidth >= 1024) {
              node.style.width = `${100 - leftWidthPercent}%`;
            }
          }}
        >
          {/* Editor Action Toolbar */}
          <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 flex items-center justify-between px-4 shrink-0 shadow-sm z-10 gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="language-select" className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">
                Language:
              </label>
              <select
                id="language-select"
                value={currentLanguage}
                onChange={(e) => handleLanguageChange(e.target.value as LanguageKey)}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 py-1.5 px-3 focus:ring-2 focus:ring-sky-500 outline-none transition cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleResetCode}
                title="Reset editor to language starter template"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Reset Code</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunCode}
                disabled={runningCode || !activeQuestionId}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-slate-950 rounded-xl font-extrabold text-xs sm:text-sm transition-colors disabled:opacity-50 shadow-sm"
              >
                {runningCode ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{runningCode ? "Running..." : "Run Code"}</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor Container with Resizable Height */}
          <div
            style={{ height: `${editorHeightPercent}%` }}
            className="w-full shrink-0 relative overflow-hidden bg-white dark:bg-[#1e1e1e]"
          >
            <Editor
              height="100%"
              language={currentLanguageConfig.monaco}
              theme={isDarkMode ? "vs-dark" : "light"}
              value={currentCode}
              onChange={(val) => handleCodeChange(val ?? "")}
              options={{
                automaticLayout: true,
                fontSize: 14,
                padding: { top: 12, bottom: 12 },
                scrollBeyondLastLine: false,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                roundedSelection: true,
                minimap: { enabled: false },
                lineNumbers: "on",
                lineDecorationsWidth: 6,
                tabSize: 4,
              }}
            />
          </div>

          {/* Resizable Vertical Divider */}
          <div
            onMouseDown={handleMouseDownVertDivider}
            className="h-2 bg-slate-200 dark:bg-slate-800 hover:bg-sky-500 dark:hover:bg-sky-400 cursor-row-resize transition-colors flex items-center justify-center shrink-0 z-20 group"
            title="Drag to resize code editor / results"
          >
            <GripHorizontal className="w-4 h-4 text-slate-400 group-hover:text-white" />
          </div>

          {/* Test Results / Execution Panel */}
          <div
            style={{ height: `${100 - editorHeightPercent}%` }}
            className="border-t border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 overflow-y-auto p-4 z-10 flex flex-col"
          >
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-500" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Execution Output & Test Cases
                </h3>
              </div>

              {activeRunResult ? (
                <div>
                  {activeRunResult.compilationError ? (
                    <span className="px-2.5 py-1 rounded-md text-xs font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">
                      Compilation / Execution Error
                    </span>
                  ) : (
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-extrabold ${
                        activeRunResult.passedCount === activeRunResult.totalCount
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                      }`}
                    >
                      {activeRunResult.passedCount} / {activeRunResult.totalCount} Test Cases Passed
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            {/* Test Case Content Area */}
            <div className="flex-1 overflow-y-auto">
              {activeRunResult ? (
                activeRunResult.compilationError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-950/40">
                    <p className="text-xs font-extrabold uppercase text-rose-700 dark:text-rose-400 mb-2">
                      Error Output
                    </p>
                    <pre className="font-mono text-xs text-rose-800 dark:text-rose-200 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                      {activeRunResult.compilationError}
                    </pre>
                  </div>
                ) : activeRunResult.results.length > 0 ? (
                  <div className="space-y-4">
                    {/* Test Case Pills Selector */}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {activeRunResult.results.map((tr, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveTestCaseIndex(idx)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                            activeTestCaseIndex === idx
                              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          }`}
                        >
                          {tr.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          )}
                          <span>Case {idx + 1}</span>
                        </button>
                      ))}
                    </div>

                    {/* Detailed Active Test Case View */}
                    {(() => {
                      const tr = activeRunResult.results[activeTestCaseIndex] || activeRunResult.results[0];
                      if (!tr) return null;
                      return (
                        <div
                          className={`p-4 rounded-xl border ${
                            tr.passed
                              ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-500/5 dark:border-emerald-500/20"
                              : "bg-rose-50/50 border-rose-200 dark:bg-rose-500/5 dark:border-rose-500/20"
                          }`}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                            <div>
                              <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1 uppercase tracking-wider text-[10px]">
                                Input
                              </span>
                              <pre className="p-2.5 bg-white dark:bg-black/40 rounded-lg border border-slate-200/60 dark:border-white/5 whitespace-pre-wrap break-all">
                                {tr.input}
                              </pre>
                            </div>
                            <div>
                              <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1 uppercase tracking-wider text-[10px]">
                                Expected Output
                              </span>
                              <pre className="p-2.5 bg-white dark:bg-black/40 rounded-lg border border-slate-200/60 dark:border-white/5 whitespace-pre-wrap break-all">
                                {tr.expectedOutput}
                              </pre>
                            </div>
                          </div>

                          <div className="mt-3 text-xs font-mono">
                            <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1 uppercase tracking-wider text-[10px]">
                              Actual Output
                            </span>
                            <pre className="p-2.5 bg-white dark:bg-black/40 rounded-lg border border-slate-200/60 dark:border-white/5 whitespace-pre-wrap break-all">
                              {tr.actualOutput || "(No stdout)"}
                            </pre>
                          </div>

                          {tr.error && (
                            <div className="mt-3 text-xs font-mono">
                              <span className="text-rose-600 dark:text-rose-400 font-bold block mb-1 uppercase tracking-wider text-[10px]">
                                Error / Diagnosis
                              </span>
                              <pre className="p-2.5 bg-rose-100/60 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 whitespace-pre-wrap break-all">
                                {tr.error}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 py-6 text-center">No test cases executed.</div>
                )
              ) : (
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl gap-1">
                  <Play className="w-5 h-5 text-slate-400 mb-1" />
                  <span>Click "Run Code" to compile and evaluate against test cases.</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-white/10 p-6 sm:p-8 text-center">
            <div className="w-14 h-14 bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-full flex items-center justify-center mx-auto mb-5">
              <Send className="w-7 h-7 ml-0.5" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Submit All Solutions?</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              This will evaluate all your code submissions across test cases and record your final coding score. You cannot
              change your answers after submitting.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => void submitNow()}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-sky-400 dark:hover:bg-sky-300 text-white dark:text-slate-950 rounded-xl font-extrabold transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                <span>{isSubmitting ? "Submitting..." : "Confirm & Submit"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Completed Modal */}
      {completionResult && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 dark:border-white/10 p-8 text-center text-slate-900 dark:text-white">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
              Assessment Completed
            </p>
            <h2 className="text-2xl font-black mt-2">Assessment Completed Successfully</h2>

            <div className="mt-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4 text-left">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Score:{" "}
                <span className="font-black text-slate-900 dark:text-white">
                  {completionResult.codingScore} / {completionResult.maxCodingScore}
                </span>
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                Status:{" "}
                <span
                  className={
                    completionResult.isQualified
                      ? "font-black text-emerald-600 dark:text-emerald-400"
                      : "font-black text-rose-600 dark:text-rose-400"
                  }
                >
                  {completionResult.isQualified ? "Submitted" : "Completed"}
                </span>
              </p>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Thank you for completing the Aptitude Assessment and Coding Round. Your responses have been submitted
              successfully. Please check your registered email for updates regarding the next stage of the selection
              process.
            </p>

            <button
              onClick={() => navigate("/student/dashboard")}
              className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-sky-400 dark:hover:bg-sky-300 text-white dark:text-slate-950 font-extrabold rounded-xl transition text-sm"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
