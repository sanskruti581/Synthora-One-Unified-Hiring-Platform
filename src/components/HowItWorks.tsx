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
    <section id="how-it-works" className="px-5 pb-24 sm:px-8 lg:px-16 xl:px-[140px]">
      <div className="mx-auto max-w-[1440px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <p className="text-sm font-extrabold uppercase tracking-[.16em] text-[#FF9FC2]">How it works</p>
          <h2 className="mt-4 text-balance text-4xl font-black leading-[1.06] tracking-normal text-white sm:text-5xl lg:text-[56px]">
            Simple Steps. Smarter Hiring.
          </h2>
        </motion.div>

        <div className="mt-12 grid gap-5 lg:grid-cols-5">
          {steps.map(({ number, title, description, icon: Icon }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55, delay: index * 0.06 }}
              className="relative min-h-[230px] rounded-[28px] border border-white/15 bg-white/[.08] p-6 shadow-glass backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-2xl font-black text-white/35">{number}</span>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#5A22E6]">
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <h3 className="mt-8 text-xl font-bold leading-tight text-white">{title}</h3>
              <p className="mt-3 text-sm font-light leading-7 text-white/70">{description}</p>
              {index < steps.length - 1 ? (
                <span className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 rounded-full border border-white/15 bg-white/10 text-center text-white/80 backdrop-blur lg:block">
                  →
                </span>
              ) : null}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
