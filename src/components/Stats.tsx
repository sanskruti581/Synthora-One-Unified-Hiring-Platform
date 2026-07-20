import { Activity, BarChart3, Clock, Target } from "lucide-react";
import { motion } from "framer-motion";

const stats = [
  { value: "250+", label: "Hiring Drives Created", icon: Target, color: "text-[#0EA5E9]", bg: "bg-sky-50" },
  { value: "100K+", label: "AI Interviews Conducted", icon: Activity, color: "text-[#6366F1]", bg: "bg-indigo-50" },
  { value: "98.6%", label: "Evaluation Accuracy", icon: BarChart3, color: "text-[#0EA5E9]", bg: "bg-sky-50" },
  { value: "24/7", label: "AI Availability", icon: Clock, color: "text-[#7C3AED]", bg: "bg-violet-50" },
];

export default function Stats() {
  return (
    <section className="relative z-20 bg-white px-5 pb-20 sm:px-8 lg:px-16 xl:px-[140px]">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.65 }}
        className="mx-auto grid max-w-[1440px] gap-2 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_4px_20px_-2px_rgba(0,0,0,.03)] sm:grid-cols-2 lg:grid-cols-4 lg:p-5"
      >
        {stats.map(({ value, label, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl p-6 text-center transition hover:bg-slate-50">
            <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${bg} ${color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <p className="mt-4 text-4xl font-black leading-none tracking-normal text-[#0F172A]">{value}</p>
            <p className="mt-3 text-sm font-semibold text-[#475569] sm:text-base">{label}</p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
