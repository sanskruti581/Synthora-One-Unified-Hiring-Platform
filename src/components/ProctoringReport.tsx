import type { ReactNode } from "react";

interface ProctoringReportProps {
  title?: string;
  violations: Array<{ id: number; type: string; message: string; timestamp: string }>;
  children?: ReactNode;
}

export function ProctoringReport({ title = "Proctoring report", violations, children }: ProctoringReportProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-slate-950 dark:text-white">{title}</h3>
        <span className="text-xs font-bold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-300">
          {violations.length} event{violations.length === 1 ? "" : "s"}
        </span>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
      <ul className="mt-3 space-y-2">
        {violations.length === 0 ? (
          <li className="rounded-xl bg-white/70 px-3 py-2 text-sm dark:bg-white/10">No violations recorded yet.</li>
        ) : null}
        {violations.map((violation) => (
          <li key={violation.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-900/60">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{violation.type}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(violation.timestamp).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{violation.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
