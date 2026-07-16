import { Activity, BarChart3, Clock, Target } from "lucide-react";
import { motion } from "framer-motion";

const stats = [
  { value: "250+", label: "Hiring Drives Created", icon: Target },
  { value: "100K+", label: "AI Interviews Conducted", icon: Activity },
  { value: "98.6%", label: "Evaluation Accuracy", icon: BarChart3 },
  { value: "24/7", label: "AI Availability", icon: Clock },
];

export default function Stats() {
  return (
    <section className="relative z-20 px-5 pb-20 sm:px-8 lg:px-16 xl:px-[140px]">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.65 }}
        className="mx-auto grid max-w-[1440px] gap-4 rounded-[32px] border border-white/70 bg-white/90 p-4 text-[#1E154C] shadow-[0px_30px_60px_rgba(0,0,0,.25)] backdrop-blur-2xl sm:grid-cols-2 lg:grid-cols-4 lg:p-6"
      >
        {stats.map(({ value, label, icon: Icon }) => (
          <div key={label} className="rounded-[24px] p-6 text-center transition hover:bg-[#5A22E6]/5">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#5A22E6]/10 text-[#5A22E6]">
              <Icon className="h-7 w-7" />
            </div>
            <p className="mt-4 text-4xl font-black leading-none tracking-normal">{value}</p>
            <p className="mt-3 text-sm font-bold text-[#3E336C] sm:text-base">{label}</p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
