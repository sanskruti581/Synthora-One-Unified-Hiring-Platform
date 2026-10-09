import mongoose from "mongoose";

const codingQuestionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
  description: { type: String, required: true },
  constraints: [String],
  examples: [{
    input: String,
    output: String,
    explanation: String,
  }],
  starterCode: {
    javascript: String,
    python: String,
  },
  testCases: [{
    input: String,
    expectedOutput: String,
    isHidden: { type: Boolean, default: false },
  }],
  marks: { type: Number, default: 10 },
  timeLimit: { type: Number, default: 2000 }, // ms
  memoryLimit: { type: Number, default: 256 }, // MB
}, { timestamps: true });

export default mongoose.model("CodingQuestion", codingQuestionSchema);
