import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    drive: { type: mongoose.Schema.Types.ObjectId, ref: "HiringDrive", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    passwordHash: { type: String, required: true },
    plainPasswordForInitialEmail: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    activatedAt: { type: Date },
    assessmentStatus: {
      type: String,
      enum: ["Pending", "Logged In", "Started", "Completed"],
      default: "Pending",
    },
    lastLogin: Date,
    startedAt: Date,
    completedAt: Date,
    currentRound: { type: String, default: "Aptitude" },
    answers: {
      type: Map,
      of: String,
      default: {},
    },
    score: { type: Number, default: null },
    result: {
      type: String,
      enum: ["Pending", "Qualified", "Rejected"],
      default: "Pending",
    },
    roundResults: [{
      roundName: { type: String, required: true },
      status: { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Pending" },
      score: { type: Number, default: null },
      maxScore: { type: Number, default: null },
      startedAt: { type: Date },
      completedAt: { type: Date },
      submission: { type: mongoose.Schema.Types.Mixed, default: {} },
    }],
    codingAnswers: { type: mongoose.Schema.Types.Mixed, default: {} },
    aptitudeScore: { type: Number, default: null },
    codingScore: { type: Number, default: null },
    overallScore: { type: Number, default: null },
  },
  { timestamps: true },
);

studentSchema.index({ email: 1, drive: 1 }, { unique: true });

export default mongoose.model("Student", studentSchema);
