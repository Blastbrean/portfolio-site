import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const birthDate = process.env.PRIVATE_BIRTH_DATE;
const forbidden = ['PRIVATE_BIRTH_DATE', ...(birthDate ? [birthDate] : [])];
async function inspect(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) await inspect(path);
    else {
      const contents = await readFile(path);
      if (forbidden.some(value => contents.includes(Buffer.from(value)))) {
        // Do not print private values or file contents to build logs.
        throw new Error('Private age information found in deployment output; publishing stopped.');
      }
    }
  }
}
await inspect('dist');
console.log('Privacy check passed: no private birth-date setting or value in published files.');
