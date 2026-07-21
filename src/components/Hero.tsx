import { CalendarCheck } from "lucide-react";
import { motion } from "framer-motion";
import dashboardGirl from "../../images/Dashboard_girl2.png";
78
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

function HeroDashboardImage() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 28 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      className="relative w-full overflow-hidden rounded-2xl shadow-xl aspect-[4/3] md:aspect-square lg:aspect-[4/3]"
    >
      <img
        src={dashboardGirl}
        alt="Professional woman working at a desk with analytics dashboard on a laptop"
        className="h-full w-full object-cover"
        loading="eager"
      />
    </motion.div>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-transparent py-20 md:py-28" id="solutions">
      <div className="pointer-events-none absolute -right-28 top-16 h-72 w-72 rounded-full bg-synthora-cyan/15 blur-3xl" />
      <div className="pointer-events-none absolute left-8 top-24 h-52 w-52 rounded-full bg-synthora-blue/10 blur-3xl" />
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2 lg:gap-16">
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.1 }}
          className="flex flex-col justify-center"
        >
          <motion.div
            variants={fadeUp}
            className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-synthora-border bg-white px-4 py-2.5 text-xs font-extrabold uppercase text-synthora-cyan shadow-[0_12px_30px_rgba(0,163,255,.10)]"
          >
            <CalendarCheck className="h-4 w-4" />
            AI-Powered Recruitment Platform
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mb-6 text-4xl font-extrabold leading-[1.15] tracking-tight text-synthora-text md:text-5xl lg:text-6xl"
          >
            <span className="block">Hire Smarter.</span>
            <span className="block text-synthora-blue">Interview Faster.</span>
            <span className="block">Choose With Confidence.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mb-8 max-w-xl text-lg leading-relaxed text-synthora-muted">
            Synthora.AI streamlines aptitude tests, technical interviews, coding rounds, and HR conversations so teams
            can identify stronger candidates with clarity and speed.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#get-started"
              className="inline-flex items-center justify-center rounded-xl bg-synthora-blue px-6 py-3 font-medium text-white shadow-[0_14px_30px_rgba(37,99,235,.24)] transition hover:bg-synthora-blue-hover"
            >
              Get Started Free
            </a>
            <a
              href="#demo"
              className="inline-flex items-center justify-center rounded-xl border border-synthora-border bg-white px-6 py-3 font-medium text-synthora-text transition hover:border-synthora-cyan hover:text-synthora-blue sm:ml-4"
            >
              Watch Demo
            </a>
          </motion.div>
        </motion.div>

        <div className="flex items-center justify-center">
          <HeroDashboardImage />
        </div>
      </div>
    </section>
  );
}
