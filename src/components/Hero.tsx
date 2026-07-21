import { CalendarCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import dashboardGirl from "../../images/Dashboard_girl.png";

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
    <section className="relative overflow-hidden bg-white py-20 md:py-28" id="solutions">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2 lg:gap-16">
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.1 }}
          className="flex flex-col justify-center"
        >
          <motion.div
            variants={fadeUp}
            className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-4 py-2.5 text-xs font-extrabold uppercase text-[#0EA5E9] shadow-[0_12px_30px_rgba(14,165,233,.08)]"
          >
            <CalendarCheck className="h-4 w-4" />
            AI-Powered Recruitment Platform
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mb-6 text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-900 md:text-5xl lg:text-6xl"
          >
            <span className="block">Hire Smarter.</span>
            <span className="block text-blue-600">Interview Faster.</span>
            <span className="block">Choose With Confidence.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mb-8 max-w-xl text-lg leading-relaxed text-slate-600">
            Synthora.AI streamlines aptitude tests, technical interviews, coding rounds, and HR conversations so teams
            can identify stronger candidates with clarity and speed.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/company/register"
              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-6 py-3 font-medium text-white transition hover:bg-slate-800"
            >
              Register Company
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-200 sm:ml-4"
            >
              Login
            </Link>
          </motion.div>
        </motion.div>

        <div className="flex items-center justify-center">
          <HeroDashboardImage />
        </div>
      </div>
    </section>
  );
}
