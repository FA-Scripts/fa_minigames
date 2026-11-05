import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const lua = readFileSync(new URL('client/main.lua', root), 'utf8');
const presets = {};
for (const [, game, body] of lua.matchAll(/^    (\w+) = \{\r?\n(.*?)^    \}/gms)) {
  const variants = {};
  for (const [, preset, values] of body.matchAll(/(easy|medium|hard) = \{([^}]+)\}/g)) {
    variants[preset] = Object.fromEntries([...values.matchAll(/(\w+) = (\d+)/g)].map(([, key, value]) => [key, Number(value)]));
  }
  if (Object.keys(variants).length) presets[game] = variants;
}
if (Object.keys(presets).length !== 13) throw new Error('Expected presets for thirteen games');

const locales = {};
for (const name of ['en', 'pl']) {
  const source = readFileSync(new URL(`locales/${name}.lua`, root), 'utf8').replace(/\r/g, '');
  locales[name] = Object.fromEntries([...source.matchAll(/^    (\w+) = '((?:[^'\\]|\\.)*)',?$/gm)]
    .map(([, key, value]) => [key, value.replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\\\/g, '\\')]));
}
for (const key of Object.keys(locales.en)) {
  if (!(key in locales.pl)) throw new Error(`Missing Polish translation: ${key}`);
}

writeFileSync(new URL('web/src/preview-data.json', root), `${JSON.stringify({ presets, locales }, null, 2)}\n`);
