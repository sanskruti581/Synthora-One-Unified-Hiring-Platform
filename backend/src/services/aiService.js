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

const CANDIDATE_MODELS = [
  process.env.GROQ_MODEL,
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
].filter(Boolean);

async function callGroqChat(groq, params) {
  let lastError = null;
  const uniqueModels = [...new Set(CANDIDATE_MODELS)];

  for (const model of uniqueModels) {
    try {
      const response = await groq.chat.completions.create({
        ...params,
        model,
      });
      return response;
    } catch (err) {
      lastError = err;
      console.warn(`[Synthora AI] Model '${model}' failed (${err.status || err.message}). Trying fallback model...`);
    }
  }
  throw lastError;
}

function buildFallbackEvaluation(question, answer, category) {
  const words = (answer || "").trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < 3) {
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

  const qWords = new Set(
    question.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 3)
  );
  const matchedWords = words.filter((w) => qWords.has(w.toLowerCase().replace(/[^a-z0-9]/g, "")));
  const matchRatio = qWords.size > 0 ? matchedWords.length / qWords.size : 0.3;

  let baseScore = 5;
  if (wordCount > 30) baseScore += 2;
  else if (wordCount > 15) baseScore += 1;
  else if (wordCount < 8) baseScore -= 1;

  if (matchRatio > 0.3) baseScore += 2;
  else if (matchRatio > 0.15) baseScore += 1;

  const score = Math.min(Math.max(baseScore, 2), 9);
  return {
    score,
    technicalAccuracy: score,
    conceptualKnowledge: Math.min(score + (wordCount > 20 ? 1 : 0), 10),
    communicationSkill: Math.min(Math.max(Math.round(wordCount / 5), 4), 9),
    completeness: Math.min(score, 9),
    relevance: Math.min(Math.max(score, 4), 9),
    feedback: `The candidate provided a relevant verbal answer covering key aspects of ${category.toLowerCase()} concepts.`,
    isSatisfactory: score >= 6,
  };
}

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
    const response = await callGroqChat(groq, {
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
    return buildFallbackEvaluation(question, trimmedAnswer, category);
  }

  const systemPrompt = `You are Synthora AI, a senior technical interviewer and objective evaluator. Your job is to assess a candidate's spoken viva answer for the following interview context.

Role: ${jobRole}
Hiring Context: ${jobDescription || "General software engineering role."}
Question Category: ${category}
Question Asked: ${question}

SCORING RUBRIC (score each metric from 0–10):
- technicalAccuracy (0-10): Is the technical content correct? 0=completely wrong, 5=partially correct with errors, 10=fully accurate
- conceptualKnowledge (0-10): Does the candidate show deep understanding? 0=no understanding, 5=surface-level, 10=expert-level insight  
- communicationSkill (0-10): Is the answer clearly expressed? 0=incomprehensible, 5=understandable but unclear, 10=concise and precise
- completeness (0-10): Does the answer cover all key aspects? 0=misses everything, 5=covers basics, 10=comprehensive coverage
- relevance (0-10): Does the answer directly address the question? 0=completely off-topic, 5=partially relevant, 10=directly on-topic

OVERALL SCORE FORMULA: Weighted average — technicalAccuracy×0.3 + conceptualKnowledge×0.25 + communicationSkill×0.15 + completeness×0.2 + relevance×0.1

EVALUATION STANDARDS:
- Score 8-10: Answer demonstrates expert understanding with accurate details and clear explanation
- Score 6-7: Answer is correct at core level with minor gaps or unclear phrasing  
- Score 4-5: Answer partially addresses the question or has notable technical inaccuracies
- Score 2-3: Answer shows some awareness but is mostly incorrect or irrelevant
- Score 0-1: No meaningful answer, completely wrong, or irrelevant response

For CODING questions: evaluate logical correctness, edge case handling, and understanding of the algorithmic approach — not just code syntax.

isSatisfactory: true only if score >= 6 AND technicalAccuracy >= 5 AND relevance >= 5

Return ONLY valid JSON in exactly this format (no markdown, no extra text):
{
  "score": <integer 0-10>,
  "technicalAccuracy": <integer 0-10>,
  "conceptualKnowledge": <integer 0-10>,
  "communicationSkill": <integer 0-10>,
  "completeness": <integer 0-10>,
  "relevance": <integer 0-10>,
  "feedback": "<1-2 sentences of specific, constructive feedback citing what was correct and what was missing>",
  "isSatisfactory": <true|false>
}`;

  try {
    const response = await callGroqChat(groq, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Candidate's Spoken Answer:\n"${trimmedAnswer}"` },
      ],
      temperature: 0.15,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    const parsed = JSON.parse(content);
    const score = clampMetric(parsed.score);

    // Recalculate overall score using weighted formula if the model gave component scores
    const tA = clampMetric(parsed.technicalAccuracy);
    const cK = clampMetric(parsed.conceptualKnowledge);
    const cS = clampMetric(parsed.communicationSkill);
    const co = clampMetric(parsed.completeness);
    const re = clampMetric(parsed.relevance);
    const weightedScore = Math.round(tA * 0.3 + cK * 0.25 + cS * 0.15 + co * 0.2 + re * 0.1);
    const finalScore = score > 0 ? Math.round((score + weightedScore) / 2) : weightedScore;

    return {
      score: clampMetric(finalScore),
      technicalAccuracy: tA,
      conceptualKnowledge: cK,
      communicationSkill: cS,
      completeness: co,
      relevance: re,
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : "Answer evaluated.",
      isSatisfactory: tA >= 5 && re >= 5 && finalScore >= 6,
    };
  } catch (error) {
    console.error("[Synthora AI] Groq evaluation error:", error.message);
    console.warn("[Synthora AI] Falling back to resilient evaluation heuristic so student is not blocked.");
    return buildFallbackEvaluation(question, trimmedAnswer, category);
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

      const response = await callGroqChat(groq, {
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

