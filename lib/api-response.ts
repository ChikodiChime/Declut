export function ok(data: unknown, status = 200): Response {
  return Response.json({ data }, { status })
}

export function list(
  items: unknown[],
  meta: { total: number; limit: number; offset: number },
  status = 200
): Response {
  return Response.json({ data: items, meta }, { status })
}

export function err(
  message: string,
  code: string,
  status: number,
  extra?: Record<string, unknown>
): Response {
  return Response.json({ error: { message, code, ...extra } }, { status })
}
