import api from "./api";

export type HiringDrivePayload = {
  driveName: string;
  jobRole: string;
  jobDescription: File | null;
  studentFile: File | null;
  examDate: string;
  examTime: string;
  durationMinutes: string;
  rounds: string[];
  aptitudeCutoff: string;
  lastRegistrationDate: string;
};

export async function createHiringDrive(payload: HiringDrivePayload) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (key === "rounds") {
      formData.append(key, JSON.stringify(value));
      return;
    }

    if (value instanceof File) {
      formData.append(key, value);
      return;
    }

    if (typeof value === "string" && value) {
      formData.append(key, value);
    }
  });

  return api.post("/company/drives", formData);
}

export type HiringDrive = {
  _id: string;
  driveName: string;
  jobRole: string;
  jobDescriptionFile?: {
    originalName?: string;
    mimeType?: string;
    size?: number;
  };
  studentFile?: {
    originalName?: string;
    mimeType?: string;
    size?: number;
  };
  examDate: string;
  examTime: string;
  durationMinutes: number;
  rounds: string[];
  aptitudeCutoff: number;
  lastRegistrationDate: string;
  status: string;
  studentsInvited?: number;
  studentsLoggedIn?: number;
  studentsWaiting?: number;
  studentsStarted?: number;
  studentsCompleted?: number;
  averageScore?: number;
  highestScore?: number;
  lowestScore?: number;
  qualifiedStudents?: number;
  rejectedStudents?: number;
  createdAt: string;
};

export async function getHiringDrives() {
  return api.get<HiringDrive[]>("/company/drives");
}

export type DriveStudent = {
  _id: string;
  studentName: string;
  email: string;
  invitationStatus: string;
  emailSent: boolean;
  emailSentStatus: string;
  deliveryStatus: string;
  sentTime?: string;
  assessmentStatus: string;
  startedAt?: string;
  completedAt?: string;
  score?: number | null;
  result: string;
};

export type DriveStats = {
  studentsInvited: number;
  studentsLoggedIn: number;
  studentsWaiting?: number;
  studentsStarted: number;
  studentsCompleted: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  qualifiedStudents: number;
  rejectedStudents: number;
};

export async function getHiringDriveDetails(driveId: string) {
  return api.get<{ drive: HiringDrive; stats: DriveStats; students: DriveStudent[] }>(`/company/drives/${driveId}`);
}

export async function deleteHiringDrive(driveId: string) {
  return api.delete(`/company/drives/${driveId}`);
}

export async function sendReminderEmails(driveId: string) {
  return api.post<{ message: string; sent: number; failed: number; total: number }>(`/company/drives/${driveId}/reminders`);
}

export async function downloadDriveFile(driveId: string, type: "jd" | "students-file" | "qualified" | "results" | "report", filename: string) {
  const response = await api.get<Blob>(`/company/drives/${driveId}/download/${type}`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
