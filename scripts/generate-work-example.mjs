import { chromium } from 'playwright';
import { mkdir, copyFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Local, made-up media for the work-entry template. No external assets.
const output = resolve('public/media/work');
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1, recordVideo: { dir: output, size: { width: 960, height: 540 } } });
  const page = await context.newPage();
  await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Dummy work sample</title><style>
    *{box-sizing:border-box}body{margin:0;padding:44px;background:#242322;color:#f3ede6;font:18px Arial,Helvetica,sans-serif}header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #625b55;padding-bottom:20px}small{color:#d6c5ed;font-size:14px}h1{font-size:30px;margin:0}p{color:#c5bbb2;line-height:1.5}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:30px}.panel{background:#302e2c;border:1px solid #625b55;padding:24px;border-radius:8px}h2{font-size:18px;margin:0 0 20px}.row{display:flex;justify-content:space-between;margin:18px 0}.row span:last-child{color:#bddbd4}.track{height:12px;background:#4c4644;border-radius:6px;overflow:hidden;margin:24px 0}.fill{height:100%;width:0;background:#d6c5ed;animation:load 4s ease-in-out forwards}.log{font:16px/1.9 Arial,Helvetica,sans-serif;color:#c5bbb2}.note{margin-top:28px;font-size:14px}@keyframes load{to{width:100%}}
    </style><header><h1>Task dashboard</h1><small>DUMMY WORK SAMPLE</small></header><p>A made-up dashboard for showing images and video on the Work page.</p><div class="grid"><section class="panel"><h2>Sample jobs</h2><div class="row"><span>Import data</span><span>Done</span></div><div class="row"><span>Check records</span><span>Done</span></div><div class="row"><span>Build report</span><span>Running</span></div><div class="track"><div class="fill"></div></div></section><section class="panel"><h2>Example output</h2><div class="log">01 · Read sample data<br>02 · Validate records<br>03 · Create a report<br>04 · Save the result</div></section></div><p class="note">Placeholder content. No real project data. Video has no audio.</p></html>`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(output, 'example-poster.png') });
  await page.waitForTimeout(4700);
  await page.screenshot({ path: resolve(output, 'example-dashboard.png') });
  const video = page.video();
  await context.close();
  const temporary = await video.path();
  await copyFile(temporary, resolve(output, 'example-demo.webm'));
  await unlink(temporary);
  await writeFile(resolve(output, 'example-demo.vtt'), 'WEBVTT\n\n00:00.000 --> 00:06.000\nDummy task dashboard. The progress bar fills while sample jobs run. No audio.\n');
} finally { await browser.close(); }
console.log('Generated dummy dashboard image, video, poster, and captions in public/media/work/.');
