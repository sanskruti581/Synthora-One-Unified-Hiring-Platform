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
    <section id="features" className="px-5 pb-24 sm:px-8 lg:px-16 xl:px-[140px]">
      <div className="mx-auto max-w-[1440px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-sm font-extrabold uppercase tracking-[.16em] text-[#FF9FC2]">Features</p>
          <h2 className="mt-4 text-balance text-4xl font-black leading-[1.06] tracking-normal text-white sm:text-5xl lg:text-[56px]">
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
              className="group min-h-[248px] rounded-[28px] border border-white/15 bg-white/[.08] p-6 shadow-glass backdrop-blur-2xl transition hover:border-[#FF5DA2]/45 hover:shadow-[0_28px_70px_rgba(255,93,162,.22)]"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-[#5A22E6] shadow-[0_18px_42px_rgba(255,255,255,.18)] transition group-hover:scale-105">
                <Icon className="h-7 w-7" />
              </div>
              <h3 className="mt-6 text-xl font-bold leading-tight text-white">{title}</h3>
              <p className="mt-3 text-sm font-light leading-7 text-white/70">{description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
