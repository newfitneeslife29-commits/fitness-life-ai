// A short, readable reason for an error from Supabase, a plugin or fetch.
export const errorText = (e: unknown): string => {
    if (e && typeof e === 'object') {
        const { message, code } = e as { message?: unknown; code?: unknown };
        const text = typeof message === 'string' && message ? message : String(e);
        return (typeof code === 'string' && code && !text.includes(code) ? `${code}: ${text}` : text).slice(0, 160);
    }
    return String(e).slice(0, 160);
};
