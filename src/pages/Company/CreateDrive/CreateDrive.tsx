import { FormEvent, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, FileText, Timer, UploadCloud } from "lucide-react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import FormField from "../../../components/FormField";
import { createHiringDrive } from "../../../services/driveService";

const rounds = ["Aptitude", "Coding", "HR Interview"];

const initialDrive = {
  driveName: "",
  jobRole: "",
  jobDescription: null as File | null,
  studentFile: null as File | null,
  examDate: "",
  examTime: "",
  durationMinutes: "",
  rounds: ["Aptitude", "Coding", "HR Interview"],
  aptitudeCutoff: "",
  lastRegistrationDate: "",
};

export default function CreateDrive() {
  const [drive, setDrive] = useState(initialDrive);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateDrive = <TKey extends keyof typeof drive>(field: TKey, value: (typeof drive)[TKey]) => {
    setDrive((current) => ({ ...current, [field]: value }));
  };

  const toggleRound = (round: string) => {
    setDrive((current) => ({
      ...current,
      rounds: current.rounds.includes(round) ? current.rounds.filter((item) => item !== round) : [...current.rounds, round],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(false);
    setError("");

    try {
      setIsSubmitting(true);
      await createHiringDrive(drive);
      setSuccess(true);
    } catch {
      setError("Could not schedule the drive. Please login as a company and make sure the backend is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="Create Hiring Drive"
      subtitle="Upload role documents, student sheets, schedule details, and interview rounds for a new company drive."
    >
      <form onSubmit={handleSubmit} className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/10 sm:p-6">
        {success ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
            <CheckCircle2 className="h-5 w-5" />
            Hiring Drive Created Successfully
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-extrabold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <FormField label="Drive Name" value={drive.driveName} onChange={(event) => updateDrive("driveName", event.target.value)} placeholder="Campus Hiring 2026" required />
          <FormField label="Job Role" value={drive.jobRole} onChange={(event) => updateDrive("jobRole", event.target.value)} placeholder="MERN Stack Developer" required />

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Job Description Upload (PDF/DOCX)</span>
            <span className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-sky-400 dark:border-white/15 dark:bg-white/5">
              <UploadCloud className="h-7 w-7 text-sky-500" />
              <span className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">{drive.jobDescription?.name ?? "Upload job description"}</span>
              <input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(event) => updateDrive("jobDescription", event.target.files?.[0] ?? null)} required />
            </span>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Student Excel Upload (.xlsx or .csv)</span>
            <span className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-sky-400 dark:border-white/15 dark:bg-white/5">
              <FileText className="h-7 w-7 text-violet-500" />
              <span className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">{drive.studentFile?.name ?? "Upload student sheet"}</span>
              <input type="file" accept=".xlsx,.csv" className="sr-only" onChange={(event) => updateDrive("studentFile", event.target.files?.[0] ?? null)} required />
            </span>
          </label>

          <FormField label="Exam Date" type="date" value={drive.examDate} onChange={(event) => updateDrive("examDate", event.target.value)} icon={<CalendarDays className="h-5 w-5" />} required />
          <FormField label="Exam Time" type="time" value={drive.examTime} onChange={(event) => updateDrive("examTime", event.target.value)} icon={<Clock3 className="h-5 w-5" />} required />
          <FormField label="Duration (Minutes)" type="number" min="1" value={drive.durationMinutes} onChange={(event) => updateDrive("durationMinutes", event.target.value)} icon={<Timer className="h-5 w-5" />} required />
          <FormField label="Aptitude Cutoff" type="number" min="0" max="100" value={drive.aptitudeCutoff} onChange={(event) => updateDrive("aptitudeCutoff", event.target.value)} required />
          <FormField label="Last Registration Date" type="date" value={drive.lastRegistrationDate} onChange={(event) => updateDrive("lastRegistrationDate", event.target.value)} className="lg:col-span-2" required />
        </div>

        <fieldset className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
          <legend className="px-2 text-sm font-extrabold text-slate-800 dark:text-white">Interview Rounds</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {rounds.map((round) => (
              <label key={round} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                <input type="checkbox" checked={drive.rounds.includes(round)} onChange={() => toggleRound(round)} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                {round}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 rounded-xl bg-slate-950 px-5 text-sm font-extrabold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300"
        >
          {isSubmitting ? "Scheduling..." : "Schedule Hiring Drive"}
        </button>
      </form>
    </DashboardLayout>
  );
}
