import { useEffect, useState, type ComponentType } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, Building2, CalendarDays, CheckCircle2, Clock3, Info, Lock, ShieldCheck, Timer } from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import { getStudentInvitation, startInvitationAssessment } from "../../services/authService";
import { useCountdown } from "../../hooks/useCountdown";

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
  canStartAssessment: boolean;
  examStartAt: string;
  examEndAt: string;
  examCountdownSeconds: number;
};

export default function ActivateInvitation() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const loginCountdown = useCountdown(details?.examStartAt || new Date().toISOString());

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
      navigate(response.data.redirectUrl || `/assessment/${response.data.driveId}`);
    } catch {
      setMessage("Unable to log in. Your invitation may have expired or the assessment window is closed.");
    } finally {
      setIsLoading(false);
    }
  };

  const canLoginNow = Boolean(details?.canLogin);
  const isClosed = details?.status === "Closed" || details?.status === "Completed";
  const examNotStartedYet = !details?.canStartAssessment && !isClosed;

  return (
    <AuthLayout
      eyebrow="Student invitation"
      title="Welcome to your assessment workspace."
      description="Review your verified recruitment drive details, examination schedule, and proctoring guidelines before entering."
    >
      <div className="grid gap-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified Candidate Access
          </span>
          <h2 className="mt-3 text-2xl font-extrabold text-slate-950 dark:text-white">
            {details ? `Welcome, ${details.studentName || "Candidate"}` : "Student Assessment Invitation"}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {details
              ? `You have been invited by ${details.companyName} for the ${details.jobRole} recruitment drive.`
              : "Validating your secure invitation token..."}
          </p>
        </div>

        {message ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            {message}
          </div>
        ) : null}

        {details ? (
          <div className="grid gap-5">
            {/* Candidate & Drive Highlight Card */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Candidate Email</p>
                  <p className="mt-0.5 text-sm font-extrabold text-slate-900 dark:text-white">{details.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Assessment Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isClosed
                      ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      : details.canStartAssessment
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {details.status || "Ready to Begin"}
                  </span>
                </div>
              </div>
            </div>

            {/* Assessment Details Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              <InviteDetailItem icon={Building2} label="Hiring Organization" value={details.companyName} />
              <InviteDetailItem icon={BriefcaseBusiness} label="Hiring Drive" value={details.driveName} />
              <InviteDetailItem icon={BriefcaseBusiness} label="Target Job Role" value={details.jobRole} />
              <InviteDetailItem icon={ShieldCheck} label="Initial Round" value={details.roundName || "Aptitude Assessment"} />
              <InviteDetailItem icon={CalendarDays} label="Exam Date" value={details.examDate} />
              <InviteDetailItem icon={Clock3} label="Scheduled Time" value={details.examTime} />
              <InviteDetailItem icon={Timer} label="Allocated Duration" value={`${details.durationMinutes} minutes`} />
              <InviteDetailItem icon={Clock3} label="Window Closes" value={formatTime(details.examEndAt)} />
            </div>

            {/* Instructions Box matching CompanyRegister terms styling */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <Info className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                Assessment Proctoring Guidelines
              </p>
              <ul className="mt-3 grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Stable internet connection required
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Webcam remains active during test
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Fullscreen mode is mandatory
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Tab switches & cut/copy are logged
                </li>
              </ul>
            </div>

            {/* Action Button matching CompanyRegister button style */}
            <button
              type="button"
              onClick={handleStartAssessment}
              disabled={isLoading || !canLoginNow || isClosed}
              className="inline-flex h-12 sm:h-14 items-center justify-center gap-2.5 rounded-xl bg-slate-950 px-6 text-sm font-extrabold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300"
            >
              {isLoading ? (
                "Entering assessment session..."
              ) : isClosed ? (
                <>
                  <Lock className="h-4 w-4" />
                  Assessment Window Closed
                </>
              ) : examNotStartedYet ? (
                <>
                  <span>Exam starts in {formatCountdown(loginCountdown)}</span>
                  <span className="text-xs opacity-80">(Enter Waiting Room)</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Enter Proctored Assessment</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>
    </AuthLayout>
  );
}

function formatTime(value: string) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
}

function InviteDetailItem({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <Icon className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function formatCountdown(value: { days: number; hours: number; minutes: number; seconds: number }) {
  if (value.days > 0) {
    return `${value.days}d ${value.hours}h ${value.minutes}m`;
  }
  return `${String(value.hours).padStart(2, "0")}:${String(value.minutes).padStart(2, "0")}:${String(value.seconds).padStart(2, "0")}`;
}
