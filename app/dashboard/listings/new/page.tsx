"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ListingForm } from "@/components/listings";
import { useCreateListing } from "@/lib/hooks/useListings";
import { useMe } from "@/lib/hooks/useAuth";
import { Modal } from "@/components/ui";
import { Wallet, ArrowUpRight, X, CheckCircle2 } from "lucide-react";
import type { ListingFormData } from "@/types";

function PayoutBanner() {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <Wallet size={14} strokeWidth={2} className="text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900 leading-snug">
              List everything first — go live when you&apos;re ready
            </p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Add as many items as you want today. When you set up payouts
              (takes about 2 minutes), all your listings go live at once and
              buyers can start finding them immediately.
            </p>
            <button
              onClick={() => router.push('/dashboard/billing?from=new-listing')}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-60 transition-colors"
            >
              Set up payouts
              <ArrowUpRight size={11} strokeWidth={2.5} />
            </button>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="mt-0.5 shrink-0 rounded-md p-1 text-amber-500 hover:bg-amber-100 hover:text-amber-700 transition-colors"
            aria-label="Dismiss"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PayoutPromptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();

  function handleSetupPayouts() {
    router.push('/dashboard/billing?from=new-listing');
  }

  function handleLater() {
    onClose();
    router.push("/dashboard/listings");
  }

  return (
    <Modal open={open} onClose={handleLater} title="One more thing">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50">
            <CheckCircle2 size={20} strokeWidth={1.75} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text">Your listing is saved!</p>
            <p className="text-sm text-text mt-1 leading-relaxed">
              To receive payment when your item sells, add your bank account.
              It takes about 2 minutes — and once you do, all your
              saved listings go live instantly.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleSetupPayouts}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60 transition-colors"
          >
            Set up payouts
            <ArrowUpRight size={14} strokeWidth={2.5} />
          </button>
          <button
            onClick={handleLater}
            className="w-full inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-text hover:bg-surface transition-colors"
          >
            I&apos;ll do it later
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function NewListingPage() {
  const { data: user, isLoading } = useMe();
  const [showModal, setShowModal] = useState(false);

  const { mutateAsync: createListing, isPending } = useCreateListing(
    user?.paystack_onboarding_complete
      ? undefined
      : () => setShowModal(true),
  );

  async function handleSubmit(data: ListingFormData) {
    await createListing(data);
  }

  if (isLoading) return null;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">New Listing</h1>
        <p className="text-sm text-text-muted mt-1">
          {user?.paystack_onboarding_complete
            ? "Fill out the steps below to publish your item."
            : "Fill in the details and list as many items as you want — no payment setup needed yet."}
        </p>
      </div>

      {!user?.paystack_onboarding_complete && <PayoutBanner />}

      <ListingForm onSubmit={handleSubmit} isPending={isPending} />

      <PayoutPromptModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
