import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import ThemeToggle from "../components/ThemeToggle";
import logo from "../../images/logo.png";
import type { ReactNode } from "react";

type AuthLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function AuthLayout({ eyebrow, title, description, children }: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-synthora-radial px-5 py-6 font-inter text-slate-950 transition dark:bg-none dark:bg-slate-950 dark:text-white sm:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-3 text-sm font-bold text-slate-800 dark:text-white">
          <img src={logo} alt="" className="h-10 w-10" />
          Synthora.AI
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </div>
      </div>

      <section className="mx-auto grid min-h-[calc(100vh-96px)] max-w-6xl items-center gap-10 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <p className="mb-4 text-sm font-extrabold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">{eyebrow}</p>
          <h1 className="max-w-xl text-4xl font-extrabold leading-tight text-slate-950 dark:text-white md:text-5xl">{title}</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300">{description}</p>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {["Company setup", "Drive scheduling", "Student access"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/60 bg-white/70 p-4 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="rounded-3xl border border-white/70 bg-white/[0.88] p-5 shadow-glass backdrop-blur-2xl dark:border-white/10 dark:bg-white/10 sm:p-8"
        >
          {children}
        </motion.div>
      </section>
    </main>
  );
}
