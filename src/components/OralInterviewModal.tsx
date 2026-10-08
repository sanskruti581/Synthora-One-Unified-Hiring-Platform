import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MessageSquare, Sparkles, X } from "lucide-react";
import { getRecruiterOralDetails, type OralInterviewSession } from "../services/oralInterviewService";

interface OralInterviewModalProps {
  driveId: string;
  studentId: string;
  studentName: string;
  onClose: () => void;
}

export default function OralInterviewModal({
  driveId,
  studentId,
  studentName,
  onClose,
}: OralInterviewModalProps) {
  const [interview, setInterview] = useState<OralInterviewSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const metricAverages = useMemo(() => {
    const questions = interview?.questions ?? [];
    const average = (key: "technicalAccuracy" | "conceptualKnowledge" | "communicationSkill" | "completeness" | "relevance") => {
      const values = questions.map((question) => question[key]).filter((value): value is number => typeof value === "number");
      return values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : null;
    };

    return {
      technicalAccuracy: interview?.technicalAccuracyAvg ?? average("technicalAccuracy"),
      conceptualKnowledge: interview?.conceptualKnowledgeAvg ?? average("conceptualKnowledge"),
      communicationSkill: interview?.communicationSkillAvg ?? average("communicationSkill"),
      completeness: interview?.completenessAvg ?? average("completeness"),
      relevance: interview?.relevanceAvg ?? average("relevance"),
    };
  }, [interview]);

  useEffect(() => {
    setIsLoading(true);
    getRecruiterOralDetails(driveId, studentId)
      .then((res) => {
        setInterview(res.data.interview);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load oral interview details.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [driveId, studentId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-2xl dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-sky-600 dark:text-sky-400">
              Technical Oral Viva Transcript
            </span>
            <h2 className="text-2xl font-black">{studentName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            <p className="text-sm font-bold text-slate-400">Loading candidate interview transcript...</p>
          </div>
        ) : error ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center text-center p-6">
            <p className="text-sm font-bold text-rose-500">{error}</p>
          </div>
        ) : !interview ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center text-center p-6">
            <p className="text-sm text-slate-400">No interview data available.</p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-6">
            {/* Scorecard Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-sky-50 dark:bg-sky-500/10 p-4 border border-sky-200 dark:border-sky-500/20">
                <p className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase">Overall Score</p>
                <p className="mt-1 text-2xl font-black text-sky-700 dark:text-sky-300">
                  {interview.overallScore ?? "-"}<span className="text-sm text-slate-400 font-bold">/100</span>
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-4 border border-slate-200 dark:border-white/10">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Technical Accuracy</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                  {metricAverages.technicalAccuracy ?? "-"}<span className="text-sm text-slate-400 font-bold">/10</span>
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-4 border border-slate-200 dark:border-white/10">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Conceptual Depth</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                  {metricAverages.conceptualKnowledge ?? "-"}<span className="text-sm text-slate-400 font-bold">/10</span>
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-4 border border-slate-200 dark:border-white/10">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Communication</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                  {metricAverages.communicationSkill ?? "-"}<span className="text-sm text-slate-400 font-bold">/10</span>
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-4 border border-slate-200 dark:border-white/10">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Completeness</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                  {metricAverages.completeness ?? "-"}<span className="text-sm text-slate-400 font-bold">/10</span>
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-4 border border-slate-200 dark:border-white/10">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Relevance</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                  {metricAverages.relevance ?? "-"}<span className="text-sm text-slate-400 font-bold">/10</span>
                </p>
              </div>
            </div>

            {/* Overall AI Feedback */}
            {interview.overallFeedback ? (
              <div className="rounded-2xl border border-sky-400/30 bg-sky-500/5 p-4 text-xs">
                <span className="font-extrabold uppercase text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Executive AI Evaluation Summary
                </span>
                <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {interview.overallFeedback}
                </p>
              </div>
            ) : null}

            {/* Question by Question Breakdown */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Viva Turns & Spoken Transcripts ({interview.questions?.length || 0} Questions)
              </h3>

              {interview.questions?.map((q, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-5"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-2.5">
                    <span className="text-xs font-black uppercase text-sky-600 dark:text-sky-400">
                      Turn {q.questionNumber} • {q.category}
                    </span>
                    <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-extrabold text-sky-600 dark:text-sky-400">
                      Score: {q.score ?? 0}/10
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-extrabold text-slate-900 dark:text-white">
                    Q: {q.question}
                  </p>

                  <div className="mt-3 rounded-xl bg-white dark:bg-slate-950/60 p-3 border border-slate-200/60 dark:border-white/5">
                    <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 text-sky-500" />
                      Candidate's Spoken Answer:
                    </p>
                    <p className="mt-1 text-sm text-slate-800 dark:text-slate-200 font-medium italic">
                      "{q.spokenAnswer || "(No spoken answer recorded)"}"
                    </p>
                  </div>

                  {q.feedback ? (
                    <div className="mt-3 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                      <span><strong>AI Feedback:</strong> {q.feedback}</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end border-t border-slate-100 dark:border-white/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-extrabold text-white dark:bg-white dark:text-slate-950 transition hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
