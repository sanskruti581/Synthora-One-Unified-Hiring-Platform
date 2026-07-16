import {
  BarChart3,
  Bolt,
  Check,
  ChevronRight,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const proofItems = [
  { label: "Secure & Reliable", icon: ShieldCheck },
  { label: "AI-Driven Evaluation", icon: Bolt },
  { label: "Data-Backed Insights", icon: BarChart3 },
];

const particles = [
  "left-[13%] top-[19%] h-2 w-2",
  "right-[8%] top-[16%] h-3 w-3 delay-300",
  "left-[34%] bottom-[18%] h-2.5 w-2.5 delay-700",
  "right-[22%] bottom-[12%] h-2 w-2 delay-1000",
  "left-[4%] bottom-[44%] h-1.5 w-1.5 delay-500",
];

function InterviewCard() {
  return (
    <motion.article
      initial={{ opacity: 0, rotate: -8, y: 40 }}
      animate={{ opacity: 1, rotate: -4, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.25 }}
      className="relative w-full max-w-[460px] rounded-[32px] border border-white/30 bg-white/[.13] p-5 text-white shadow-[0px_30px_60px_rgba(0,0,0,.25)] backdrop-blur-3xl sm:p-7 lg:ml-3"
    >
      <div className="absolute -right-6 top-10 h-24 w-24 rounded-full bg-[#FF5DA2]/30 blur-3xl" />
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-sm font-medium text-white/60">Interview Score</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-[64px] font-black leading-none tracking-normal text-white sm:text-[76px]">92%</span>
            <span className="mb-2 rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-bold text-emerald-200">Excellent</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
          <Users className="h-6 w-6 text-white" />
        </div>
      </div>

      <div className="mt-7 rounded-[24px] border border-white/10 bg-white/[.08] p-4">
        <svg viewBox="0 0 390 120" className="h-28 w-full" role="img" aria-label="Candidate score trend line">
          <defs>
            <linearGradient id="lineGradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#C5A7FF" />
              <stop offset="55%" stopColor="#8746EB" />
              <stop offset="100%" stopColor="#FF5DA2" />
            </linearGradient>
          </defs>
          <path d="M8 101H382" stroke="rgba(255,255,255,.12)" strokeWidth="2" />
          <path d="M8 70H382" stroke="rgba(255,255,255,.12)" strokeWidth="2" />
          <path d="M8 39H382" stroke="rgba(255,255,255,.12)" strokeWidth="2" />
          <path
            d="M10 91C45 79 55 47 92 55C132 64 136 27 173 34C218 43 219 83 263 63C300 46 313 24 350 31C366 34 374 25 382 19"
            fill="none"
            stroke="url(#lineGradient)"
            strokeLinecap="round"
            strokeWidth="8"
          />
        </svg>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-[24px] border border-white/10 bg-white/[.08] p-4">
        <div className="flex -space-x-3">
          {["from-emerald-200 to-violet-500", "from-pink-200 to-[#FF5DA2]", "from-white to-[#8746EB]"].map((gradient) => (
            <span key={gradient} className={`h-11 w-11 rounded-full border-2 border-white/80 bg-gradient-to-br ${gradient}`} />
          ))}
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-white">Candidate Avatar List</p>
          <p className="text-xs font-medium text-white/55">Top profiles shortlisted</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {[
          ["Technical Round", "Completed", "bg-emerald-400", "w-full", "bg-emerald-400/18"],
          ["Coding Round", "In Progress", "bg-[#A979FF]", "w-[72%]", "bg-[#8746EB]/24"],
          ["HR Round", "Pending", "bg-white/35", "w-[24%]", "bg-white/10"],
        ].map(([title, status, color, width, track]) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-white/[.08] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-white">{title}</span>
              <span className="flex items-center gap-2 text-xs font-semibold text-white/65">
                <span className={`h-5 w-9 rounded-full ${track} p-0.5`}>
                  <span className={`block h-4 w-4 rounded-full ${color} ${title === "Technical Round" ? "ml-auto" : ""}`} />
                </span>
                {status}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full ${color} ${width}`} />
            </div>
          </div>
        ))}
      </div>
    </motion.article>
  );
}

function Robot() {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0.88, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.85, ease: "easeOut", delay: 0.45 }}
      className="absolute -right-2 bottom-0 z-20 h-[345px] w-[210px] animate-float sm:-right-8 sm:h-[430px] sm:w-[260px] lg:right-0 xl:right-6"
    >
      <div className="absolute bottom-0 left-1/2 h-9 w-40 -translate-x-1/2 rounded-full bg-[#8746EB]/45 blur-xl" />
      <div className="absolute left-1/2 top-0 h-[126px] w-[156px] -translate-x-1/2 rounded-[40px] bg-gradient-to-br from-white to-[#E9E3FF] shadow-[inset_-16px_-18px_34px_rgba(90,34,230,.14),0_24px_60px_rgba(255,255,255,.18)] sm:h-[148px] sm:w-[178px]">
        <div className="absolute left-1/2 top-[-28px] h-8 w-1 -translate-x-1/2 rounded-full bg-white">
          <span className="absolute -top-4 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-[#FF5DA2] shadow-[0_0_28px_rgba(255,93,162,.8)]" />
        </div>
        <div className="absolute inset-x-6 top-8 h-[70px] rounded-[26px] bg-[#111024] shadow-[inset_0_0_28px_rgba(135,70,235,.4)] sm:h-[82px]">
          <span className="absolute left-8 top-7 h-3 w-5 rounded-b-full border-b-[4px] border-white shadow-[0_0_12px_rgba(255,255,255,.9)]" />
          <span className="absolute right-8 top-7 h-3 w-5 rounded-b-full border-b-[4px] border-white shadow-[0_0_12px_rgba(255,255,255,.9)]" />
          <span className="absolute bottom-5 left-1/2 h-4 w-11 -translate-x-1/2 rounded-b-full border-b-[4px] border-[#B887FF]" />
        </div>
      </div>

      <div className="absolute left-1/2 top-[138px] h-[158px] w-[160px] -translate-x-1/2 rounded-[46px] bg-gradient-to-br from-white to-[#E5DEFF] shadow-[inset_-16px_-22px_34px_rgba(90,34,230,.16),0_26px_56px_rgba(90,34,230,.24)] sm:top-[164px] sm:h-[192px] sm:w-[178px]">
        <div className="absolute left-1/2 top-9 grid h-20 w-20 -translate-x-1/2 place-items-center rounded-[25px] bg-gradient-to-br from-[#5A22E6] to-[#FF5DA2] text-4xl font-black text-white shadow-[0_16px_34px_rgba(90,34,230,.36)]">
          S
        </div>
      </div>

      <div className="absolute left-5 top-[158px] h-[130px] w-11 rotate-[17deg] rounded-full bg-gradient-to-br from-white to-[#DCD4FF] sm:left-4 sm:top-[186px] sm:h-[150px] sm:w-12">
        <span className="absolute -bottom-4 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full bg-white" />
      </div>
      <div className="absolute right-4 top-[160px] h-[130px] w-11 -rotate-[35deg] rounded-full bg-gradient-to-br from-white to-[#DCD4FF] sm:right-2 sm:top-[186px] sm:h-[150px] sm:w-12">
        <span className="absolute -bottom-4 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full bg-white" />
      </div>

      <div className="absolute bottom-3 left-[76px] h-20 w-11 rounded-full bg-gradient-to-br from-white to-[#DED6FF] sm:left-[86px]">
        <span className="absolute -bottom-3 -left-2 h-7 w-14 rounded-full bg-white" />
      </div>
      <div className="absolute bottom-8 right-[70px] h-20 w-11 -rotate-3 rounded-full bg-gradient-to-br from-white to-[#DED6FF] sm:right-[82px]">
        <span className="absolute -bottom-3 -left-2 h-7 w-14 rounded-full bg-white" />
      </div>
    </motion.div>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pb-16 pt-32 sm:px-8 lg:px-16 lg:pb-20 lg:pt-36 xl:px-[140px]" id="solutions">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-[9%] top-[13%] h-72 w-72 rounded-full bg-[#8746EB]/35 blur-[90px]" />
        <div className="absolute right-[10%] top-[20%] h-96 w-96 rounded-full bg-[#FF5DA2]/25 blur-[110px]" />
        {particles.map((particle) => (
          <span key={particle} className={`absolute rounded-full bg-white shadow-[0_0_26px_rgba(255,255,255,.85)] ${particle} animate-drift`} />
        ))}
      </div>

      <div className="mx-auto grid max-w-[1640px] items-center gap-14 lg:grid-cols-[45%_55%]">
        <motion.div initial="hidden" animate="visible" transition={{ staggerChildren: 0.1 }} className="relative z-10">
          <motion.div
            variants={fadeUp}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/[.08] px-4 py-3 text-xs font-extrabold uppercase tracking-[.14em] text-white shadow-glass backdrop-blur"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-[#FF9FC2]" />
            <span>AI-Powered Recruitment Platform</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-7 max-w-[720px] text-balance text-[44px] font-black leading-[1] tracking-normal text-white sm:text-[58px] lg:text-[64px] xl:text-[72px]"
          >
            Smarter Interviews. Better Candidates. <span className="text-[#FF6A95]">Stronger Hiring.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-7 max-w-[650px] text-lg font-light leading-8 text-white/85 sm:text-xl">
            Synthora.AI automates your end-to-end hiring process-from aptitude tests to technical, coding, and HR
            interviews-helping organizations identify and shortlist top talent with AI-powered precision.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-9 flex flex-col gap-4 sm:flex-row">
            <a
              href="#get-started"
              className="group inline-flex min-h-[58px] items-center justify-center gap-2 rounded-full bg-white px-8 text-lg font-semibold text-[#5A22E6] shadow-[0_22px_58px_rgba(255,255,255,.25)] transition hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(255,255,255,.34)]"
            >
              Get Started for Free
              <ChevronRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </a>
            <a
              href="#demo"
              className="inline-flex min-h-[58px] items-center justify-center gap-3 rounded-full border border-white/55 bg-white/[.04] px-8 text-lg font-semibold text-white backdrop-blur transition hover:-translate-y-1 hover:bg-white/10"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
                <Play className="h-4 w-4 fill-white" />
              </span>
              Book a Demo
            </a>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
            {proofItems.map(({ label, icon: Icon }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.08] px-4 py-3 text-sm font-medium text-white/80 backdrop-blur"
              >
                <Icon className="h-4 w-4 text-[#FF9FC2]" />
                {label}
              </span>
            ))}
          </motion.div>
        </motion.div>

        <div className="relative min-h-[700px] lg:min-h-[720px]">
          <div className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.22),rgba(135,70,235,.18)_34%,transparent_68%)] blur-sm" />
          <div className="absolute left-0 top-12 w-[78%] max-w-[500px] sm:left-[5%] lg:left-0 xl:left-[6%]">
            <InterviewCard />
          </div>
          <Robot />
          <div className="absolute bottom-28 right-[14%] hidden rounded-2xl border border-white/15 bg-white/[.08] px-4 py-3 text-sm font-semibold text-white shadow-glass backdrop-blur md:flex">
            <Check className="mr-2 h-5 w-5 text-emerald-300" />
            Final report ready
          </div>
        </div>
      </div>
    </section>
  );
}
