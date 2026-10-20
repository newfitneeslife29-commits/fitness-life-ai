// Animated demos (short silent loops) for exercises that have one: drop
// "<exercise id>.mp4" into src/assets/motion (scripts/import-motion.mjs
// converts bought GIFs). Exercises without one keep their two photos.
// "<exercise id>.mujer.mp4" is a woman doing it: women see that one.
const files = import.meta.glob('../assets/motion/*.mp4', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const BY_ID = new Map(Object.entries(files).map(([path, url]) => [path.replace(/^.*\/|\.mp4$/g, ''), url]));

// Set from the profile on every render of the app (App.tsx).
let female = false;
export const showFemaleDemos = (on: boolean) => {
    female = on;
};

// The demo's file name: the woman's version when there is one and it applies.
export const motionKey = (id: string) => (female && BY_ID.has(`${id}.mujer`) ? `${id}.mujer` : id);

export const exerciseMotion = (id: string): string | undefined => BY_ID.get(motionKey(id));
