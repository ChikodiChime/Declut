"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { CldImage } from "next-cloudinary";
import { User, LogOut } from "lucide-react";
import { useMe, useSignOut } from "@/lib/hooks/useAuth";

export function TopBar() {
  const { data: me } = useMe();
  const { mutate: signOut } = useSignOut();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-end h-14 px-6 lg:px-8 bg-card border-b border-border shrink-0">
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="group flex items-center gap-3 rounded-full px-2 py-1.5 hover:bg-surface transition-colors"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1 ring-border">
            {me?.avatar_url ? (
              <CldImage
                src={me.avatar_url}
                width={32}
                height={32}
                alt={me?.name ?? "Avatar"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary flex items-center justify-center">
                <span className="text-xs font-semibold text-white">
                  {me?.name?.[0]?.toUpperCase() ?? "U"}
                </span>
              </div>
            )}
          </div>

          <div className="text-left min-w-0 hidden sm:block">
            <p className="text-sm font-medium text-text truncate max-w-[180px]">
              {me?.name ?? "Account"}
            </p>
            <p className="text-xs text-text-subtle truncate max-w-[180px]">
              {me?.email ?? ""}
            </p>
          </div>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-card shadow-xl z-30">
            {/* Account Header */}
            <div className="px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-1 ring-border">
                  {me?.avatar_url ? (
                    <CldImage
                      src={me.avatar_url}
                      width={40}
                      height={40}
                      alt={me?.name ?? "Avatar"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">
                        {me?.name?.[0]?.toUpperCase() ?? "U"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text truncate">
                    {me?.name ?? "Account"}
                  </p>
                  <p className="text-xs text-text-subtle truncate">
                    {me?.email ?? ""}
                  </p>

                  <div className="mt-1.5">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      Account
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Menu Items */}
            <div className="py-1.5">
              <Link
                href="/dashboard/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-text hover:bg-surface transition-colors"
              >
                <User
                  size={16}
                  strokeWidth={1.75}
                  className="text-text-subtle"
                />
                <span>Profile Settings</span>
              </Link>

              <button
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/5 transition-colors"
              >
                <LogOut size={16} strokeWidth={1.75} />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}