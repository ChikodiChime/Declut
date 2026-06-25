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
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const onTranscriptRef = useRef(onTranscript)
  // Guards against InvalidStateError on rapid double-tap
  const isStarting = useRef(false)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR: typeof SpeechRecognition | undefined =
      window.SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) return
    setSupported(true)
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  // Stop recognition when AI starts responding mid-session
  useEffect(() => {
    if (disabled && isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    }
  }, [disabled, isListening])

  if (!supported) return null

  function createRecognition(): SpeechRecognition {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR: typeof SpeechRecognition =
      window.SpeechRecognition ?? (window as any).webkitSpeechRecognition
    let mounted = true

    const r = new SR()
    r.continuous = false
    r.interimResults = false
    r.lang = 'en-NG'

    r.onresult = (e: SpeechRecognitionEvent) => {
      if (!mounted) return
      const transcript = Array.from(e.results)
        .map((result) => result[0].transcript)
        .join('')
      onTranscriptRef.current(transcript)
    }

    r.onend = () => {
      // NOTE: Some Safari versions fire onend before onresult. If transcripts
      // go missing on Safari, buffer the result in onresult and flush it here.
      mounted = false
      isStarting.current = false
      setIsListening(false)
    }

    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (process.env.NODE_ENV === 'development') console.warn('[VoiceMicButton] speech error:', e.error)
      mounted = false
      isStarting.current = false
      setIsListening(false)
    }

    return r
  }

  function toggle() {
    if (disabled) return
    if (isListening) {
      recognitionRef.current?.stop()
    } else {
      // Guard against InvalidStateError on rapid double-tap
      if (isStarting.current) return
      isStarting.current = true

      // Re-instantiate on each start — reusing a post-error instance can leave
      // Chrome in an unrecoverable state (e.g. after not-allowed/audio-capture).
      const r = createRecognition()
      recognitionRef.current = r
      try {
        r.start()
        setIsListening(true)
      } catch {
        isStarting.current = false
      }
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
          ? 'text-red-500 bg-red-500/10'
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
