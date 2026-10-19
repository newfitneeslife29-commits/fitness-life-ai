// Animated demos (short silent loops) for exercises that have one: drop
// "<exercise id>.mp4" into src/assets/motion (scripts/import-motion.mjs
// converts bought GIFs). Exercises without one keep their two photos.
const files = import.meta.glob('../assets/motion/*.mp4', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const BY_ID = new Map(Object.entries(files).map(([path, url]) => [path.replace(/^.*\/|\.\w+$/g, ''), url]));

export const exerciseMotion = (id: string): string | undefined => BY_ID.get(id);
