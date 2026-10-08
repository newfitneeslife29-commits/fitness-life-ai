// Random id. crypto.randomUUID only exists in secure contexts (https or
// localhost), so opening the app over http on a LAN needs a fallback.
export const uid = (): string =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
