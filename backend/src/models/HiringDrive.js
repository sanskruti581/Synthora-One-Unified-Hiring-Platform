import mongoose from "mongoose";

const hiringDriveSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    driveName: { type: String, required: true, trim: true },
    jobRole: { type: String, required: true, trim: true },
    jobDescriptionFile: {
      originalName: String,
      mimeType: String,
      size: Number,
      data: Buffer,
    },
    studentFile: {
      originalName: String,
      mimeType: String,
      size: Number,
      data: Buffer,
    },
    examDate: { type: String, required: true },
    examTime: { type: String, required: true },
    timeZone: { type: String, default: "Asia/Kolkata" },
    examEndTime: { type: String },
    examEndDate: { type: String },
    windowDurationHours: { type: Number, default: 6 },
    durationMinutes: { type: Number, required: true },
    rounds: [{ type: String, enum: ["Aptitude", "Technical Oral", "Coding", "HR Interview", "HR"] }],
    aptitudeCutoff: { type: Number, required: true },
    technicalOralCutoff: { type: Number, default: 60 },
    technicalOralDurationMinutes: { type: Number, default: 20 },
    technicalOralWindowHours: { type: Number, default: 4 },
    lastRegistrationDate: { type: String, required: false },
    status: { type: String, default: "Scheduled" },
    codingCutoff: { type: Number, default: 0 },
    codingDurationMinutes: { type: Number, default: 45 },
    codingWindowDurationHours: { type: Number, default: 6 },
    scoringWeights: {
      aptitude: { type: Number, default: 40 },
      coding: { type: Number, default: 60 },
    },
  },
  { timestamps: true },
);

export default mongoose.model("HiringDrive", hiringDriveSchema);
