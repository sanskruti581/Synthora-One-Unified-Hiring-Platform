import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, Building2, CalendarDays, Clock3, ShieldCheck, Timer } from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import { getStudentInvitation, startInvitationAssessment } from "../../services/authService";
import { useCountdown } from "../../hooks/useCountdown";
import logo from "../../../images/logo.png";

type InvitationDetails = {
  driveId: string;
  studentName: string;
  email: string;
  driveName: string;
  companyName: string;
  jobRole: string;
  examDate: string;
  examTime: string;
  durationMinutes: number;
  status: string;
  roundName: string;
  canLogin: boolean;
  loginWindowOpenAt: string;
  examStartAt: string;
  loginCountdownSeconds: number;
};

export default function ActivateInvitation() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const loginCountdown = useCountdown(details?.loginWindowOpenAt || new Date().toISOString());

  useEffect(() => {
    getStudentInvitation(token)
      .then((response) => {
        setDetails(response.data);
      })
      .catch(() => setMessage("This invitation link is invalid or expired."));
  }, [token]);

  const handleStartAssessment = async () => {
    setMessage("");
    setIsLoading(true);

    try {
      const response = await startInvitationAssessment(token);
      window.localStorage.setItem("synthora-token", response.data.token);
      navigate(`/assessment/${response.data.driveId}`);
    } catch (error) {
      setMessage("The assessment login window has not opened yet.");
    } finally {
      setIsLoading(false);
    }
  };

  const canLoginNow = useMemo(() => {
    if (!details) {
      return false;
    }

    return loginCountdown.days === 0 && loginCountdown.hours === 0 && loginCountdown.minutes === 0 && loginCountdown.seconds === 0;
  }, [details, loginCountdown]);

  return (
    <AuthLayout
      eyebrow="Student invitation"
      title="Ready to begin your assessment."
      description="Review your invitation details and join the assigned hiring drive from your unique invitation link."
    >
      <div className="grid gap-5">
        <div className="flex items-center gap-3">
          <img src={logo} alt="" className="h-12 w-12 rounded-xl bg-white p-1 shadow-sm" />
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-300">Invitation page</p>
            <p className="truncate text-sm font-semibold text-slate-500 dark:text-slate-400">{details?.companyName || "Loading company..."}</p>
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">Student Invitation Page</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {details
              ? `Welcome ${details.studentName || "Student"}. You have been invited by ${details.companyName} to participate in the ${details.jobRole} Hiring Drive.`
              : "Loading invitation details..."}
          </p>
        </div>

        {message ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 dark:bg-rose-500/10">{message}</p> : null}

        {details ? (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <InviteTile icon={Building2} label="Company Name" value={details.companyName} />
              <InviteTile icon={BriefcaseBusiness} label="Drive Name" value={details.driveName} />
              <InviteTile icon={BriefcaseBusiness} label="Job Role" value={details.jobRole} />
              <InviteTile icon={ShieldCheck} label="Round Name" value={details.roundName || "Aptitude Assessment"} />
              <InviteTile icon={CalendarDays} label="Exam Date" value={details.examDate} />
              <InviteTile icon={Clock3} label="Exam Time" value={details.examTime} />
              <InviteTile icon={Timer} label="Duration" value={`${details.durationMinutes} minutes`} />
              <InviteTile icon={ShieldCheck} label="Status" value={details.status || "Ready to Begin"} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">Instructions</p>
              <ul className="mt-3 space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <li>Stable Internet Connection</li>
                <li>Camera should remain ON (future feature)</li>
                <li>Do not refresh page</li>
                <li>Timer cannot be paused</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">Welcome</p>
              <p className="mt-1 text-lg font-extrabold text-slate-950 dark:text-white">{details.studentName || "Student"}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Welcome {details.studentName || "Student"}. You have been invited by {details.companyName} to participate in the {details.jobRole} Hiring Drive.
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartAssessment}
              disabled={isLoading || !canLoginNow || details.status === "Completed"}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-extrabold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-sky-400 dark:text-slate-950"
            >
              {isLoading ? "Starting..." : canLoginNow ? "Start Assessment" : `Assessment Starts In ${formatCountdown(loginCountdown)}`}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        ) : null}
      </div>
    </AuthLayout>
  );
}

function InviteTile({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/10">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function formatCountdown(value: { days: number; hours: number; minutes: number; seconds: number }) {
  if (value.days > 0) {
    return `${String(value.days).padStart(2, "0")}:${String(value.hours).padStart(2, "0")}:${String(value.minutes).padStart(2, "0")}`;
  }

  return `${String(value.hours).padStart(2, "0")}:${String(value.minutes).padStart(2, "0")}:${String(value.seconds).padStart(2, "0")}`;
}
