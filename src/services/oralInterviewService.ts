import api from "./api";

export interface OralQuestionTurn {
  _id?: string;
  questionNumber: number;
  category: "Fundamental" | "Conceptual" | "Practical" | "Scenario" | "Adaptive Follow-up" | string;
  question: string;
  spokenAnswer?: string;
  score?: number | null;
  technicalAccuracy?: number | null;
  conceptualKnowledge?: number | null;
  communicationSkill?: number | null;
  completeness?: number | null;
  relevance?: number | null;
  feedback?: string;
  isSatisfactory?: boolean;
  answeredAt?: string;
}

export interface OralInterviewSession {
  sessionId: string;
  jobRole: string;
  status: "In Progress" | "Completed" | "Terminated";
  currentQuestionIndex: number;
  maxQuestions: number;
  currentQuestion?: OralQuestionTurn | null;
  answeredCount: number;
  overallScore?: number | null;
  overallFeedback?: string;
  technicalAccuracyAvg?: number | null;
  conceptualKnowledgeAvg?: number | null;
  communicationSkillAvg?: number | null;
  completenessAvg?: number | null;
  relevanceAvg?: number | null;
  questions?: OralQuestionTurn[];
  isFinished?: boolean;
}

export interface OralAnswerResponse {
  isFinished: boolean;
  evaluation: {
    score: number;
    technicalAccuracy: number;
    conceptualKnowledge: number;
    communicationSkill: number;
    completeness: number;
    relevance: number;
    feedback: string;
    isSatisfactory: boolean;
  };
  currentQuestionIndex?: number;
  nextQuestion?: OralQuestionTurn;
  answeredCount?: number;
  overallScore?: number;
  overallFeedback?: string;
  result?: "Qualified" | "Rejected" | "Pending";
}

export async function startOralInterview() {
  return api.post<OralInterviewSession>("/students/oral/start");
}

export async function submitOralAnswer(sessionId: string, spokenAnswer: string) {
  return api.post<OralAnswerResponse>(`/students/oral/${sessionId}/answer`, { spokenAnswer });
}

export async function getOralSession(sessionId: string) {
  return api.get<OralInterviewSession>(`/students/oral/${sessionId}`);
}

export async function finishOralInterview(sessionId: string) {
  return api.post<OralInterviewSession>(`/students/oral/${sessionId}/finish`);
}

export async function getRecruiterOralDetails(driveId: string, studentId: string) {
  return api.get<{ interview: OralInterviewSession }>(`/company/drives/${driveId}/oral/${studentId}`);
}
