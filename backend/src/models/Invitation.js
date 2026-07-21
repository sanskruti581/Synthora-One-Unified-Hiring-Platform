import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    drive: { type: mongoose.Schema.Types.ObjectId, ref: "HiringDrive", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    token: { type: String, required: true, unique: true },
    activationOpenAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    emailStatus: {
      type: String,
      enum: ["sent", "failed", "smtp_not_configured"],
      default: "smtp_not_configured",
    },
    emailError: String,
    sentAt: Date,
    usedAt: Date,
  },
  { timestamps: true },
);

export default mongoose.model("Invitation", invitationSchema);
