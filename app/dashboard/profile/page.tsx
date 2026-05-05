"use client";

import { motion } from "framer-motion";
import { User, Mail, Building2, Shield, CreditCard } from "lucide-react";
import { useMe } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui";

export default function ProfilePage() {
  const { data: me } = useMe();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-text">Profile</h1>
        <p className="text-sm text-text-muted mt-1">Manage your account information.</p>
      </div>

      {/* Avatar + name */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-card rounded-2xl shadow-card p-6 flex items-center gap-5"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/12 flex items-center justify-center shrink-0">
          <span className="text-2xl font-bold text-primary">
            {me?.name?.[0]?.toUpperCase() ?? "U"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-text">{me?.name ?? "—"}</p>
          <p className="text-sm text-text-muted">{me?.email ?? "—"}</p>
          <span className={[
            "inline-flex items-center gap-1 mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full",
            me?.account_type === "business"
              ? "bg-accent/10 text-accent"
              : "bg-primary/10 text-primary",
          ].join(" ")}>
            {me?.account_type === "business"
              ? <><Building2 size={11} /> Business</>
              : <><User size={11} /> Individual</>
            }
          </span>
        </div>
      </motion.div>

      {/* Details */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3 }}
        className="bg-card rounded-2xl shadow-card divide-y divide-border"
      >
        {[
          { icon: User,     label: "Full name",  value: me?.name },
          { icon: Mail,     label: "Email",      value: me?.email },
          { icon: Building2,label: "Account type", value: me?.account_type === "business" ? "Business" : "Individual" },
        ].map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex items-center gap-4 px-6 py-4">
              <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center shrink-0">
                <Icon size={17} className="text-text-muted" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-muted">{row.label}</p>
                <p className="text-sm font-medium text-text truncate">{row.value ?? "—"}</p>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Stripe Connect placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="bg-card rounded-2xl shadow-card p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <CreditCard size={20} className="text-accent" strokeWidth={1.75} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-text">Payment account</p>
            <p className="text-sm text-text-muted mt-0.5">
              Connect your Stripe account to receive payouts from sales.
            </p>
            <div className="mt-4">
              <Button variant="outline" size="sm" disabled>
                Connect Stripe — coming soon
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Security */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="bg-card rounded-2xl shadow-card p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center shrink-0">
            <Shield size={20} className="text-text-muted" strokeWidth={1.75} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-text">Security</p>
            <p className="text-sm text-text-muted mt-0.5">Change your password or enable 2FA.</p>
            <div className="mt-4">
              <Button variant="outline" size="sm" disabled>
                Manage security — coming soon
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
