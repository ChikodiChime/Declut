'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CldImage } from 'next-cloudinary'
import Link from 'next/link'
import {
  User,
  Building2,
  Camera,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'
import { useMe, useUpdateProfile, useChangePassword, useSendVerification } from '@/lib/hooks/useAuth'
import { useUploadImage } from '@/lib/hooks/useListings'
import { Modal } from '@/components/ui'
import PlacesAddressInput from "@/components/checkout/PlacesAddressInput"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMemberSince(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
}

function Avatar({ avatarUrl, name, size = 80 }: { avatarUrl?: string | null; name?: string | null; size?: number }) {
  if (avatarUrl) {
    return <CldImage src={avatarUrl} width={size} height={size} className="rounded-2xl object-cover" alt={name ?? 'Avatar'} style={{ width: size, height: size }} />
  }
  return (
    <div className="rounded-2xl bg-primary/10 flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <span className="font-bold text-primary" style={{ fontSize: size * 0.38 }}>{name?.[0]?.toUpperCase() ?? 'U'}</span>
    </div>
  )
}


// ─── Profile sidebar (left panel) ────────────────────────────────────────────

function ProfileSidebar({
  me,
  onEditAvatar,
}: {
  me: ReturnType<typeof useMe>['data']
  onEditAvatar: () => void
}) {
  const accountType = (me as { account_type?: string })?.account_type ?? 'personal'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-64 shrink-0 rounded-2xl border border-border bg-card"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {/* Coloured header — avatar sits at the bottom edge */}
      <div className="relative h-20 bg-primary rounded-t-2xl overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cpath d='M36 0H0V36' fill='none' stroke='rgba(255,255,255,0.07)' stroke-width='1'/%3E%3C/svg%3E\")",
            backgroundSize: '36px 36px',
          }}
        />
      </div>

      {/* Avatar bridging the two sections */}
      <div className="flex flex-col items-center -mt-10 px-5 pb-4">
        <div className="relative group mb-3">
          <div className="w-20 h-20 rounded-full overflow-hidden ring-[3px] ring-card shadow-md">
            {me?.avatar_url ? (
              <CldImage src={me.avatar_url} width={80} height={80} alt={me.name ?? 'Avatar'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{me?.name?.[0]?.toUpperCase() ?? 'U'}</span>
              </div>
            )}
          </div>
          <button
            onClick={onEditAvatar}
            className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            aria-label="Change photo"
          >
            <Camera size={15} strokeWidth={2} className="text-white" />
          </button>
        </div>

        <p className="text-sm font-bold text-text text-center leading-tight">{me?.name ?? '—'}</p>
        <span className={[
          'mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
          accountType === 'business' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary',
        ].join(' ')}>
          {accountType === 'business' ? <><Building2 size={9} strokeWidth={2.5} /> Business</> : <><User size={9} strokeWidth={2.5} /> Individual</>}
        </span>
      </div>

      <div className="border-t border-border divide-y divide-border">
        {[
          { label: 'EMAIL', value: me?.email ?? '—' },
          { label: 'PHONE', value: me?.phone ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="px-5 py-3">
            <p className="text-[10px] font-semibold tracking-widest text-text-subtle mb-0.5">{label}</p>
            <p className="text-xs text-text truncate">{value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Info card + row ──────────────────────────────────────────────────────────

const INPUT_CLS = "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"

function InfoCard({
  title,
  subtitle,
  children,
  delay = 0,
  editing = false,
  onEdit,
  onCancel,
  onSave,
  saving = false,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  delay?: number
  editing?: boolean
  onEdit?: () => void
  onCancel?: () => void
  onSave?: () => void
  saving?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-2xl border border-border bg-card"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-text">{title}</p>
          {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
        </div>
        {onEdit && (
          editing ? (
            <div className="flex items-center gap-2 shrink-0">
              {onCancel && (
                <button onClick={onCancel} className="text-xs font-semibold text-text-muted hover:text-text px-3 py-1.5 rounded-lg hover:bg-surface transition-colors">
                  Cancel
                </button>
              )}
              {onSave && (
                <button onClick={onSave} disabled={saving} className="text-xs font-semibold text-white bg-primary hover:bg-primary-hover disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              )}
            </div>
          ) : (
            <button onClick={onEdit} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover transition-colors shrink-0">
              <Pencil size={11} strokeWidth={2.5} />
              Edit
            </button>
          )
        )}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </motion.div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 gap-4">
      <span className="text-sm text-text-muted shrink-0">{label}</span>
      <span className="text-sm text-text text-right truncate">{value}</span>
    </div>
  )
}

// ─── Personal Information card ────────────────────────────────────────────────

function PersonalInfoCard({ me }: { me: ReturnType<typeof useMe>['data'] }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const { mutate, isPending } = useUpdateProfile()
  const { mutate: sendVerification, isPending: sendingVerif, isSuccess: verificSent, data: verificData, reset: resetVerif } = useSendVerification()

  useEffect(() => {
    if (!verificSent) return
    const t = setTimeout(resetVerif, 30_000)
    return () => clearTimeout(t)
  }, [verificSent, resetVerif])

  function startEdit() { setName(me?.name ?? ''); setNameError(''); setEditing(true) }
  function cancel() { setEditing(false); setNameError('') }
  function save() {
    const trimmed = name.trim()
    if (!trimmed) { setNameError('Name cannot be empty'); return }
    if (trimmed.length > 100) { setNameError('Name must be 100 characters or less'); return }
    setNameError('')
    mutate({ name: trimmed }, { onSuccess: () => setEditing(false), onError: e => setNameError(e.message) })
  }

  return (
    <InfoCard title="Personal Information" subtitle="Your name and contact details" editing={editing} onEdit={startEdit} onCancel={cancel} onSave={save} saving={isPending} delay={0.05}>
      {editing ? (
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Full name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus maxLength={100} placeholder="Your name" className={INPUT_CLS} />
            {nameError && <p className="mt-1.5 text-xs text-error">{nameError}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Email</label>
            <input type="email" value={me?.email ?? ''} disabled className={`${INPUT_CLS} opacity-60 cursor-not-allowed`} />
            <p className="mt-1 text-xs text-text-subtle">Email cannot be changed.</p>
          </div>
        </div>
      ) : (
        <>
          <InfoRow label="Name" value={me?.name ?? '—'} />
          <div className="flex items-center justify-between px-5 py-3.5 gap-4">
            <span className="text-sm text-text-muted shrink-0">Email</span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm text-text truncate">{me?.email ?? '—'}</span>
              {me && (me.email_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2 py-0.5 text-[10px] font-semibold shrink-0">
                  <CheckCircle2 size={9} strokeWidth={2.5} /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 px-2 py-0.5 text-[10px] font-semibold shrink-0">
                  <AlertCircle size={9} strokeWidth={2.5} /> Unverified
                </span>
              ))}
            </div>
          </div>
          {me && !me.email_verified && (
            <div className="px-5 pb-3 -mt-1 flex justify-end">
              {verificSent && verificData?.sent ? (
                <p className="text-[11px] text-success">Code sent — check your inbox</p>
              ) : verificSent && !verificData?.sent ? (
                <p className="text-[11px] text-text-subtle">Try again in {verificData?.retryAfter ?? 60}s</p>
              ) : (
                <button onClick={() => sendVerification()} disabled={sendingVerif} className="text-[11px] text-primary underline underline-offset-2 disabled:opacity-50">
                  {sendingVerif ? 'Sending…' : 'Resend verification'}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </InfoCard>
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

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB'); return }
    setError('')
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(file))
    setPendingBlob(file)
    e.target.value = ''
  }

  async function handleSave() {
    if (!pendingBlob) { onClose(); return }
    let public_id: string
    try {
      const result = await uploadImage(pendingBlob)
      public_id = result.public_id
    } catch {
      // useUploadImage already shows a toast on upload failure
      return
    }
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
  }

  return (
    <div className="space-y-5">
      {/* Preview */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob URL from FileReader, cannot use next/image
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

// ─── Contact card ─────────────────────────────────────────────────────────────

function ContactCard({ me }: { me: ReturnType<typeof useMe>['data'] }) {
  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [selectedAddress, setSelectedAddress] = useState<{ address: string; state: string | null } | null>(null)
  const [saveError, setSaveError] = useState('')
  const { mutate, isPending } = useUpdateProfile()

  function startEdit() {
    setPhone(me?.phone ?? '')
    setSelectedAddress(me?.address ? { address: me.address, state: null } : null)
    setPhoneError('')
    setSaveError('')
    setEditing(true)
  }

  function cancel() { setEditing(false); setPhoneError(''); setSaveError('') }

  function save() {
    const trimmedPhone = phone.trim()
    if (trimmedPhone && trimmedPhone.length > 30) { setPhoneError('Phone must be 30 characters or less'); return }
    setPhoneError('')
    setSaveError('')
    mutate(
      { phone: trimmedPhone || undefined, address: selectedAddress?.address || undefined, address_state: selectedAddress?.state || undefined },
      { onSuccess: () => setEditing(false), onError: e => setSaveError(e.message) }
    )
  }

  return (
    <InfoCard title="Contact" subtitle="Phone number and delivery address" editing={editing} onEdit={startEdit} onCancel={cancel} onSave={save} saving={isPending} delay={0.1}>
      {editing ? (
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Phone number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoFocus maxLength={30} placeholder="+234 800 000 0000" className={INPUT_CLS} />
            {phoneError && <p className="mt-1.5 text-xs text-error">{phoneError}</p>}
          </div>
          <PlacesAddressInput
            label="Delivery address"
            defaultValue={me?.address ?? ''}
            placeholder="Search for your delivery address"
            onSelect={result => setSelectedAddress({ address: result.formatted_address, state: result.state })}
            onClear={() => setSelectedAddress(null)}
            error={saveError}
          />
        </div>
      ) : (
        <>
          <InfoRow label="Phone" value={me?.phone ?? <span className="text-text-subtle">—</span>} />
          <InfoRow label="Delivery address" value={me?.address ?? <span className="text-text-subtle">—</span>} />
        </>
      )}
    </InfoCard>
  )
}

// ─── Security & Payouts card ──────────────────────────────────────────────────

function SecurityCard({ me }: { me: ReturnType<typeof useMe>['data'] }) {
  const [editing, setEditing] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const [success, setSuccess] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { mutate, isPending } = useChangePassword()

  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current) } }, [])

  const stripeConnected = me?.stripe_onboarding_complete

  function startEdit() { setCurrent(''); setNext(''); setConfirm(''); setErrors({}); setSuccess(false); setEditing(true) }
  function cancel() { setEditing(false); setErrors({}) }
  function save() {
    const errs: typeof errors = {}
    if (!current) errs.current = 'Required'
    if (next.trim().length < 8) errs.next = 'Must be at least 8 characters'
    if (next !== confirm) errs.confirm = 'Passwords do not match'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    mutate(
      { current_password: current, new_password: next },
      {
        onSuccess: () => { setSuccess(true); timerRef.current = setTimeout(() => setEditing(false), 1500) },
        onError: err => setErrors({ current: err.message.toLowerCase().includes('current') ? 'Current password is incorrect' : err.message }),
      }
    )
  }

  return (
    <InfoCard
      title="Security & Payouts"
      subtitle="Password and payout settings"
      editing={editing}
      onEdit={startEdit}
      onCancel={success ? undefined : cancel}
      onSave={success ? undefined : save}
      saving={isPending}
      delay={0.15}
    >
      {editing ? (
        <div className="px-5 py-4">
          {success ? (
            <div className="flex items-center gap-2 py-1 text-success">
              <CheckCircle2 size={15} strokeWidth={2} />
              <span className="text-sm font-semibold">Password updated</span>
            </div>
          ) : (
            <div className="space-y-4">
              <PasswordField label="Current password" value={current} onChange={setCurrent} error={errors.current} />
              <PasswordField label="New password" value={next} onChange={setNext} error={errors.next} />
              <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} error={errors.confirm} />
            </div>
          )}
        </div>
      ) : (
        <>
          <InfoRow label="Password" value="••••••••" />
          <div className="flex items-center justify-between px-5 py-3.5 gap-4">
            <span className="text-sm text-text-muted shrink-0">Payouts</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-text">{stripeConnected ? 'Stripe connected' : 'Not connected'}</span>
              <Link href="/dashboard/billing" className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors shrink-0">
                {stripeConnected ? 'Manage' : 'Set up'}
              </Link>
            </div>
          </div>
        </>
      )}
    </InfoCard>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data: me } = useMe()
  const [avatarOpen, setAvatarOpen] = useState(false)

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-5">
        <h1 className="text-2xl font-bold text-text tracking-tight">Profile</h1>
        <p className="text-sm text-text-muted mt-1">Manage your account information and security.</p>
      </motion.div>

      <div className="flex gap-5 items-start">
        <ProfileSidebar me={me} onEditAvatar={() => setAvatarOpen(true)} />
        <div className="flex-1 space-y-4">
          <PersonalInfoCard me={me} />
          <ContactCard me={me} />
          <SecurityCard me={me} />
        </div>
      </div>

      <Modal open={avatarOpen} onClose={() => setAvatarOpen(false)} title="Change photo">
        <AvatarForm currentAvatarUrl={me?.avatar_url} currentName={me?.name} onClose={() => setAvatarOpen(false)} />
      </Modal>
    </div>
  )
}
