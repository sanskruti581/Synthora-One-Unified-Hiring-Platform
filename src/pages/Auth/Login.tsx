import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Lock, Mail } from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import FormField from "../../components/FormField";
import { loginUser } from "../../services/authService";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    try {
      setIsSubmitting(true);
      const response = await loginUser({ email, password });
      const userType = response.data.userType;

      if (response.data.token) {
        window.localStorage.setItem("synthora-token", response.data.token);
      }

      navigate(userType === "student" ? "/student/dashboard" : "/company/dashboard");
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : "";

      setError(message || "Login failed. Student login opens only after invitation activation and 10 minutes before the exam.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Secure login"
      title="One login for companies and invited students."
      description="Use the same entry point for both user types. The backend will identify whether the email belongs to a company or an activated student invitation."
    >
      <form className="grid gap-5" onSubmit={handleSubmit}>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">Login</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Students can sign in only after activating an invitation from a company.</p>
        </div>

        <FormField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} icon={<Mail className="h-5 w-5" />} required />
        <FormField label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} icon={<Lock className="h-5 w-5" />} required />

        {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 dark:bg-rose-500/10">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 rounded-xl bg-slate-950 px-5 text-sm font-extrabold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300"
        >
          {isSubmitting ? "Signing in..." : "Login"}
        </button>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          New company?{" "}
          <Link to="/company/register" className="font-bold text-sky-600 dark:text-sky-300">
            Register Company
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
