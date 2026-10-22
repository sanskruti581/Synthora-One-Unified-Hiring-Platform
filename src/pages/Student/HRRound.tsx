import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Send } from "lucide-react";
import api from "../../services/api";

export default function HRRound() {
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<{ questions: string[] }>("/students/hr/questions")
      .then(({ data }) => setQuestions(data.questions))
      .catch((error) => setMessage(error.response?.data?.message || "Unable to load the HR round."));
  }, []);

  const submit = async () => {
    setBusy(true);
    setMessage("");
    try {
      await api.post("/students/hr/submit", { answers });
      setSubmitted(true);
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Unable to submit your HR answers.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="min-h-screen bg-synthora-radial px-5 py-10 text-slate-950 dark:bg-slate-950 dark:text-white">
    <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-7 shadow-xl dark:border-white/10 dark:bg-white/5 sm:p-10">
      <p className="text-sm font-extrabold uppercase tracking-widest text-sky-500">Synthora interview</p>
      <h1 className="mt-2 text-3xl font-black">HR Round</h1>
      <p className="mt-2 text-slate-500 dark:text-slate-300">Answer each question in your own words. Your answers are saved with your interview results.</p>
      {message && <p role="alert" className="mt-5 rounded-xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-600">{message}</p>}
      {submitted ? <div className="mt-8 rounded-2xl bg-emerald-500/10 p-6 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500"/><h2 className="mt-3 text-xl font-bold">HR round submitted</h2><button className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white dark:bg-white dark:text-slate-900" onClick={() => navigate("/student/dashboard")}>Return to dashboard</button></div> : <>
        <div className="mt-8 space-y-6">{questions.map((question, index) => <label key={question} className="block rounded-2xl border border-slate-200 p-5 dark:border-white/10"><span className="font-bold">{index + 1}. {question}</span><textarea required rows={4} value={answers[index] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [index]: event.target.value }))} className="mt-4 w-full rounded-xl border border-slate-300 bg-transparent p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-white/15" placeholder="Write your answer here" /></label>)}</div>
        <button disabled={busy || questions.length === 0} onClick={() => void submit()} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3 font-extrabold text-white disabled:opacity-50"><Send className="h-4 w-4"/>{busy ? "Submitting..." : "Submit HR Round"}</button>
      </>}
    </section>
  </main>;
}
