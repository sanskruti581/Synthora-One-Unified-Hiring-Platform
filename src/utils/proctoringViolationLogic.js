export function isScreenshotShortcut(event) {
  return event.code === "PrintScreen" || event.key === "PrintScreen" || (event.key?.toLowerCase() === "s" && (event.ctrlKey || event.metaKey) && event.shiftKey);
}

export const DEFAULT_PROCTORING_CONFIG = {
  warningThreshold: 1,
  autoSubmitThreshold: 2,
  warningGracePeriodMs: 5000,
};

export function evaluateSignalState(previousState, isActive, now, config = DEFAULT_PROCTORING_CONFIG) {
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

export function evaluateViolationState(previousState, event, config = DEFAULT_PROCTORING_CONFIG) {
  const nextViolationCount = previousState.violationCount + 1;
  const shouldAutoSubmit = nextViolationCount >= config.autoSubmitThreshold && !previousState.autoSubmitted;

  let warningLevel = "none";

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
