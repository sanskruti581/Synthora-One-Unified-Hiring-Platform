import mongoose from "mongoose";

const aptitudeQuestionSchema = new mongoose.Schema(
  {
    drive: { type: mongoose.Schema.Types.ObjectId, ref: "HiringDrive", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    questionNumber: { type: Number, required: true },
    question: { type: String, required: true, trim: true },
    options: [{ type: String, required: true, trim: true }],
    correctAnswer: { type: String, required: true, trim: true },
    marks: { type: Number, default: 1 },
    category: { type: String, trim: true, default: "General" },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
  },
  { timestamps: true }
);

aptitudeQuestionSchema.index({ drive: 1, questionNumber: 1 });

export default mongoose.model("AptitudeQuestion", aptitudeQuestionSchema);
