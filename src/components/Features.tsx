import { BarChart3, Bot, Clock3, LockKeyhole, Workflow } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    title: "AI Interviews",
    description: "Run aptitude, technical, coding, and HR conversations with adaptive AI interview agents.",
    icon: Bot,
  },
  {
    title: "End-to-End Automation",
    description: "Move candidates from upload to final shortlist without repetitive coordination work.",
    icon: Workflow,
  },
  {
    title: "Advanced Analytics",
    description: "Compare skills, communication, confidence, and role fit with clear recruiter-ready insights.",
    icon: BarChart3,
  },
  {
    title: "Enterprise Security",
    description: "Protect candidate data with professional-grade access patterns and reliable workflows.",
    icon: LockKeyhole,
  },
  {
    title: "Save Time & Cost",
    description: "Scale hiring drives while reducing screening hours and avoidable interviewer fatigue.",
    icon: Clock3,
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-white px-5 pb-24 sm:px-8 lg:px-16 xl:px-[140px]">
      <div className="mx-auto max-w-[1440px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-sm font-extrabold uppercase tracking-[.18em] text-[#DB2777]">Features</p>
          <h2 className="mt-4 text-balance text-4xl font-black leading-[1.08] tracking-normal text-[#0F172A] sm:text-5xl lg:text-[56px]">
            Built for faster decisions and stronger hiring signals.
          </h2>
        </motion.div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {features.map(({ title, description, icon: Icon }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55, delay: index * 0.06 }}
              whileHover={{ y: -10 }}
              className="group min-h-[270px] rounded-[24px] border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,.06)] xl:p-8"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-[#7C3AED] transition group-hover:scale-105">
                <Icon className="h-7 w-7" />
              </div>
              <h3 className="mt-7 text-xl font-bold leading-tight text-[#0F172A]">{title}</h3>
              <p className="mt-3 text-sm font-normal leading-7 text-[#475569]">{description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
