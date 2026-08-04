import mongoose from "mongoose";

const proctoringEventSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    drive: { type: mongoose.Schema.Types.ObjectId, ref: "HiringDrive", required: true },
    eventType: { type: String, required: true },
    severity: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    message: { type: String, required: true },
    metadata: { type: Object, default: {} },
    occurredAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export default mongoose.model("ProctoringEvent", proctoringEventSchema);
