'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CldImage } from 'next-cloudinary'
import Link from 'next/link'
import {
  User,
  Mail,
  Building2,
  Shield,
  Camera,
  Pencil,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'
import { useMe, useUpdateProfile, useChangePassword, useSendVerification } from '@/lib/hooks/useAuth'
import { useUploadImage } from '@/lib/hooks/useListings'
import { Modal } from '@/components/ui'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMemberSince(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  avatarUrl,
  name,
  size = 80,
}: {
  avatarUrl?: string | null
  name?: string | null
  size?: number
}) {
  if (avatarUrl) {
    return (
      <CldImage
        src={avatarUrl}
        width={size}
        height={size}
        className="rounded-2xl object-cover"
        alt={name ?? 'Avatar'}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-2xl bg-primary/10 flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="font-bold text-primary" style={{ fontSize: size * 0.38 }}>
        {name?.[0]?.toUpperCase() ?? 'U'}
      </span>
    </div>
  )
}

// ─── Hero card ────────────────────────────────────────────────────────────────

function HeroCard({
  me,
  onEditName,
  onEditAvatar,
}: {
  me: ReturnType<typeof useMe>['data']
  onEditName: () => void
  onEditAvatar: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative rounded-2xl border border-border bg-card overflow-hidden p-6"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div
        className="absolute top-0 right-0 w-56 h-56 opacity-[0.05] pointer-events-none"
        style={{ background: 'radial-gradient(circle at center, #4f46e5 0%, transparent 70%)' }}
      />

      <div className="relative flex items-start gap-5">
        {/* Avatar with edit overlay */}
        <div className="relative group shrink-0">
          <Avatar avatarUrl={me?.avatar_url} name={me?.name} size={80} />
          <button
            onClick={onEditAvatar}
            className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            aria-label="Change photo"
          >
            <Camera size={18} strokeWidth={2} className="text-white" />
          </button>
        </div>

        {/* Name + email + meta */}
        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-text truncate">{me?.name ?? '—'}</p>
            <button
              onClick={onEditName}
              className="shrink-0 rounded-lg p-1 hover:bg-surface transition-colors text-text-subtle hover:text-text"
              aria-label="Edit name"
            >
              <Pencil size={13} strokeWidth={2} />
            </button>
          </div>

          {/* Email + verification badge */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-sm text-text-muted truncate">{me?.email ?? '—'}</p>
            {me && (
              me.email_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
                  <CheckCircle2 size={9} strokeWidth={2.5} />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 px-2 py-0.5 text-[10px] font-semibold">
                  <AlertCircle size={9} strokeWidth={2.5} />
                  Unverified
                </span>
              )
            )}
          </div>

          {/* Account type + member since */}
          <div className="flex items-center gap-2.5 mt-2.5 flex-wrap">
            <span className={[
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
              me?.account_type === 'business'
                ? 'bg-accent/10 text-accent'
                : 'bg-primary/10 text-primary',
            ].join(' ')}>
              {me?.account_type === 'business'
                ? <><Building2 size={10} strokeWidth={2.5} /> Business</>
                : <><User size={10} strokeWidth={2.5} /> Individual</>
              }
            </span>
            {me?.created_at && (
              <span className="text-[11px] text-text-subtle">
                Member since {formatMemberSince(me.created_at)}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Account section ──────────────────────────────────────────────────────────

function AccountSection({ me }: { me: ReturnType<typeof useMe>['data'] }) {
  const { mutate: sendVerification, isPending, isSuccess, data: sendData } = useSendVerification()

  const stripeConnected = me?.stripe_onboarding_complete

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 }}
      className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {/* Email verification */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0">
          <Mail size={15} strokeWidth={1.75} className="text-text-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-subtle font-medium uppercase tracking-wider">Email</p>
          <p className="text-sm font-medium text-text mt-0.5 truncate">{me?.email ?? '—'}</p>
        </div>
        <div className="shrink-0">
          {me?.email_verified ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-3 py-1.5 text-[11px] font-semibold">
              <CheckCircle2 size={11} strokeWidth={2.5} />
              Verified
            </span>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 px-3 py-1.5 text-[11px] font-semibold">
                <AlertCircle size={11} strokeWidth={2.5} />
                Unverified
              </span>
              {isSuccess && sendData?.sent ? (
                <p className="text-[10px] text-success">Code sent — check your inbox</p>
              ) : isSuccess && !sendData?.sent ? (
                <p className="text-[10px] text-text-subtle">
                  Try again in {sendData?.retryAfter ?? 60}s
                </p>
              ) : (
                <button
                  onClick={() => sendVerification()}
                  disabled={isPending}
                  className="text-[10px] text-primary underline underline-offset-2 disabled:opacity-50"
                >
                  {isPending ? 'Sending…' : 'Resend verification'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stripe connect status */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0">
          <Shield size={15} strokeWidth={1.75} className="text-text-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-subtle font-medium uppercase tracking-wider">Payouts</p>
          <p className="text-sm font-medium text-text mt-0.5">
            {stripeConnected ? 'Stripe connected' : 'Not connected'}
          </p>
        </div>
        <Link
          href="/dashboard/billing"
          className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text transition-colors"
        >
          {stripeConnected ? 'Manage' : 'Set up'}
          <ChevronRight size={12} strokeWidth={2.5} />
        </Link>
      </div>
    </motion.div>
  )
}

// ─── Security section ─────────────────────────────────────────────────────────

function SecuritySection({ onChangePassword }: { onChangePassword: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.14 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0">
          <Shield size={15} strokeWidth={1.75} className="text-text-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-subtle font-medium uppercase tracking-wider">Security</p>
          <p className="text-sm font-medium text-text mt-0.5">Password</p>
        </div>
        <button
          onClick={onChangePassword}
          className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text transition-colors"
        >
          Change
          <ChevronRight size={12} strokeWidth={2.5} />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Name modal form ──────────────────────────────────────────────────────────

function NameForm({ currentName, onClose }: { currentName: string; onClose: () => void }) {
  const [name, setName] = useState(currentName)
  const [error, setError] = useState('')
  const { mutate, isPending } = useUpdateProfile()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('Name cannot be empty'); return }
    if (trimmed.length > 100) { setError('Name must be 100 characters or less'); return }
    setError('')
    mutate({ name: trimmed }, { onSuccess: onClose, onError: (err) => setError(err.message) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1.5">Full name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          placeholder="Your name"
          autoFocus
        />
        {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
      </div>
      <div className="flex gap-2.5 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-muted hover:bg-surface transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}

// ─── Avatar modal form ────────────────────────────────────────────────────────

function AvatarForm({
  currentAvatarUrl,
  currentName,
  onClose,
}: {
  currentAvatarUrl?: string | null
  currentName?: string | null
  onClose: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null)
  const [error, setError] = useState('')

  const { mutateAsync: uploadImage, isPending: isUploading } = useUploadImage()
  const { mutate: updateProfile, isPending: isSaving } = useUpdateProfile()

  const isPending = isUploading || isSaving

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    setError('')
    setPreview(URL.createObjectURL(file))
    setPendingBlob(file)
    e.target.value = ''
  }

  async function handleSave() {
    if (!pendingBlob) { onClose(); return }
    try {
      const { public_id } = await uploadImage(pendingBlob)
      updateProfile(
        { avatar_url: public_id },
        {
          onSuccess: () => {
            if (preview) URL.revokeObjectURL(preview)
            onClose()
          },
          onError: (err) => setError(err.message),
        }
      )
    } catch {
      setError('Upload failed — please try again')
    }
  }

  return (
    <div className="space-y-5">
      {/* Preview */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="w-24 h-24 rounded-2xl object-cover border border-border"
            />
          ) : (
            <Avatar avatarUrl={currentAvatarUrl} name={currentName} size={96} />
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-muted hover:border-border-strong hover:text-text transition-colors disabled:opacity-50"
        >
          <Camera size={14} strokeWidth={2} />
          {preview ? 'Change photo' : 'Choose photo'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && <p className="text-xs text-error text-center">{error}</p>}

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-muted hover:bg-surface transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 size={13} strokeWidth={2.5} className="animate-spin" />}
          {isUploading ? 'Uploading…' : isSaving ? 'Saving…' : pendingBlob ? 'Save photo' : 'Done'}
        </button>
      </div>
    </div>
  )
}

// ─── Password modal form ──────────────────────────────────────────────────────

function PasswordField({
  label,
  value,
  onChange,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 pr-10 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text transition-colors"
          aria-label={show ? 'Hide' : 'Show'}
        >
          {show ? <EyeOff size={14} strokeWidth={2} /> : <Eye size={14} strokeWidth={2} />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
    </div>
  )
}

function PasswordForm({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const [success, setSuccess] = useState(false)

  const { mutate, isPending } = useChangePassword()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: typeof errors = {}
    if (!current) errs.current = 'Required'
    if (next.length < 8) errs.next = 'Must be at least 8 characters'
    if (next !== confirm) errs.confirm = 'Passwords do not match'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})

    mutate(
      { current_password: current, new_password: next },
      {
        onSuccess: () => {
          setSuccess(true)
          setTimeout(onClose, 1200)
        },
        onError: (err) => {
          const msg = err.message
          if (msg.toLowerCase().includes('current')) {
            setErrors({ current: 'Current password is incorrect' })
          } else {
            setErrors({ current: msg })
          }
        },
      }
    )
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 size={32} strokeWidth={1.5} className="text-success" />
        <p className="text-sm font-semibold text-text">Password updated</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PasswordField
        label="Current password"
        value={current}
        onChange={setCurrent}
        error={errors.current}
      />
      <PasswordField
        label="New password"
        value={next}
        onChange={setNext}
        error={errors.next}
      />
      <PasswordField
        label="Confirm new password"
        value={confirm}
        onChange={setConfirm}
        error={errors.confirm}
      />
      <div className="flex gap-2.5 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-muted hover:bg-surface transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Saving…' : 'Update password'}
        </button>
      </div>
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ModalType = 'name' | 'avatar' | 'password' | null

export default function ProfilePage() {
  const { data: me } = useMe()
  const [modal, setModal] = useState<ModalType>(null)

  function close() { setModal(null) }

  return (
    <div className="space-y-4 max-w-xl">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-text tracking-tight">Profile</h1>
        <p className="text-sm text-text-muted mt-1">Manage your account information and security.</p>
      </motion.div>

      <HeroCard
        me={me}
        onEditName={() => setModal('name')}
        onEditAvatar={() => setModal('avatar')}
      />

      <AccountSection me={me} />

      <SecuritySection onChangePassword={() => setModal('password')} />

      {/* Name modal */}
      <Modal open={modal === 'name'} onClose={close} title="Edit name">
        <NameForm currentName={me?.name ?? ''} onClose={close} />
      </Modal>

      {/* Avatar modal */}
      <Modal open={modal === 'avatar'} onClose={close} title="Change photo">
        <AvatarForm
          currentAvatarUrl={me?.avatar_url}
          currentName={me?.name}
          onClose={close}
        />
      </Modal>

      {/* Password modal */}
      <Modal open={modal === 'password'} onClose={close} title="Change password">
        <PasswordForm onClose={close} />
      </Modal>
    </div>
  )
}
