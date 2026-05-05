const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN_LENGTH = 8

interface SignupBody {
  email?: unknown
  password?: unknown
  name?: unknown
  account_type?: unknown
}

export function validateSignupBody(body: SignupBody):
  | { valid: true; email: string; password: string; name: string | null; account_type: 'individual' | 'business' }
  | { error: string } {

  if (!body.email || typeof body.email !== 'string') return { error: 'email is required' }
  if (!EMAIL_REGEX.test(body.email)) return { error: 'email is invalid' }
  if (!body.password || typeof body.password !== 'string') return { error: 'password is required' }
  if (body.password.length < PASSWORD_MIN_LENGTH) return { error: `password must be at least ${PASSWORD_MIN_LENGTH} characters` }
  if (body.account_type !== 'individual' && body.account_type !== 'business') {
    return { error: 'account_type must be individual or business' }
  }

  return {
    valid: true,
    email: body.email.toLowerCase().trim(),
    password: body.password,
    name: typeof body.name === 'string' ? body.name.trim() || null : null,
    account_type: body.account_type,
  }
}
