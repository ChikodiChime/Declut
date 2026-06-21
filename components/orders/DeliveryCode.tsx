'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { KeyRound, Check, Copy } from 'lucide-react'

export function DeliveryCode({ code, deliveryType }: { code: string; deliveryType: string }) {
  const [copied, setCopied] = useState(false)

  function copyCode() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #3730a3, #6366f1)' }} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={13} strokeWidth={2} style={{ color: '#3730a3' }} />
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#3730a3' }}>
            {deliveryType === 'delivery' ? 'Delivery code' : 'Pickup code'}
          </p>
        </div>
        <div className="flex gap-2 mb-4 flex-wrap">
          {code.split('').map((char, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
              className="flex items-center justify-center rounded-xl font-mono font-bold"
              style={{ width: 48, height: 56, fontSize: 26, background: 'rgba(55,48,163,0.06)', border: '1.5px solid rgba(55,48,163,0.15)', color: '#3730a3' }}
            >
              {char}
            </motion.div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-text-muted leading-relaxed flex-1 min-w-[140px]">
            {deliveryType === 'delivery' ? 'Share with the dispatcher on arrival.' : 'Show to the seller when collecting.'}
          </p>
          <motion.button
            onClick={copyCode}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all"
            style={{
              background: copied ? 'rgba(5,150,105,0.08)' : 'rgba(55,48,163,0.08)',
              border: `1px solid ${copied ? 'rgba(5,150,105,0.2)' : 'rgba(55,48,163,0.2)'}`,
              color: copied ? '#059669' : '#3730a3',
            }}
          >
            {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2} />}
            {copied ? 'Copied!' : 'Copy'}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
