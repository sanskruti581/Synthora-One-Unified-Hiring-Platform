import { useEffect, useRef, useState } from "react";
import { DEFAULT_PROCTORING_CONFIG, evaluateSignalState, type ProctoringSignalState } from "../utils/proctoringViolationLogic";

declare global {
  interface Window {
    FaceDetector?: {
      new (options?: { fastMode?: boolean }): {
        detect: (source: HTMLVideoElement) => Promise<unknown[]>;
      };
    };
  }
}

interface UseFaceDetectionOptions {
  stream: MediaStream | null;
  isEnabled: boolean;
  onFaceMissing?: () => void;
  onDetectionFailure?: (message: string) => void;
}

interface FaceDetectionResult {
  faceCount: number;
  isFacePresent: boolean;
}

export function useFaceDetection({ stream, isEnabled, onFaceMissing, onDetectionFailure }: UseFaceDetectionOptions) {
  const [faceStatus, setFaceStatus] = useState<FaceDetectionResult>({ faceCount: 0, isFacePresent: false });
  const [warning, setWarning] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const timerRef = useRef<number | null>(null);
  const signalStateRef = useRef<ProctoringSignalState>({ lastTriggeredAt: null, active: false });

  useEffect(() => {
    if (!isEnabled || !stream) {
      setFaceStatus({ faceCount: 0, isFacePresent: false });
      setWarning(null);
      signalStateRef.current = { lastTriggeredAt: null, active: false };
      return;
    }

    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.play().catch(() => undefined);

    const checkFace = async () => {
      try {
        if (typeof window.FaceDetector === "undefined") {
          return;
        }

        const detector = new window.FaceDetector({ fastMode: true });
        const faces = await detector.detect(video);
        const hasFace = faces.length > 0;
        const faceCount = faces.length;
        const now = Date.now();

        setFaceStatus({ faceCount, isFacePresent: hasFace });

        if (!hasFace) {
          const signalState = evaluateSignalState(signalStateRef.current, true, now, DEFAULT_PROCTORING_CONFIG);
          signalStateRef.current = signalState;

          if (signalState.shouldAlert) {
            setWarning("Face not detected. Please stay within camera view.");
            setViolationCount((current) => current + 1);
            onFaceMissing?.();
            onDetectionFailure?.("Face not detected for several seconds.");
          }
        } else {
          signalStateRef.current = { lastTriggeredAt: null, active: false };
          setWarning(null);
        }
      } catch {
        setWarning(null);
      }
    };

    timerRef.current = window.setInterval(checkFace, 2500);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      video.srcObject = null;
    };
  }, [isEnabled, onDetectionFailure, onFaceMissing, stream]);

  return { faceStatus, warning, violationCount };
}
