import { err } from '@/lib/api-response'

export async function POST() {
  return err('Dispatcher accounts are created by an administrator.', 'GONE', 410)
}
