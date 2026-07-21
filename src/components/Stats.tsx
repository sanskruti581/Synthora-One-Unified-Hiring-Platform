import { motion } from "framer-motion";

const problemItems = [
  {
    metric: "8 seconds:",
    text: "Average time spent reading a resume.",
  },
  {
    metric: "65%:",
    text: "Sourcing calls scheduled but never answered (candidate ghosting).",
  },
  {
    metric: "40+ hours:",
    text: "Average screening time spent per role per recruiter.",
  },
  {
    metric: "3 months:",
    text: 'The standard "time to hire" cycle.',
  },
  {
    metric: "Inconsistent:",
    text: "Standard interview questions result in biased decisions.",
  },
];

const solutionItems = [
  {
    metric: "100%:",
    text: "Transparency—every candidate gets evaluated consistently.",
  },
  {
    metric: "24/7:",
    text: "Immediate scheduling and interviewing availability.",
  },
  {
    metric: "50+:",
    text: "Detailed signals generated on every candidate profile instantly.",
  },
  {
    metric: "11 days:",
    text: "Average time to shortlist your ideal candidates.",
  },
  {
    metric: "98.6%:",
    text: "Validated evaluation accuracy for objective decision making.",
  },
];

export default function Stats() {
  return (
    <section className="relative z-20 bg-gradient-to-b from-[#F8FAFC] to-[#FFFFFF] px-5 py-20 sm:px-8 lg:px-16 xl:px-[140px]">
      <div className="mx-auto max-w-[1440px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="text-balance text-4xl font-black leading-[1.08] tracking-normal text-[#0F172A] sm:text-5xl lg:text-[56px]">
            Traditional Hiring is <span className="text-[#EF4444]">broken by design.</span>
          </h2>
          <p className="mt-4 text-2xl font-bold leading-tight text-[#2563EB] sm:text-3xl">
            We empower your team to break out of it.
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#475569] sm:text-lg">
            Recruiters work harder and get slower results. Here is why—and exactly what changes when Synthora's AI
            agents are reinforcing your corner.
          </p>
        </motion.div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          <motion.article
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55 }}
            className="rounded-2xl border border-[#FEE2E2] bg-[#FFF5F5] p-6 shadow-[0_18px_45px_rgba(15,23,42,.06)] sm:p-8"
          >
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#FEE2E2] text-xl text-[#EF4444]">
                ❌
              </span>
              <h3 className="text-2xl font-black leading-tight text-[#0F172A] sm:text-3xl">
                The Old Screening Problem
              </h3>
            </div>

            <div className="mt-8 space-y-4">
              {problemItems.map(({ metric, text }) => (
                <div key={metric} className="flex items-start gap-3">
                  <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#FEE2E2] text-xs leading-none text-[#EF4444]">
                    ❌
                  </span>
                  <p className="text-base leading-7 text-[#475569]">
                    <strong className="font-bold text-[#0F172A]">{metric}</strong> {text}
                  </p>
                </div>
              ))}
            </div>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="rounded-2xl border border-[#D1FAE5] bg-[#F0FDF4] p-6 shadow-[0_18px_45px_rgba(15,23,42,.06)] sm:p-8"
          >
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#D1FAE5] text-xl text-[#10B981]">
                ✅
              </span>
              <h3 className="text-2xl font-black leading-tight text-[#0F172A] sm:text-3xl">With Synthora</h3>
            </div>

            <div className="mt-8 space-y-4">
              {solutionItems.map(({ metric, text }) => (
                <div key={metric} className="flex items-start gap-3">
                  <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#D1FAE5] text-xs leading-none text-[#10B981]">
                    ✅
                  </span>
                  <p className="text-base leading-7 text-[#475569]">
                    <strong className="font-bold text-[#0F172A]">{metric}</strong> {text}
                  </p>
                </div>
              ))}
            </div>
          </motion.article>
        </div>
      </div>
    </section>
  );
}
