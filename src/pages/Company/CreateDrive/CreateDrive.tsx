import { FormEvent, useState } from "react";
import axios from "axios";
import { CalendarDays, CheckCircle2, Clock3, FileText, Timer, UploadCloud } from "lucide-react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import FormField from "../../../components/FormField";
import { createHiringDrive } from "../../../services/driveService";

const rounds = ["Aptitude", "Coding", "HR"];

const initialDrive = {
  driveName: "",
  jobRole: "",
  jobDescription: null as File | null,
  studentFile: null as File | null,
  examDate: "",
  examTime: "",
  durationMinutes: "",
  rounds: ["Aptitude", "Coding", "HR"],
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
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : "";

      setError(message || "Could not schedule the drive. Please login as a company and make sure the backend is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="Create Hiring Drive"
      subtitle="Upload role documents, student sheets, schedule details, and interview rounds for a new company drive."
    >
      <form onSubmit={handleSubmit} className="grid gap-6 rounded-xl border border-synthora-border bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] backdrop-blur sm:p-6">
        {success ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            Hiring Drive Created Successfully
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-extrabold text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <FormField label="Drive Name" value={drive.driveName} onChange={(event) => updateDrive("driveName", event.target.value)} placeholder="Campus Hiring 2026" required />
          <FormField label="Job Role" value={drive.jobRole} onChange={(event) => updateDrive("jobRole", event.target.value)} placeholder="MERN Stack Developer" required />

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-synthora-text">Job Description Upload (PDF/DOCX)</span>
            <span className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-synthora-border bg-blue-50/60 px-4 py-5 text-center transition hover:border-synthora-cyan hover:bg-blue-50">
              <UploadCloud className="h-7 w-7 text-synthora-cyan" />
              <span className="mt-2 text-sm font-bold text-synthora-text">{drive.jobDescription?.name ?? "Upload job description"}</span>
              <input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(event) => updateDrive("jobDescription", event.target.files?.[0] ?? null)} required />
            </span>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-synthora-text">Student Excel Upload (.xlsx or .csv)</span>
            <span className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-synthora-border bg-blue-50/60 px-4 py-5 text-center transition hover:border-synthora-cyan hover:bg-blue-50">
              <FileText className="h-7 w-7 text-synthora-blue" />
              <span className="mt-2 text-sm font-bold text-synthora-text">{drive.studentFile?.name ?? "Upload student sheet"}</span>
              <input type="file" accept=".xlsx,.csv" className="sr-only" onChange={(event) => updateDrive("studentFile", event.target.files?.[0] ?? null)} required />
            </span>
          </label>

          <FormField label="Exam Date" type="date" value={drive.examDate} onChange={(event) => updateDrive("examDate", event.target.value)} icon={<CalendarDays className="h-5 w-5" />} required />
          <FormField label="Exam Time" type="time" value={drive.examTime} onChange={(event) => updateDrive("examTime", event.target.value)} icon={<Clock3 className="h-5 w-5" />} required />
          <FormField label="Duration (Minutes)" type="number" min="1" value={drive.durationMinutes} onChange={(event) => updateDrive("durationMinutes", event.target.value)} icon={<Timer className="h-5 w-5" />} required />
          <FormField label="Aptitude Cutoff" type="number" min="0" max="100" value={drive.aptitudeCutoff} onChange={(event) => updateDrive("aptitudeCutoff", event.target.value)} required />
          <FormField label="Last Registration Date" type="date" value={drive.lastRegistrationDate} onChange={(event) => updateDrive("lastRegistrationDate", event.target.value)} className="lg:col-span-2" required />
        </div>

        <fieldset className="rounded-xl border border-synthora-border bg-blue-50/60 p-4">
          <legend className="px-2 text-sm font-extrabold text-synthora-text">Interview Rounds</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {rounds.map((round) => (
              <label key={round} className="flex items-center gap-3 rounded-xl border border-synthora-border bg-white p-4 text-sm font-bold text-synthora-text transition hover:border-synthora-cyan">
                <input type="checkbox" checked={drive.rounds.includes(round)} onChange={() => toggleRound(round)} className="h-4 w-4 rounded border-synthora-border text-synthora-blue focus:ring-synthora-blue" />
                {round}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 rounded-xl bg-synthora-blue px-5 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(37,99,235,.24)] transition hover:-translate-y-0.5 hover:bg-synthora-blue-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Scheduling..." : "Schedule Hiring Drive"}
        </button>
      </form>
    </DashboardLayout>
  );
}
