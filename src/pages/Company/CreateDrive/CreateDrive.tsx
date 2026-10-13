import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, FileText, Loader2, Sparkles, Timer, UploadCloud, X } from "lucide-react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import FormField from "../../../components/FormField";
import { createHiringDrive } from "../../../services/driveService";

const rounds = ["Aptitude", "Coding", "Technical Oral", "HR"];

const initialDrive = {
  driveName: "",
  jobRole: "",
  jobDescription: null as File | null,
  studentFile: null as File | null,
  examDate: "",
  examTime: "",
  examEndTime: "",
  durationMinutes: "",
  rounds: ["Aptitude", "Coding", "Technical Oral"],
  aptitudeCutoff: "",
  technicalOralCutoff: "60",
};

export default function CreateDrive() {
  const navigate = useNavigate();
  const [drive, setDrive] = useState(initialDrive);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdDrive, setCreatedDrive] = useState<{
    id: string;
    driveName: string;
    jobRole: string;
    studentsInvited: number;
  } | null>(null);

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
      const res = await createHiringDrive(drive);
      const created = res.data?.drive;
      setCreatedDrive({
        id: created?._id || "",
        driveName: created?.driveName || drive.driveName,
        jobRole: created?.jobRole || drive.jobRole,
        studentsInvited: res.data?.studentsInvited ?? 0,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const message = axios.isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
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
      {/* Prominent Success Modal */}
      {success && createdDrive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-emerald-500/30 bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-8 text-center">
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setCreatedDrive(null);
                setDrive(initialDrive);
              }}
              className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <CheckCircle2 className="h-10 w-10 animate-bounce" />
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" /> Confirmation
            </span>

            <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
              Hiring Drive Created Successfully!
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              The hiring drive has been created, and the configured invitation process has been initiated.
            </p>

            <div className="my-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Drive Details</p>
              <p className="mt-1 text-base font-extrabold text-slate-950 dark:text-white">{createdDrive.driveName}</p>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Job Role: <span className="font-bold text-sky-600 dark:text-sky-400">{createdDrive.jobRole}</span>
              </p>
              {createdDrive.studentsInvited > 0 ? (
                <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {createdDrive.studentsInvited} candidates processed & invitation links generated
                </p>
              ) : null}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {createdDrive.id ? (
                <button
                  type="button"
                  onClick={() => navigate(`/company/drives/${createdDrive.id}`)}
                  className="flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-extrabold text-white transition hover:bg-sky-500 shadow-lg shadow-sky-600/25"
                >
                  View Drive Details
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setSuccess(false);
                  setCreatedDrive(null);
                  setDrive(initialDrive);
                }}
                className="flex-1 inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-white/15 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
              >
                Create Another Drive
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 rounded-2xl border border-synthora-border bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] backdrop-blur sm:p-7">
        {/* Prominent Success Banner on Form */}
        {success && !createdDrive ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-extrabold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 shadow-sm">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-black text-base">Hiring Drive Created Successfully!</p>
              <p className="font-normal text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                The hiring drive has been created, and the configured invitation process has been initiated.
              </p>
            </div>
          </div>
        ) : null}

        {/* Prominent Error Alert */}
        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-extrabold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 shadow-sm">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-black">Drive Creation Failed</p>
              <p className="font-medium text-xs mt-0.5">{error}</p>
            </div>
            <button type="button" onClick={() => setError("")} className="text-rose-500 hover:text-rose-700">
              <X className="h-4 w-4" />
            </button>
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
          <FormField label="Start Window Time" type="time" value={drive.examTime} onChange={(event) => updateDrive("examTime", event.target.value)} icon={<Clock3 className="h-5 w-5" />} required />
          <FormField label="End Window Time" type="time" value={drive.examEndTime} onChange={(event) => updateDrive("examEndTime", event.target.value)} icon={<Clock3 className="h-5 w-5" />} required />
          <FormField label="Duration (Minutes)" type="number" min="1" value={drive.durationMinutes} onChange={(event) => updateDrive("durationMinutes", event.target.value)} icon={<Timer className="h-5 w-5" />} required />
          <FormField label="Aptitude Cutoff (%)" type="number" min="0" max="100" value={drive.aptitudeCutoff} onChange={(event) => updateDrive("aptitudeCutoff", event.target.value)} required />
          <FormField label="Technical Oral Cutoff (%)" type="number" min="0" max="100" value={drive.technicalOralCutoff} onChange={(event) => updateDrive("technicalOralCutoff", event.target.value)} required />
        </div>

        <fieldset className="rounded-xl border border-synthora-border bg-blue-50/60 p-4">
          <legend className="px-2 text-sm font-extrabold text-synthora-text">Interview Rounds</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
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
          className="h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-synthora-blue px-6 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(37,99,235,.24)] transition hover:-translate-y-0.5 hover:bg-synthora-blue-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Scheduling Hiring Drive...
            </>
          ) : (
            "Schedule Hiring Drive"
          )}
        </button>
      </form>
    </DashboardLayout>
  );
}
