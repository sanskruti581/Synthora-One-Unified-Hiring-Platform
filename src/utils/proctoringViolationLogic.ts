export interface ProctoringViolationEvent {
  type: string;
  message: string;
  severity?: "low" | "medium" | "high";
  metadata?: Record<string, unknown>;
}

export interface ProctoringViolationState {
  violationCount: number;
  autoSubmitted: boolean;
}

export interface ProctoringConfig {
  warningThreshold: number;
  autoSubmitThreshold: number;
  warningGracePeriodMs: number;
}

export interface ProctoringSignalState {
  lastTriggeredAt: number | null;
  active: boolean;
}

export function isScreenshotShortcut(event: Pick<KeyboardEvent, "code" | "key" | "ctrlKey" | "metaKey" | "shiftKey">) {
  return event.code === "PrintScreen" || event.key === "PrintScreen" || (event.key?.toLowerCase() === "s" && (event.ctrlKey || event.metaKey) && event.shiftKey);
}

export const DEFAULT_PROCTORING_CONFIG: ProctoringConfig = {
  warningThreshold: 1,
  autoSubmitThreshold: 2,
  warningGracePeriodMs: 5000,
};

export function evaluateSignalState(
  previousState: ProctoringSignalState,
  isActive: boolean,
  now: number,
  config: ProctoringConfig = DEFAULT_PROCTORING_CONFIG,
): ProctoringSignalState & { shouldAlert: boolean } {
  if (!isActive) {
    return {
      shouldAlert: false,
      lastTriggeredAt: null,
      active: false,
    };
  }

  if (!previousState.lastTriggeredAt) {
    return {
      shouldAlert: false,
      lastTriggeredAt: now,
      active: true,
    };
  }

  const elapsed = now - previousState.lastTriggeredAt;
  const shouldAlert = elapsed >= config.warningGracePeriodMs;

  return {
    shouldAlert,
    lastTriggeredAt: shouldAlert ? now : previousState.lastTriggeredAt,
    active: true,
  };
}

export function evaluateViolationState(
  previousState: ProctoringViolationState,
  event: ProctoringViolationEvent,
  config: ProctoringConfig = DEFAULT_PROCTORING_CONFIG,
) {
  const nextViolationCount = previousState.violationCount + 1;
  const shouldAutoSubmit = nextViolationCount >= config.autoSubmitThreshold && !previousState.autoSubmitted;

  let warningLevel: "none" | "warning" | "auto-submit" = "none";

  if (shouldAutoSubmit) {
    warningLevel = "auto-submit";
  } else if (nextViolationCount >= config.warningThreshold) {
    warningLevel = "warning";
  }

  return {
    violationCount: nextViolationCount,
    shouldAutoSubmit,
    warningLevel,
    event,
    autoSubmitted: previousState.autoSubmitted || shouldAutoSubmit,
  };
}
