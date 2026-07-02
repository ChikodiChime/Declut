import { describe, it, expect } from 'vitest'
import type { UIMessage } from 'ai'
import { stripStaleImageParts } from '@/app/api/chat/utils'

const makeTextMessage = (id: string, text: string): UIMessage => ({
  id,
  role: 'user',
  parts: [{ type: 'text', text }],
})

const makeImageMessage = (id: string, text: string): UIMessage => ({
  id,
  role: 'user',
  parts: [
    { type: 'text', text },
    { type: 'file', mediaType: 'image/png', url: 'data:image/png;base64,AAAA' },
  ],
})

describe('stripStaleImageParts', () => {
  it('returns messages unchanged when none contain a file part', () => {
    const messages = [makeTextMessage('1', 'hi'), makeTextMessage('2', 'hello')]
    expect(stripStaleImageParts(messages)).toEqual(messages)
  })

  it('keeps the file part on the only message that has one', () => {
    const messages = [makeTextMessage('1', 'hi'), makeImageMessage('2', 'what is this?')]
    const result = stripStaleImageParts(messages)
    expect(result[1].parts.some((part) => part.type === 'file')).toBe(true)
  })

  it('strips file parts from earlier messages, keeping their text parts', () => {
    const messages = [
      makeImageMessage('1', 'what is this?'),
      makeTextMessage('2', 'anything cheaper?'),
      makeImageMessage('3', 'and this one?'),
    ]
    const result = stripStaleImageParts(messages)
    expect(result[0].parts).toEqual([{ type: 'text', text: 'what is this?' }])
  })

  it('keeps the file part only on the most recent message that has one', () => {
    const messages = [
      makeImageMessage('1', 'first photo'),
      makeTextMessage('2', 'anything cheaper?'),
      makeImageMessage('3', 'second photo'),
    ]
    const result = stripStaleImageParts(messages)
    expect(result[0].parts.some((part) => part.type === 'file')).toBe(false)
    expect(result[2].parts.some((part) => part.type === 'file')).toBe(true)
  })

  it('leaves messages after the last image message untouched', () => {
    const messages = [
      makeImageMessage('1', 'a photo'),
      makeTextMessage('2', 'follow up'),
    ]
    const result = stripStaleImageParts(messages)
    expect(result[1]).toEqual(messages[1])
  })
})
