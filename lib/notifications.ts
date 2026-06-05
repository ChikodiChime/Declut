import { supabaseAdmin } from '@/lib/supabase'

type NotificationType = 'order_update' | 'claim_request' | 'payout_update'

interface NotificationInput {
  user_id: string
  type: NotificationType
  title: string
  body: string
  link: string
}

export async function createNotification(input: NotificationInput): Promise<void> {
  const { error } = await supabaseAdmin.from('notifications').insert(input)
  if (error) console.error('Failed to insert notification:', error)
}
