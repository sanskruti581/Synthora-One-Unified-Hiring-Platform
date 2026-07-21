import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Globe2, Lock, Mail, Phone, UserRound } from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import FormField from "../../components/FormField";
import { registerCompany } from "../../services/authService";

const initialForm = {
  companyName: "",
  hrName: "",
  email: "",
  phone: "",
  website: "",
  password: "",
  confirmPassword: "",
  acceptedTerms: false,
};

export default function CompanyRegister() {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const updateField = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      await registerCompany(form);
      navigate("/company/login");
    } catch {
      setError("Registration failed. Please check the details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Company registration"
      title="Create your hiring workspace."
      description="Register your organization, invite students through uploaded sheets, and manage assessments from a secure company dashboard."
    >
      <form className="grid gap-5" onSubmit={handleSubmit}>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">Register Company</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Students are invited later by the company. There is no student self-registration.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Company Name" value={form.companyName} onChange={(event) => updateField("companyName", event.target.value)} icon={<Building2 className="h-5 w-5" />} required />
          <FormField label="HR Name" value={form.hrName} onChange={(event) => updateField("hrName", event.target.value)} icon={<UserRound className="h-5 w-5" />} required />
          <FormField label="Official Company Email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} icon={<Mail className="h-5 w-5" />} required />
          <FormField label="Phone Number" type="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} icon={<Phone className="h-5 w-5" />} required />
          <FormField label="Company Website" type="url" value={form.website} onChange={(event) => updateField("website", event.target.value)} icon={<Globe2 className="h-5 w-5" />} required />
          <FormField label="Create Password" type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} icon={<Lock className="h-5 w-5" />} required />
          <FormField label="Confirm Password" type="password" value={form.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} icon={<Lock className="h-5 w-5" />} required className="sm:col-span-2" />
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          <input
            type="checkbox"
            checked={form.acceptedTerms}
            onChange={(event) => updateField("acceptedTerms", event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            required
          />
          I Agree to Terms & Conditions
        </label>

        {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 dark:bg-rose-500/10">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 rounded-xl bg-slate-950 px-5 text-sm font-extrabold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300"
        >
          {isSubmitting ? "Registering..." : "Register Company"}
        </button>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Already registered?{" "}
          <Link to="/login" className="font-bold text-sky-600 dark:text-sky-300">
            Login
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
