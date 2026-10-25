import { readFile, writeFile, readdir, mkdir, access, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import sharp from 'sharp';
import { parse } from 'yaml';

const root = resolve('public');
const output = resolve('public/media/work/optimized');
const manifestPath = resolve('src/data/work-media.json');
await mkdir(output, { recursive: true });
let previous = {};
try { previous = JSON.parse(await readFile(manifestPath, 'utf8')); } catch {}
const sources = new Set();
for (const file of await readdir('src/work')) {
  if (!file.endsWith('.md')) continue;
  const text = await readFile(join('src/work', file), 'utf8');
  const data = parse(text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '');
  if (!data || data.draft === true) continue;
  for (const source of [data.image, data.videoPoster]) if (source) sources.add(source);
}
let encoder;
async function ffmpeg() {
  if (encoder) return encoder;
  if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0) return encoder = 'ffmpeg';
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || (process.platform === 'darwin' ? join(homedir(), 'Library/Caches/ms-playwright') : process.platform === 'win32' ? join(process.env.LOCALAPPDATA || homedir(), 'ms-playwright') : join(homedir(), '.cache/ms-playwright'));
  const find = async () => {
    const dirs = await readdir(cache).catch(() => []);
    for (const dir of dirs.filter(name => name.startsWith('ffmpeg-')).sort().reverse()) {
      for (const name of ['ffmpeg-mac', 'ffmpeg-linux', 'ffmpeg-win64.exe']) {
        const file = join(cache, dir, name);
        if (existsSync(file)) return file;
      }
    }
  };
  encoder = await find();
  if (!encoder) {
    const result = spawnSync(process.execPath, [resolve('node_modules/playwright/cli.js'), 'install', 'ffmpeg'], { stdio: 'inherit' });
    if (result.status !== 0) throw new Error('Could not install the work-preview encoder. Run pnpm exec playwright install ffmpeg.');
    encoder = await find();
  }
  if (!encoder) throw new Error('Work-preview encoder not found.');
  return encoder;
}
async function makePreview(file, metadata, target, full = false) {
  const fps = full ? 24 : 12;
  const duration = Math.min(full ? Infinity : 4000, Math.max(1000, (metadata.delay ?? []).reduce((sum, delay) => sum + Math.max(delay, 20), 0)));
  const frames = Math.ceil(duration / 1000 * fps);
  const delays = Array.from({ length: metadata.pages }, (_, i) => Math.max(metadata.delay?.[i] ?? 100, 20));
  const total = delays.reduce((sum, delay) => sum + delay, 0);
  const child = spawn(await ffmpeg(), ['-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', 'mjpeg', '-i', 'pipe:0', '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-deadline', 'realtime', '-cpu-used', '6', '-y', target], { stdio: ['pipe', 'ignore', 'pipe'] });
  let errors = '';
  child.stdin.on('error', () => {});
  child.stderr.on('data', chunk => { errors = (errors + chunk).slice(-2000); });
  const finished = new Promise((resolve, reject) => { child.on('error', reject); child.on('close', code => code === 0 ? resolve() : reject(new Error(`Preview encoding failed: ${errors}`))); });
  // Observe errors immediately while frames are being prepared.
  finished.catch(() => {});
  try {
    for (let i = 0; i < frames; i++) {
      let time = (i * 1000 / fps) % total;
      let page = 0;
      while (page < delays.length - 1 && time >= delays[page]) time -= delays[page++];
      const jpeg = await sharp(file, { page, pages: 1 }).rotate().resize({ width: full ? 1280 : 640, height: full ? 1280 : 640, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#242322' }).jpeg({ quality: 82 }).toBuffer();
      if (!child.stdin.write(jpeg)) await once(child.stdin, 'drain');
    }
    child.stdin.end();
    await finished;
  } catch (error) { child.kill(); throw error; }
}
const manifest = {};
let prepared = 0;
for (const source of sources) {
  if (typeof source !== 'string' || !source.startsWith('/') || source.startsWith('//')) throw new Error('Work images must be local paths in public/.');
  const file = resolve(root, '.' + source);
  if (!file.startsWith(root + sep)) throw new Error('Work image path is outside public/.');
  const bytes = await readFile(file);
  const hash = createHash('sha256').update('work-media-v3').update(bytes).digest('hex').slice(0, 16);
  const cached = previous[source];
  const paths = cached ? [cached.small, cached.poster, cached.large, cached.full, cached.preview, cached.animation].filter(Boolean) : [];
  if (cached?.hash === hash && (await Promise.all(paths.map(path => access(resolve(root, '.' + path)).then(() => true, () => false)))).every(Boolean)) {
    manifest[source] = cached;
    continue;
  }
  const metadata = await sharp(file, { animated: true }).metadata();
  const width = metadata.autoOrient?.width ?? metadata.width;
  const height = metadata.pageHeight ?? metadata.autoOrient?.height ?? metadata.height;
  if (!width || !height) throw new Error(`Cannot read dimensions for ${source}`);
  const record = { hash, width, height, animated: (metadata.pages ?? 1) > 1 };
  for (const [key, size] of [['small', 320], ['poster', 640], ['large', 1280], ['full', 1600]]) {
    const actualWidth = Math.min(size, width);
    const name = `${hash}-${actualWidth}.webp`;
    if (!existsSync(join(output, name))) await sharp(file, { page: 0, pages: 1 }).rotate().resize({ width: actualWidth, withoutEnlargement: true }).webp({ quality: 80 }).toFile(join(output, name));
    record[key] = `/media/work/optimized/${name}`;
  }
  if (record.animated) {
    const name = `${hash}-preview.webm`;
    await makePreview(file, metadata, join(output, name));
    record.preview = `/media/work/optimized/${name}`;
    const duration = (metadata.delay ?? []).reduce((sum, delay) => sum + Math.max(delay, 20), 0);
    if (duration > 4000) {
      const fullName = `${hash}-animation.webm`;
      await makePreview(file, metadata, join(output, fullName), true);
      record.animation = `/media/work/optimized/${fullName}`;
    } else record.animation = record.preview;
  }
  manifest[source] = record;
  prepared++;
}
const used = new Set(Object.values(manifest).flatMap(record => Object.values(record).filter(value => typeof value === 'string' && value.startsWith('/media/work/optimized/')).map(path => path.split('/').pop())));
for (const file of await readdir(output)) {
  if (/^[a-f0-9]{16}-(?:\d+|preview|animation)\.(?:webp|webm)$/.test(file) && !used.has(file)) await unlink(join(output, file));
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Work media: ${prepared} prepared, ${sources.size - prepared} cached.`);
