import { Router } from "express";
import { requireStudent } from "../middleware/auth.js";
import Student from "../models/Student.js";
import HiringDrive from "../models/HiringDrive.js";
import ProctoringEvent from "../models/ProctoringEvent.js";

const router = Router();

router.post("/events", requireStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const payload = req.body || {};
    const event = await ProctoringEvent.create({
      student: student._id,
      drive: student.drive,
      eventType: payload.eventType || "unknown",
      severity: payload.severity || "medium",
      message: payload.message || "Proctoring event logged",
      metadata: payload.metadata || {},
      occurredAt: payload.occurredAt ? new Date(payload.occurredAt) : new Date(),
    });

    res.status(201).json({ message: "Violation logged", event });
  } catch (error) {
    res.status(500).json({ message: "Failed to log proctoring event", error: error.message });
  }
});

router.get("/events", async (_req, res) => {
  try {
    const events = await ProctoringEvent.find().sort({ occurredAt: -1 }).lean();
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: "Failed to load proctoring events", error: error.message });
  }
});

router.get("/report/:driveId", async (req, res) => {
  try {
    const drive = await HiringDrive.findById(req.params.driveId);

    if (!drive) {
      return res.status(404).json({ message: "Drive not found" });
    }

    const events = await ProctoringEvent.find({ drive: drive._id }).sort({ occurredAt: -1 }).lean();
    res.json({ driveId: drive._id, events });
  } catch (error) {
    res.status(500).json({ message: "Failed to load proctoring report", error: error.message });
  }
});

export default router;
