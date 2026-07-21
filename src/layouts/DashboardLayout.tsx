import { Link, NavLink, useNavigate } from "react-router-dom";
import { BarChart3, BriefcaseBusiness, Building2, ClipboardList, LogOut, PanelLeft, Trophy, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import ThemeToggle from "../components/ThemeToggle";
import logo from "../../images/logo.png";

const sidebarItems = [
  { label: "Dashboard", to: "/company/dashboard", icon: BarChart3 },
  { label: "Create Hiring Drive", to: "/company/create-drive", icon: BriefcaseBusiness },
  { label: "Previous Drives", to: "/company/dashboard", icon: ClipboardList },
  { label: "Results", to: "/company/dashboard", icon: Trophy },
  { label: "Profile", to: "/company/dashboard", icon: UserRound },
];

type DashboardLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function DashboardLayout({ title, subtitle, children }: DashboardLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    window.localStorage.removeItem("synthora-token");
    navigate("/login");
  };

  return (
    <main className="min-h-screen bg-slate-50 font-inter text-slate-950 transition dark:bg-slate-950 dark:text-white">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white/95 px-4 py-5 shadow-xl shadow-slate-900/5 backdrop-blur-2xl transition dark:border-white/10 dark:bg-slate-950/95 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link to="/" className="mb-8 flex items-center gap-3 px-2">
          <img src={logo} alt="" className="h-10 w-10" />
          <span className="text-xl font-extrabold">Synthora.AI</span>
        </Link>

        <nav className="grid gap-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    isActive
                      ? "bg-slate-950 text-white shadow-lg shadow-slate-900/15 dark:bg-white dark:text-slate-950"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="absolute bottom-5 left-4 right-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {isOpen ? <button type="button" aria-label="Close sidebar" className="fixed inset-0 z-30 bg-slate-950/35 lg:hidden" onClick={() => setIsOpen(false)} /> : null}

      <section className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/85 px-5 py-4 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/85 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden dark:border-white/10 dark:bg-white/10 dark:text-white"
                aria-label="Open sidebar"
              >
                <PanelLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-300">
                  <Building2 className="h-4 w-4" />
                  Company Workspace
                </p>
                <h1 className="truncate text-2xl font-extrabold text-slate-950 dark:text-white">{title}</h1>
              </div>
            </div>
            <ThemeToggle />
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{subtitle}</p>
        </header>

        <div className="p-5 sm:p-8">{children}</div>
      </section>
    </main>
  );
}
