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
    email: string;
    temporaryPassword: string;
    driveName: string;
    companyName: string;
    examDate: string;
    examTime: string;
  }>(`/students/activate/${token}`);
}
