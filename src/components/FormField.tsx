import type { InputHTMLAttributes, ReactNode } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helper?: string;
  icon?: ReactNode;
};

export default function FormField({ label, helper, icon, className = "", ...props }: FormFieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-synthora-text">{label}</span>
      <span className="relative">
        {icon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-synthora-cyan">{icon}</span> : null}
        <input
          {...props}
          className={`h-12 w-full rounded-xl border border-synthora-border bg-white px-4 text-sm text-synthora-text shadow-sm outline-none transition placeholder:text-slate-400 focus:border-synthora-cyan focus:ring-4 focus:ring-sky-100 ${icon ? "pl-11" : ""} ${className}`}
        />
      </span>
      {helper ? <span className="text-xs text-synthora-muted">{helper}</span> : null}
    </label>
  );
}
