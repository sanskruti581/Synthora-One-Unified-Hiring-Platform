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
  },
  { timestamps: true },
);

export default mongoose.model("HiringDrive", hiringDriveSchema);
