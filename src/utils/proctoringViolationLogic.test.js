import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PROCTORING_CONFIG, evaluateSignalState, evaluateViolationState, isScreenshotShortcut } from "./proctoringViolationLogic.js";

test("first violation warns and does not auto-submit", () => {
  const result = evaluateViolationState({ violationCount: 0, autoSubmitted: false }, {
    type: "tab-switch",
    message: "Tab switching is not allowed.",
  }, DEFAULT_PROCTORING_CONFIG);

  assert.equal(result.violationCount, 1);
  assert.equal(result.shouldAutoSubmit, false);
  assert.equal(result.warningLevel, "warning");
});

test("second violation triggers auto-submit", () => {
  const result = evaluateViolationState({ violationCount: 1, autoSubmitted: false }, {
    type: "tab-switch",
    message: "Tab switching is not allowed.",
  }, DEFAULT_PROCTORING_CONFIG);

  assert.equal(result.violationCount, 2);
  assert.equal(result.shouldAutoSubmit, true);
  assert.equal(result.warningLevel, "auto-submit");
});

test("signals trigger only after the grace period elapses", () => {
  const initialState = { lastTriggeredAt: null, active: false };

  const early = evaluateSignalState(initialState, true, 1000, DEFAULT_PROCTORING_CONFIG);
  assert.equal(early.shouldAlert, false);

  const afterGrace = evaluateSignalState({ lastTriggeredAt: 1000, active: true }, true, 7000, DEFAULT_PROCTORING_CONFIG);
  assert.equal(afterGrace.shouldAlert, true);
  assert.equal(afterGrace.lastTriggeredAt, 7000);
});

test("print screen shortcuts are recognized as screenshot attempts", () => {
  assert.equal(isScreenshotShortcut({ code: "PrintScreen", key: "PrintScreen", ctrlKey: false, metaKey: false, shiftKey: false }), true);
  assert.equal(isScreenshotShortcut({ code: "KeyS", key: "s", ctrlKey: true, metaKey: false, shiftKey: true }), true);
  assert.equal(isScreenshotShortcut({ code: "KeyA", key: "a", ctrlKey: false, metaKey: false, shiftKey: false }), false);
});
