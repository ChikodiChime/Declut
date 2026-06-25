import { supabaseAdmin } from '@/lib/supabase'

type NotificationType = 'order_update' | 'claim_request' | 'payout_update' | 'request_fulfilled'

interface NotificationInput {
  user_id: string
  type: NotificationType
  title: string
  body: string
  link: string
  metadata?: Record<string, unknown>
}

export async function createNotification(input: NotificationInput): Promise<void> {
  const { error } = await supabaseAdmin.from('notifications').insert(input)
  if (error) console.error('Failed to insert notification:', error)
}
