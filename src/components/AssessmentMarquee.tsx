import { Activity, Brain, Braces, Code2, GitFork, MessageSquare } from "lucide-react";

const assessmentTypes = [
  {
    label: "Aptitude Tests",
    icon: Brain,
    accent: "text-cyan-300",
    glow: "shadow-cyan-500/20",
  },
  {
    label: "Technical Interviews",
    icon: Code2,
    accent: "text-blue-400",
    glow: "shadow-blue-500/20",
  },
  {
    label: "Coding Rounds",
    icon: Braces,
    accent: "text-emerald-300",
    glow: "shadow-emerald-500/20",
  },
  {
    label: "HR Conversations",
    icon: MessageSquare,
    accent: "text-rose-300",
    glow: "shadow-rose-500/20",
  },
  {
    label: "Psychometric Tests",
    icon: Activity,
    accent: "text-amber-300",
    glow: "shadow-amber-500/20",
  },
  {
    label: "System Design Exams",
    icon: GitFork,
    accent: "text-violet-300",
    glow: "shadow-violet-500/20",
  },
];

const marqueeItems = [...assessmentTypes, ...assessmentTypes];

export default function AssessmentMarquee() {
  return (
    <section className="w-full bg-[#121212] py-8 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
          Supported Assessment Types
        </p>

        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="flex w-max animate-marquee gap-4 will-change-transform hover:[animation-play-state:paused]">
            {marqueeItems.map(({ label, icon: Icon, accent, glow }, index) => (
              <div
                key={`${label}-${index}`}
                className={`flex animate-soft-bob items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 shadow-lg ${glow} backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.1]`}
                style={{ animationDelay: `${(index % assessmentTypes.length) * 120}ms` }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.08]">
                  <Icon className={`h-5 w-5 ${accent}`} strokeWidth={2.2} />
                </span>
                <span className="whitespace-nowrap text-base font-bold tracking-tight text-zinc-100">
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
