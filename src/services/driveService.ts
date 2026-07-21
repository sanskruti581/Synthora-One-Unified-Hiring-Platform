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

  return api.post("/company/drives", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

export type HiringDrive = {
  _id: string;
  driveName: string;
  jobRole: string;
  examDate: string;
  examTime: string;
  durationMinutes: number;
  rounds: string[];
  aptitudeCutoff: number;
  lastRegistrationDate: string;
  status: string;
  studentsInvited?: number;
  createdAt: string;
};

export async function getHiringDrives() {
  return api.get<HiringDrive[]>("/company/drives");
}
