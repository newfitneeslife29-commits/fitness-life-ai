// RevenueCat REST API v1, GET /v1/subscribers/{app_user_id}: each entitlement
// has an `expires_date` (ISO date, or null for lifetime access).
export const hasEntitlement = (body: unknown, entitlement: string, now = Date.now()) => {
  const entitlements = (body as { subscriber?: { entitlements?: Record<string, { expires_date?: string | null }> } })
    ?.subscriber?.entitlements;
  const info = entitlements?.[entitlement];
  if (!info) return false;
  return info.expires_date == null || Date.parse(info.expires_date) > now;
};
