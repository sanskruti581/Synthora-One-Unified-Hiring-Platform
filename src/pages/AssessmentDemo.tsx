import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Question = {
  id: number;
  question: string;
  options: string[];
  answer: string;
};

const questions: Question[] = [
  {
    id: 1,
    question: "A shopkeeper sold an item for ₹1,200 at a 20% profit. What was the cost price?",
    options: ["₹900", "₹950", "₹1,000", "₹1,050"],
    answer: "₹1,000",
  },
  {
    id: 2,
    question: "If 3 workers complete a task in 8 hours, how many hours will 4 workers take at the same rate?",
    options: ["4 hours", "5 hours", "6 hours", "7 hours"],
    answer: "6 hours",
  },
  {
    id: 3,
    question: "Which of the following is an operating system?",
    options: ["MS Word", "Excel", "Linux", "PowerPoint"],
    answer: "Linux",
  },
  {
    id: 4,
    question: "Choose the correct sentence:",
    options: ["She do not like tea.", "She does not like tea.", "She does not likes tea.", "She not does like tea."],
    answer: "She does not like tea.",
  },
  {
    id: 5,
    question: "Find the next number in the series: 2, 6, 12, 20, 30, ?",
    options: ["36", "40", "42", "48"],
    answer: "42",
  },
];

export default function AssessmentDemo() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(() => {
    return questions.reduce((count, question) => {
      return answers[question.id] === question.answer ? count + 1 : count;
    }, 0);
  }, [answers]);

  const handleSelect = (questionId: number, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  return (
    <main className="min-h-screen bg-synthora-radial px-5 py-10 text-white sm:px-8 lg:px-16">
      <div className="mx-auto max-w-5xl rounded-[32px] border border-white/15 bg-[#21085F]/80 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-8 lg:p-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#FF9FC2]">Aptitude Demo</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Try a sample aptitude round</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
              This is a lightweight preview of the assessment experience for Synthora.One. You can test the flow and see how the interface works.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold transition hover:bg-white/20"
          >
            Back to Home
          </Link>
        </div>

        <div className="mt-8 rounded-[24px] border border-white/15 bg-white/10 p-4 sm:p-6">
          {questions.map((question, index) => (
            <div key={question.id} className="rounded-[20px] border border-white/10 bg-[#2d0f6a]/70 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{index + 1}. {question.question}</h2>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                  {submitted ? (answers[question.id] === question.answer ? "Correct" : "Review") : "Pending"}
                </span>
              </div>
              <div className="grid gap-3">
                {question.options.map((option) => {
                  const selected = answers[question.id] === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSelect(question.id, option)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                        selected
                          ? "border-[#FF5DA2] bg-[#FF5DA2]/20 text-white"
                          : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/70">
              {submitted
                ? `You scored ${score} out of ${questions.length}.`
                : `Select answers and submit to see your score.`}
            </p>
            <button
              type="button"
              onClick={() => setSubmitted(true)}
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#5A22E6] transition hover:-translate-y-0.5"
            >
              {submitted ? "Retake Demo" : "Submit Demo"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
