import api from "./api";

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
  loginWindowOpenAt: string;
  canStartAssessment: boolean;
  answers: Record<string, string>;
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
  return api.get<AssessmentData>(`/students/assessment/${driveId}`);
}

export async function startAssessmentForDrive(driveId: string) {
  return api.post(`/students/assessment/${driveId}/start`);
}

export async function saveAssessmentAnswers(driveId: string, answers: Record<string, string>) {
  return api.post(`/students/assessment/${driveId}/answers`, { answers });
}

export async function submitAssessment(score: number, answers: Record<string, string>) {
  return api.post("/students/assessment/complete", { score, answers });
}
