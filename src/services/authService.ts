import api from "./api";

export type CompanyRegistrationPayload = {
  companyName: string;
  hrName: string;
  email: string;
  phone: string;
  website: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  userType: "company" | "student";
  token?: string;
};

export async function registerCompany(payload: CompanyRegistrationPayload) {
  return api.post("/companies/register", payload);
}

export async function loginUser(payload: LoginPayload) {
  return api.post<LoginResponse>("/auth/login", payload);
}

export async function activateStudentInvitation(token: string) {
  return api.post<{
    message: string;
    alreadyActivated: boolean;
    email: string;
    temporaryPassword?: string;
    driveName: string;
    companyName: string;
    examDate: string;
    examTime: string;
  }>(`/students/activate/${token}`);
}

export async function getStudentInvitation(token: string) {
  return api.get<{
    token: string;
    invitationStatus: string;
    alreadyActivated: boolean;
    email: string;
    studentName: string;
    driveName: string;
    jobRole: string;
    companyName: string;
    examDate: string;
    examTime: string;
    durationMinutes: number;
    status: string;
    roundName: string;
    driveId: string;
    examStartAt: string;
    loginWindowOpenAt: string;
    canLogin: boolean;
    canStartAssessment: boolean;
    loginCountdownSeconds: number;
    examCountdownSeconds: number;
    activationOpenAt: string;
    expiresAt: string;
  }>(`/students/invite/${token}`);
}

export async function startInvitationAssessment(token: string) {
  return api.post<{
    message: string;
    token: string;
    driveId: string;
    studentName: string;
    companyName: string;
    driveName: string;
  }>(`/students/invite/${token}/start`);
}
