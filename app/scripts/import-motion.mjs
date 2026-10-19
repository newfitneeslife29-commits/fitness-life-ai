// Turns bought exercise GIFs into small looping videos for the app:
//   node scripts/import-motion.mjs <folder with GIFs> <map.json>
// map.json is { "<gif file name>": "<exercise id>" } (ids in src/data/exercises.ts).
// Each GIF becomes src/assets/motion/<id>.mp4 (H.264, plays on iPhone,
// Android and the web), usually a tenth of the GIF's size.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const [folder, mapFile] = process.argv.slice(2);
if (!folder || !mapFile) {
    console.error('Usage: node scripts/import-motion.mjs <folder> <map.json>');
    process.exit(1);
}
const map = JSON.parse(readFileSync(mapFile, 'utf8'));
const out = path.join(import.meta.dirname, '..', 'src', 'assets', 'motion');
let total = 0;
for (const [file, id] of Object.entries(map)) {
    const input = path.join(folder, file);
    if (!existsSync(input)) {
        console.warn(`missing: ${file}`);
        continue;
    }
    const target = path.join(out, `${id}.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', input,
        '-vf', "fps=24,scale='min(720,iw)':-2:flags=lanczos,format=yuv420p",
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-movflags', '+faststart', '-an', target]);
    const kb = Math.round(statSync(target).size / 1024);
    total += kb;
    console.log(`${id}: ${kb} KB`);
}
console.log(`total: ${Math.round(total / 1024)} MB`);
