import { AlertTriangle, Mic, ShieldCheck, Video, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

interface ProctoringGuardProps {
  isActive: boolean;
  isMicReady: boolean;
  isCameraReady: boolean;
  hasPermissionError: boolean;
  violationCount: number;
  warningMessage: string | null;
  children: ReactNode;
}

export function ProctoringGuard({
  isActive,
  isMicReady,
  isCameraReady,
  hasPermissionError,
  violationCount,
  warningMessage,
  children,
}: ProctoringGuardProps) {
  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-sky-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-sky-100 dark:border-sky-400/20 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          <span>Proctoring Active</span>
        </div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-sky-300">
          <span>{violationCount} warning{violationCount === 1 ? "" : "s"}</span>
        </div>
      </div>

      {(hasPermissionError || warningMessage) ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
          {hasPermissionError ? (
            <div className="flex items-start gap-2">
              <Mic className="mt-0.5 h-4 w-4" />
              <span>Microphone access is required before the assessment can continue.</span>
            </div>
          ) : null}
          {warningMessage ? (
            <div className="mt-2 flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <span>{warningMessage}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 sm:grid-cols-3">
        <div className="flex items-center gap-2">
          <Mic className={`h-4 w-4 ${isMicReady ? "text-emerald-500" : "text-slate-400"}`} />
          <span>{isMicReady ? "Microphone ready" : "Microphone pending"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Video className={`h-4 w-4 ${isCameraReady ? "text-emerald-500" : "text-slate-400"}`} />
          <span>{isCameraReady ? "Camera ready" : "Camera pending"}</span>
        </div>
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-slate-400" />
          <span>Tab switching monitored</span>
        </div>
      </div>

      {children}
    </div>
  );
}
