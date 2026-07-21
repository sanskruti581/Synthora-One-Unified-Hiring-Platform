import { Activity, Brain, Braces, Code2, GitFork, MessageSquare } from "lucide-react";

const assessmentTypes = [
  {
    label: "Aptitude Tests",
    icon: Brain,
    accent: "text-synthora-cyan",
    glow: "shadow-[0_14px_30px_rgba(0,163,255,.14)]",
  },
  {
    label: "Technical Interviews",
    icon: Code2,
    accent: "text-synthora-blue",
    glow: "shadow-[0_14px_30px_rgba(37,99,235,.14)]",
  },
  {
    label: "Coding Rounds",
    icon: Braces,
    accent: "text-synthora-cyan",
    glow: "shadow-[0_14px_30px_rgba(6,182,212,.14)]",
  },
  {
    label: "HR Conversations",
    icon: MessageSquare,
    accent: "text-synthora-blue",
    glow: "shadow-[0_14px_30px_rgba(37,99,235,.14)]",
  },
  {
    label: "Psychometric Tests",
    icon: Activity,
    accent: "text-synthora-amber",
    glow: "shadow-[0_14px_30px_rgba(245,158,11,.16)]",
  },
  {
    label: "System Design Exams",
    icon: GitFork,
    accent: "text-synthora-cyan",
    glow: "shadow-[0_14px_30px_rgba(0,163,255,.14)]",
  },
];

const marqueeItems = [...assessmentTypes, ...assessmentTypes];

export default function AssessmentMarquee() {
  return (
    <section className="w-full bg-synthora-surface py-8 text-synthora-text">
      <div className="mx-auto max-w-7xl px-6">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.22em] text-synthora-muted">
          Supported Assessment Types
        </p>

        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="flex w-max animate-marquee gap-4 will-change-transform hover:[animation-play-state:paused]">
            {marqueeItems.map(({ label, icon: Icon, accent, glow }, index) => (
              <div
                key={`${label}-${index}`}
                className={`flex animate-soft-bob items-center gap-3 rounded-xl border border-synthora-border bg-white px-5 py-4 ${glow} transition duration-300 hover:-translate-y-1 hover:border-synthora-cyan hover:bg-blue-50`}
                style={{ animationDelay: `${(index % assessmentTypes.length) * 120}ms` }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <Icon className={`h-5 w-5 ${accent}`} strokeWidth={2.2} />
                </span>
                <span className="whitespace-nowrap text-base font-bold tracking-tight text-synthora-text">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
