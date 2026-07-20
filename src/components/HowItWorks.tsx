import { BrainCircuit, FileText, ListChecks, Upload, UsersRound } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Upload Candidates",
    description: "Import resumes, profiles, and candidate lists for a new hiring drive.",
    icon: Upload,
  },
  {
    number: "02",
    title: "Upload JD",
    description: "Add role requirements so Synthora.AI can tune skills and evaluation criteria.",
    icon: FileText,
  },
  {
    number: "03",
    title: "AI Conducts Interviews",
    description: "Automated agents run structured aptitude, technical, coding, and HR rounds.",
    icon: BrainCircuit,
  },
  {
    number: "04",
    title: "Evaluation & Ranking",
    description: "Each candidate is scored consistently and ranked against role-fit signals.",
    icon: ListChecks,
  },
  {
    number: "05",
    title: "Download Final Report",
    description: "Export a clear shortlist with scorecards, insights, and hiring recommendations.",
    icon: UsersRound,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white px-5 pb-24 sm:px-8 lg:px-16 xl:px-[140px]">
      <div className="mx-auto max-w-[1440px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <p className="text-sm font-extrabold uppercase tracking-[.18em] text-[#0EA5E9]">How it works</p>
          <h2 className="mt-4 text-balance text-4xl font-black leading-[1.08] tracking-normal text-[#0F172A] sm:text-5xl lg:text-[56px]">
            Simple Steps. Smarter Hiring.
          </h2>
        </motion.div>

        <div className="mt-12 grid gap-6 lg:grid-cols-5">
          {steps.map(({ number, title, description, icon: Icon }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55, delay: index * 0.06 }}
              className="relative min-h-[240px] rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,.04)]"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-2xl font-black text-[#0F172A]">{number}</span>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-[#0EA5E9]">
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <h3 className="mt-8 text-xl font-bold leading-tight text-[#0F172A]">{title}</h3>
              <p className="mt-3 text-sm font-normal leading-7 text-[#475569]">{description}</p>
              {index < steps.length - 1 ? (
                <span className="absolute -right-5 top-1/2 hidden -translate-y-1/2 text-2xl font-semibold leading-none text-slate-300 lg:block">
                  {"->"}
                </span>
              ) : null}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
