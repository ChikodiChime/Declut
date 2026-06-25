'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic } from 'lucide-react'

interface VoiceMicButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

export function VoiceMicButton({ onTranscript, disabled }: VoiceMicButtonProps) {
  const [supported, setSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const onTranscriptRef = useRef(onTranscript)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) return
    setSupported(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-NG'

    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join('')
      onTranscriptRef.current(transcript)
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognitionRef.current = recognition
    return () => recognition.abort()
  }, [])

  if (!supported) return null

  function toggle() {
    if (disabled) return
    const r = recognitionRef.current
    if (!r) return
    if (isListening) {
      r.stop()
    } else {
      r.start()
      setIsListening(true)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-label={isListening ? 'Stop recording' : 'Start voice input'}
      className={`relative p-2.5 rounded-xl transition-all shrink-0 disabled:opacity-40 ${
        isListening
          ? 'text-red-500'
          : 'bg-background border border-border text-text-muted hover:text-text hover:border-border-strong'
      }`}
    >
      {isListening && (
        <span className="absolute inset-0 rounded-xl animate-ping bg-red-400/30" />
      )}
      <Mic size={15} className="relative" />
    </button>
  )
}
