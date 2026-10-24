import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';

const artists = JSON.parse(await readFile(new URL('../src/data/music-artists.json', import.meta.url)));
const destination = new URL('../src/data/music-catalog.json', import.meta.url);
const folder = new URL('../public/media/music/', import.meta.url);
await mkdir(folder, { recursive: true });
let previous = [];
try { previous = JSON.parse(await readFile(destination)); } catch {}
const automatic = process.argv.includes('--if-needed');
const fresh = Date.now() - (await stat(destination).catch(() => ({ mtimeMs: 0 }))).mtimeMs < 7 * 24 * 60 * 60 * 1000;
if (automatic && fresh && JSON.stringify(previous.map(entry => entry.artist)) === JSON.stringify(artists)) {
  console.log('Music catalog is cached and up to date.');
  process.exit(0);
}
const normalize = value => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const catalog = [];
let failed = false;
for (const artist of artists) {
  const existing = previous.find(entry => entry.artist === artist);
  if (automatic && fresh && existing) { catalog.push(existing); continue; }
  try {
    const search = new URL('https://itunes.apple.com/search');
    search.search = new URLSearchParams({ term: artist, entity: 'musicArtist', limit: '10' });
    const response = await fetch(search, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Search returned ${response.status}`);
    const matches = await response.json();
    const match = matches.results.find(result => normalize(result.artistName) === normalize(artist));
    if (!match) throw new Error('Artist not found');
    const lookup = await fetch(`https://itunes.apple.com/lookup?id=${match.artistId}&entity=album&limit=200`, { signal: AbortSignal.timeout(20000) });
    if (!lookup.ok) throw new Error(`Album lookup returned ${lookup.status}`);
    const { results } = await lookup.json();
    const seen = new Set();
    const albums = results.filter(album => {
      if (album.collectionType !== 'Album' || normalize(album.artistName) !== normalize(artist) || album.trackCount < 5) return false;
      const key = normalize(album.collectionName.replace(/\([^)]*\)|\[[^\]]*\]/g, ''));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (!albums.length) throw new Error('No matching albums found');
    const cached = [];
    // Small, bounded batches; downloaded art is served locally, not fetched by visitors.
    for (let i = 0; i < albums.length; i += 4) {
      cached.push(...await Promise.all(albums.slice(i, i + 4).map(async album => {
        const file = `${album.collectionId}.jpg`;
        const path = new URL(file, folder);
        try { await readFile(path); } catch {
          const artwork = album.artworkUrl100.replace('100x100bb', '200x200bb');
          const image = await fetch(artwork, { signal: AbortSignal.timeout(20000) });
          if (!image.ok) throw new Error(`Artwork returned ${image.status}`);
          await writeFile(path, Buffer.from(await image.arrayBuffer()));
        }
        return { title: album.collectionName, image: `/media/music/${file}`, url: album.collectionViewUrl };
      })));
    }
    catalog.push({ artist, albums: cached });
    console.log(`${artist}: ${cached.length} albums cached`);
  } catch (error) {
    const fallback = previous.find(entry => entry.artist === artist);
    if (fallback) catalog.push(fallback);
    if (!automatic) failed = true;
    console.error(`${artist}: ${error.message}${fallback ? ' (kept previous catalog)' : ''}`);
  }
}
await writeFile(destination, JSON.stringify(catalog, null, 2) + '\n');
if (failed) process.exitCode = 1;
