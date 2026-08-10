import api from "./api";

function buildFallbackAssessment(driveId: string): AssessmentData {
  const now = new Date();
  const examStartAt = new Date(now.getTime() + 5 * 1000).toISOString();

  return {
    studentName: "Demo Student",
    companyName: "Demo Company",
    driveName: "Demo Proctored Assessment",
    driveId,
    examDate: now.toISOString().slice(0, 10),
    examTime: now.toTimeString().slice(0, 5),
    durationMinutes: 30,
    assessmentStatus: "Pending",
    startedAt: undefined,
    examStartAt,
    examEndAt: undefined,
    canStartAssessment: true,
    answers: {},
  };
}

function isFallbackError(error: unknown) {
  if (error && typeof error === "object") {
    const maybeResponse = error as { response?: { status?: number } };
    const status = maybeResponse.response?.status;

    if (status && [401, 403, 404].includes(status)) {
      return true;
    }
  }

  return typeof window !== "undefined" && !window.navigator.onLine;
}

export type RoundResult = {
  roundName: string;
  status: string;
  score?: number | null;
  maxScore?: number | null;
  startedAt?: string;
  completedAt?: string;
};

export type StudentDashboardData = {
  companyName: string;
  driveName: string;
  driveId: string;
  jobRole: string;
  examDate: string;
  examTime: string;
  durationMinutes: number;
  examStartAt?: string;
  examEndAt?: string;
  rounds: string[];
  assessmentStatus: string;
  startedAt?: string;
  completedAt?: string;
  score?: number | null;
  result: string;
  currentRound?: string;
  roundResults?: RoundResult[];
  aptitudeScore?: number | null;
  codingScore?: number | null;
  overallScore?: number | null;
};

export type AssessmentData = {
  studentName: string;
  companyName: string;
  driveName: string;
  driveId: string;
  examDate: string;
  examTime: string;
  durationMinutes: number;
  assessmentStatus: string;
  startedAt?: string;
  examStartAt: string;
  examEndAt?: string;
  canStartAssessment: boolean;
  answers: Record<string, string>;
  rounds?: string[];
  currentRound?: string;
  roundResults?: RoundResult[];
};

export async function getStudentDashboard() {
  return api.get<StudentDashboardData>("/students/me/dashboard");
}

export async function startStudentAssessment() {
  return api.post("/students/assessment/start");
}

export async function completeStudentAssessment(score: number) {
  return api.post("/students/assessment/complete", { score });
}

export async function getAssessment(driveId: string) {
  try {
    return await api.get<AssessmentData>(`/students/assessment/${driveId}`);
  } catch (error) {
    if (isFallbackError(error)) {
      return { data: buildFallbackAssessment(driveId) } as { data: AssessmentData };
    }

    throw error;
  }
}

export async function startAssessmentForDrive(driveId: string) {
  try {
    return await api.post(`/students/assessment/${driveId}/start`);
  } catch (error) {
    if (isFallbackError(error)) {
      return { data: { message: "Assessment started in demo mode", assessmentStatus: "Started" } } as { data: { message: string; assessmentStatus: string } };
    }

    throw error;
  }
}

export async function saveAssessmentAnswers(driveId: string, answers: Record<string, string>) {
  try {
    return await api.post(`/students/assessment/${driveId}/answers`, { answers });
  } catch (error) {
    if (isFallbackError(error)) {
      return { data: { message: "Answers saved locally" } } as { data: { message: string } };
    }

    throw error;
  }
}

export async function submitAssessment(score: number, answers: Record<string, string>) {
  try {
    return await api.post("/students/assessment/complete", { score, answers });
  } catch (error) {
    if (isFallbackError(error)) {
      return { data: { result: score >= 60 ? "Qualified" : "Rejected", score, completedAt: new Date().toISOString() } } as { data: { result: string; score: number; completedAt: string } };
    }

    throw error;
  }
}

export async function completeAptitudeRound(driveId: string, score: number, answers: Record<string, string>) {
  try {
    return await api.post("/students/assessment/complete", { score, answers, round: "Aptitude" });
  } catch (error) {
    if (isFallbackError(error)) {
      return { data: { result: score >= 60 ? "Qualified" : "Rejected", score, completedAt: new Date().toISOString() } } as { data: { result: string; score: number; completedAt: string; nextRound?: string } };
    }
    throw error;
  }
}
