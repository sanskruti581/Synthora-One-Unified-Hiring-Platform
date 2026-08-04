import { useEffect, useRef, useState } from "react";
import { DEFAULT_PROCTORING_CONFIG, evaluateSignalState, type ProctoringSignalState } from "../utils/proctoringViolationLogic";

interface UseDeviceDetectionOptions {
  stream: MediaStream | null;
  isEnabled: boolean;
  onDeviceDetected?: (type: string) => void;
}

export function useDeviceDetection({ stream, isEnabled, onDeviceDetected }: UseDeviceDetectionOptions) {
  const [warning, setWarning] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const signalStateRef = useRef<ProctoringSignalState>({ lastTriggeredAt: null, active: false });

  useEffect(() => {
    if (!isEnabled || !stream) {
      setWarning(null);
      signalStateRef.current = { lastTriggeredAt: null, active: false };
      return;
    }

    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.play().catch(() => undefined);

    const interval = window.setInterval(() => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const context = canvas.getContext("2d");

      if (!context || video.readyState < 2) {
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const sample = imageData.data;
      const hasLargeScreenLikeArea = sample.some((value, index) => index % 4 === 0 && value > 180);

      if (hasLargeScreenLikeArea) {
        const signalState = evaluateSignalState(signalStateRef.current, true, Date.now(), DEFAULT_PROCTORING_CONFIG);
        signalStateRef.current = signalState;

        if (signalState.shouldAlert) {
          const message = "Malpractice detected: external device found. This incident has been logged.";
          setWarning(message);
          setViolationCount((current) => current + 1);
          onDeviceDetected?.("external-device");
        }
      } else {
        signalStateRef.current = { lastTriggeredAt: null, active: false };
        setWarning(null);
      }
    }, 5000);

    return () => {
      window.clearInterval(interval);
      video.srcObject = null;
    };
  }, [isEnabled, onDeviceDetected, stream]);

  return { warning, violationCount };
}
