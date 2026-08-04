import { useEffect, useRef, useState } from "react";

interface UseTabFocusMonitorOptions {
  isActive: boolean;
  onViolation?: (reason: string, details?: { eventType?: string; metadata?: Record<string, unknown> }) => void;
}

export function useTabFocusMonitor({ isActive, onViolation }: UseTabFocusMonitorOptions) {
  const [isTabActive, setIsTabActive] = useState(true);
  const [focusEvents, setFocusEvents] = useState(0);
  const lastViolationRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isActive) {
      setIsTabActive(true);
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        const reason = "Tab switching is not allowed during the live assessment.";
        if (lastViolationRef.current !== reason) {
          setIsTabActive(false);
          setFocusEvents((current) => current + 1);
          lastViolationRef.current = reason;
          onViolation?.(reason, { eventType: "tab-switch", metadata: { visibilityState: document.visibilityState } });
        }
      } else {
        setIsTabActive(true);
      }
    };

    const handleBlur = () => {
      const reason = "The assessment window lost focus. Please stay on this tab.";
      if (lastViolationRef.current !== reason) {
        setIsTabActive(false);
        setFocusEvents((current) => current + 1);
        lastViolationRef.current = reason;
        onViolation?.(reason, { eventType: "tab-switch", metadata: { reason: "window-blur" } });
      }
    };

    const handleFocus = () => {
      setIsTabActive(true);
      lastViolationRef.current = null;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isActive, onViolation]);

  return { isTabActive, focusEvents };
}
