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
    durationMinutes: { type: Number, required: true },
    rounds: [{ type: String, enum: ["Aptitude", "Coding", "HR Interview", "HR"] }],
    aptitudeCutoff: { type: Number, required: true },
    lastRegistrationDate: { type: String, required: true },
    status: { type: String, default: "Scheduled" },
    codingCutoff: { type: Number, default: 0 },
    codingDurationMinutes: { type: Number, default: 45 },
    scoringWeights: {
      aptitude: { type: Number, default: 40 },
      coding: { type: Number, default: 60 },
    },
  },
  { timestamps: true },
);

export default mongoose.model("HiringDrive", hiringDriveSchema);
