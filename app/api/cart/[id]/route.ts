import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  const { id } = await params

  if (authUser) {
    const { error } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('id', id)
      .eq('user_id', authUser.id)

    if (error) return err('Failed to remove item from cart', 'DB_ERROR', 500)
  }

  return ok({ ok: true })
}
