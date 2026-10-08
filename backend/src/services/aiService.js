import Groq from "groq-sdk";

const CATEGORIES = [
  "Fundamental",
  "Conceptual",
  "Practical",
  "Scenario",
  "Adaptive Follow-up",
];

const FALLBACK_QUESTION_BANKS = {
  default: [
    { category: "Fundamental", question: "Can you explain the difference between synchronous and asynchronous execution in modern web applications?" },
    { category: "Conceptual", question: "How does state management work in frontend frameworks, and when should you choose global state over local state?" },
    { category: "Practical", question: "Walk me through how you design and secure a RESTful API endpoint that handles user authentication." },
    { category: "Scenario", question: "Suppose an API request takes several seconds to respond during peak traffic. How would you diagnose and optimize it?" },
    { category: "Adaptive Follow-up", question: "Based on your previous answers, how would you implement caching and database indexing to maintain scalability?" },
  ],
};

function clampMetric(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(numeric), 0), 10);
}

function createEvaluationUnavailableError(message) {
  const error = new Error(message);
  error.code = "ORAL_EVALUATION_UNAVAILABLE";
  error.statusCode = 503;
  return error;
}

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[Synthora AI] Warning: GROQ_API_KEY is not configured.");
    return null;
  }
  return new Groq({ apiKey });
}

export function getQuestionCategory(questionNumber) {
  const index = Math.min(Math.max(questionNumber - 1, 0), CATEGORIES.length - 1);
  return CATEGORIES[index];
}

/**
 * Generate a role-specific technical oral viva question using Groq.
 */
export async function generateOralQuestion({
  jobRole = "Software Engineer",
  jobDescription = "",
  questionNumber = 1,
  previousTurns = [],
}) {
  const category = getQuestionCategory(questionNumber);
  const groq = getGroqClient();

  if (!groq) {
    const fallbackList = FALLBACK_QUESTION_BANKS.default;
    const fallback = fallbackList[Math.min(questionNumber - 1, fallbackList.length - 1)];
    return {
      category: fallback.category,
      question: fallback.question,
    };
  }

  const turnsContext = previousTurns
    .map(
      (turn, i) =>
        `Turn ${i + 1} (${turn.category}):\nQ: ${turn.question}\nCandidate Answer: ${turn.spokenAnswer || "(No answer given)"}\nAI Score: ${turn.score ?? "N/A"}/10`
    )
    .join("\n\n");

  const prompt = `You are Synthora AI, an expert, objective technical viva interviewer conducting a 5-question spoken technical oral exam for the role: "${jobRole}".
Hiring drive context: ${jobDescription || "No additional job description text was provided."}

Interview progression guideline:
- Question 1: Fundamental concept in ${jobRole}
- Question 2: Conceptual understanding & architecture
- Question 3: Practical / real-world implementation question
- Question 4: Scenario / problem-solving / debugging challenge
- Question 5: Adaptive follow-up (dig into any weak, incomplete, or interesting point from previous turns)

Current Question Number: ${questionNumber} of 5.
Assigned Category: ${category}.

${turnsContext ? `Previous Conversation History:\n${turnsContext}\n` : "This is the very first question of the oral interview."}

Instructions:
1. Ask ONE clear, focused technical question fitting the category "${category}" for "${jobRole}".
2. The question must be designed for a candidate to answer verbally within 90 seconds.
3. Keep the question crisp and under 2 sentences.
4. Output ONLY the question text. Do NOT add greetings, preamble, quotes, or markdown.`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 150,
    });

    const question = response.choices[0]?.message?.content?.trim() || "";
    if (question.length > 10) {
      return { category, question };
    }
  } catch (error) {
    console.error("[Synthora AI] Error generating oral question from Groq:", error.message);
  }

  // Graceful fallback if Groq call failed
  const fallbackList = FALLBACK_QUESTION_BANKS.default;
  const fallback = fallbackList[Math.min(questionNumber - 1, fallbackList.length - 1)];
  return {
    category,
    question: fallback.question,
  };
}

/**
 * Evaluate candidate's spoken technical answer using Groq with structured JSON.
 */
export async function evaluateSpokenAnswer({
  jobRole = "Software Engineer",
  jobDescription = "",
  category = "Conceptual",
  question,
  answer,
}) {
  const trimmedAnswer = (answer || "").trim();

  // If candidate gave virtually no response (silence or less than 3 words)
  if (!trimmedAnswer || trimmedAnswer.split(/\s+/).length < 3) {
    return {
      score: 1,
      technicalAccuracy: 1,
      conceptualKnowledge: 1,
      communicationSkill: 2,
      completeness: 1,
      relevance: 1,
      feedback: "Minimal or no response was recorded for this question.",
      isSatisfactory: false,
    };
  }

  const groq = getGroqClient();

  if (!groq) {
    throw createEvaluationUnavailableError("Technical Oral answer evaluation is unavailable because GROQ_API_KEY is not configured.");
  }

  const systemPrompt = `You are Synthora AI, an expert technical evaluator. Evaluate the candidate's spoken viva answer objectively against the role and question.
Role: ${jobRole}
Hiring drive context: ${jobDescription || "No additional job description text was provided."}
Question Category: ${category}
Question: ${question}

Return your evaluation in strict JSON format with exactly these fields:
{
  "score": <integer from 0 to 10>,
  "technicalAccuracy": <integer from 0 to 10>,
  "conceptualKnowledge": <integer from 0 to 10>,
  "communicationSkill": <integer from 0 to 10>,
  "completeness": <integer from 0 to 10>,
  "relevance": <integer from 0 to 10>,
  "feedback": "<1-2 sentences of clear, constructive feedback on the response>",
  "isSatisfactory": <true if score >= 6 else false>
}`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Candidate's Spoken Answer:\n"${trimmedAnswer}"` },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    const parsed = JSON.parse(content);
    const score = clampMetric(parsed.score);

    return {
      score,
      technicalAccuracy: clampMetric(parsed.technicalAccuracy),
      conceptualKnowledge: clampMetric(parsed.conceptualKnowledge),
      communicationSkill: clampMetric(parsed.communicationSkill),
      completeness: clampMetric(parsed.completeness),
      relevance: clampMetric(parsed.relevance),
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : "Answer evaluated.",
      isSatisfactory: typeof parsed.isSatisfactory === "boolean" ? parsed.isSatisfactory : score >= 6,
    };
  } catch (error) {
    console.error("[Synthora AI] Groq evaluation error:", error.message);
    throw createEvaluationUnavailableError("Technical Oral answer evaluation failed. Please retry the answer submission.");
  }
}

/**
 * Generate final overall summary for the completed oral interview.
 */
export async function generateFinalOralSummary({ jobRole, jobDescription = "", turns = [] }) {
  const scores = turns.map((t) => (typeof t.score === "number" ? t.score : 0));
  const avg = scores.length ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
  const overallScore = Math.round(avg * 10); // scale 0-100

  const accuracyAvg = turns.length
    ? Math.round(turns.reduce((sum, t) => sum + (t.technicalAccuracy || 0), 0) / turns.length)
    : 0;
  const conceptualAvg = turns.length
    ? Math.round(turns.reduce((sum, t) => sum + (t.conceptualKnowledge || 0), 0) / turns.length)
    : 0;
  const communicationAvg = turns.length
    ? Math.round(turns.reduce((sum, t) => sum + (t.communicationSkill || 0), 0) / turns.length)
    : 0;
  const completenessAvg = turns.length
    ? Math.round(turns.reduce((sum, t) => sum + (t.completeness || 0), 0) / turns.length)
    : 0;
  const relevanceAvg = turns.length
    ? Math.round(turns.reduce((sum, t) => sum + (t.relevance || 0), 0) / turns.length)
    : 0;

  let feedback = `The candidate demonstrated an overall technical proficiency score of ${overallScore}/100 for the ${jobRole} role.`;

  const groq = getGroqClient();
  if (groq && turns.length > 0) {
    try {
      const summaryPrompt = `Based on the following 5 technical viva questions and evaluations for a "${jobRole}" candidate:
Hiring drive context: ${jobDescription || "No additional job description text was provided."}
${turns.map((t, i) => `Q${i + 1} (${t.category}): "${t.question}" -> Score: ${t.score}/10. Feedback: ${t.feedback}`).join("\n")}

Write a concise 2-sentence executive summary of the candidate's technical strengths and areas for growth. Output only the summary text.`;

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: summaryPrompt }],
        max_tokens: 150,
      });

      const generatedSummary = response.choices[0]?.message?.content?.trim();
      if (generatedSummary) {
        feedback = generatedSummary;
      }
    } catch {
      // Keep deterministic feedback fallback
    }
  }

  return {
    overallScore,
    technicalAccuracyAvg: accuracyAvg,
    conceptualKnowledgeAvg: conceptualAvg,
    communicationSkillAvg: communicationAvg,
    completenessAvg,
    relevanceAvg,
    overallFeedback: feedback,
  };
}
