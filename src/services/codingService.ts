import api from "./api";

export type CodingQuestion = {
  _id: string;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  constraints: string[];
  examples: { input: string; output: string; explanation?: string }[];
  starterCode: { javascript?: string; python?: string; java?: string; c?: string; cpp?: string };
  testCases: { input: string; expectedOutput: string }[];  // visible only
  marks: number;
};

export type TestResult = {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error?: string;
};

export type RunCodeResponse = {
  results: TestResult[];
  passedCount: number;
  totalCount: number;
  compilationError?: string;
};

export type SubmitCodeResponse = {
  message: string;
  codingScore: number;
  maxCodingScore: number;
  passedCount: number;
  totalCount: number;
  nextRound: string | null;
  overallScore: number | null;
  result: string;
  isQualified?: boolean;
  completedAt?: string;
};

export type CodingAssessmentData = {
  studentName: string;
  companyName: string;
  driveName: string;
  driveId: string;
  examDate: string;
  examTime: string;
  durationMinutes: number;
  codingDurationMinutes: number;
  assessmentStatus: string;
  currentRound: string;
  startedAt?: string;
  examStartAt: string;
  examEndAt?: string;
  codingExpiresAt?: string;
  savedSolutions?: { questionId: string; language: string; sourceCode: string }[];
};

export async function getCodingAssessment(driveId: string) {
  return api.get<CodingAssessmentData>(`/coding/assessment/${driveId}`);
}

export async function getCodingQuestions(driveId: string) {
  return api.get<{ questions: CodingQuestion[] }>(`/coding/questions/${driveId}`);
}

export async function runCode(data: {
  questionId: string;
  language: string;
  sourceCode: string;
  driveId: string;
}) {
  return api.post<RunCodeResponse>("/coding/run", data);
}

export async function submitCodingRound(data: {
  driveId: string;
  solutions: { questionId: string; language: string; sourceCode: string }[];
  autoSubmitted?: boolean;
}) {
  return api.post<SubmitCodeResponse>("/coding/submit", data);
}

export async function saveCodingDraft(data: {
  driveId: string;
  solutions: { questionId: string; language: string; sourceCode: string }[];
}) {
  return api.post<{ message: string; savedAt: string }>("/coding/save", data);
}
