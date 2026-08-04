import api from "./api";

function getStoredEvents() {
  if (typeof window === "undefined") {
    return [] as Array<Record<string, unknown>>;
  }

  try {
    const raw = window.localStorage.getItem("synthora-proctoring-events");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistEvents(events: Array<Record<string, unknown>>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem("synthora-proctoring-events", JSON.stringify(events));
}

export interface ProctoringEventPayload {
  eventType: string;
  severity?: "low" | "medium" | "high";
  message: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export async function logProctoringEvent(payload: ProctoringEventPayload) {
  try {
    return await api.post("/proctoring/events", payload);
  } catch {
    const events = getStoredEvents();
    events.push({
      ...payload,
      occurredAt: payload.occurredAt || new Date().toISOString(),
      storedLocally: true,
    });
    persistEvents(events);

    return { data: { message: "Violation stored locally", event: events[events.length - 1] } };
  }
}

export async function getProctoringReport(driveId: string) {
  try {
    return await api.get(`/proctoring/report/${driveId}`);
  } catch {
    const events = getStoredEvents().filter((event: Record<string, unknown>) => {
      const driveIdValue = event.driveId ?? (event.metadata as Record<string, unknown> | undefined)?.driveId;
      return driveIdValue === driveId;
    });
    return { data: { driveId, events } };
  }
}
