// Turns bought exercise GIFs into small looping videos for the app:
//   node scripts/import-motion.mjs <folder with GIFs> <map.json>
// map.json is { "<gif file name>": "<exercise id>" } (ids in src/data/exercises.ts).
// Each GIF becomes src/assets/motion/<id>.mp4 (H.264: iPhone, Android and
// the browsers), usually a tenth of the GIF's size, plus two stills for
// lists, thumbnails and players that can't play it:
// public/exercises/<id>-0.webp (start) and -1.webp (middle of the movement).
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
const stills = path.join(import.meta.dirname, '..', 'public', 'exercises');
const ffmpeg = (...args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
// Square demo centred on white, the 3:2 shape of the other exercise photos.
const still = (input, frame, target) => ffmpeg('-i', input,
    '-vf', `select=eq(n\\,${frame}),scale=-2:567:flags=lanczos,pad=850:567:(ow-iw)/2:0:white`,
    '-frames:v', '1', '-quality', '82', target);
let total = 0;
for (const [file, id] of Object.entries(map)) {
    const input = path.join(folder, file);
    if (!existsSync(input)) {
        console.warn(`missing: ${file}`);
        continue;
    }
    const target = path.join(out, `${id}.mp4`);
    const scale = "fps=24,scale='min(720,iw)':-2:flags=lanczos,format=yuv420p";
    ffmpeg('-i', input, '-vf', scale, '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-movflags', '+faststart', '-an', target);
    const frames = Number(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', input]).toString().trim()) || 2;
    still(input, 0, path.join(stills, `${id}-0.webp`));
    still(input, Math.floor(frames / 2), path.join(stills, `${id}-1.webp`));
    const kb = Math.round(statSync(target).size / 1024);
    total += kb;
    console.log(`${id}: ${kb} KB`);
}
console.log(`total: ${Math.round(total / 1024)} MB`);
