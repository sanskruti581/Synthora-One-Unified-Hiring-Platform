import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, KeyRound, Mail, ShieldCheck } from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import { activateStudentInvitation } from "../../services/authService";

type ActivationDetails = {
  email: string;
  temporaryPassword: string;
  driveName: string;
  companyName: string;
  examDate: string;
  examTime: string;
};

export default function ActivateInvitation() {
  const { token = "" } = useParams();
  const [details, setDetails] = useState<ActivationDetails | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleActivate = async () => {
    setMessage("");
    setIsLoading(true);

    try {
      const response = await activateStudentInvitation(token);
      setDetails(response.data);
    } catch {
      setMessage("This invitation is not open yet, expired, or invalid. It opens 10 minutes before the exam starts.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Student invitation"
      title="Activate your assessment login."
      description="Your company invitation link unlocks only near the scheduled exam time. After activation, use the allocated email and password to login."
    >
      <div className="grid gap-5">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">Student Activation</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Click activate when your assessment window is close.</p>
        </div>

        {details ? (
          <div className="grid gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
            <p className="flex items-center gap-2 text-sm font-extrabold text-emerald-700 dark:text-emerald-200">
              <CheckCircle2 className="h-5 w-5" />
              Invitation activated successfully
            </p>
            <Credential icon={Mail} label="Email" value={details.email} />
            <Credential icon={KeyRound} label="Password" value={details.temporaryPassword} />
            <p className="text-sm text-slate-700 dark:text-slate-200">
              {details.companyName} - {details.driveName}, {details.examDate} at {details.examTime}
            </p>
            <Link to="/login" className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-extrabold text-white dark:bg-sky-400 dark:text-slate-950">
              Go to Login
            </Link>
          </div>
        ) : (
          <>
            {message ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 dark:bg-rose-500/10">{message}</p> : null}
            <button
              type="button"
              onClick={handleActivate}
              disabled={isLoading}
              className="h-12 rounded-xl bg-slate-950 px-5 text-sm font-extrabold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-sky-400 dark:text-slate-950"
            >
              {isLoading ? "Activating..." : "Activate Invitation"}
            </button>
          </>
        )}
      </div>
    </AuthLayout>
  );
}

function Credential({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 dark:bg-white/10">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
