import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(await readFile(join(root, 'catalog.json'), 'utf8'));
const seen = new Set();

if (catalog.catalogVersion !== 1) {
  throw new Error(`Unsupported catalog version: ${catalog.catalogVersion}`);
}

for (const type of ['themes', 'attunements']) {
  const listedIds = new Set((catalog[type] ?? []).map((entry) => entry.id));
  const directoryIds = (await readdir(join(root, type), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => entry.name);
  for (const id of directoryIds) {
    if (!listedIds.has(id)) throw new Error(`${type}/${id} is not listed in catalog.json`);
  }

  for (const entry of catalog[type] ?? []) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id)) {
      throw new Error(`Invalid ${type} ID: ${entry.id}`);
    }
    if (!/^\d+\.\d+\.\d+$/.test(entry.version)) {
      throw new Error(`Invalid version for ${entry.id}: ${entry.version}`);
    }
    if (entry.path !== `${type}/${entry.id}`) {
      throw new Error(`${entry.id} must use the canonical path ${type}/${entry.id}`);
    }
    const key = `${type}:${entry.id}`;
    if (seen.has(key)) throw new Error(`Duplicate catalog entry: ${key}`);
    seen.add(key);

    const packageRoot = resolve(root, entry.path);
    if (!packageRoot.startsWith(`${resolve(root)}/`)) {
      throw new Error(`Package escapes catalog root: ${entry.path}`);
    }
    const manifest = JSON.parse(await readFile(join(packageRoot, 'manifest.json'), 'utf8'));
    let references;
    if (type === 'themes') {
      if (!manifest.name || !manifest.tokens || !manifest.baseLayout || !Object.keys(manifest.adapters ?? {}).length) {
        throw new Error(`${entry.id} has an incomplete theme manifest`);
      }
      references = [
        manifest.preview,
        manifest.tokens,
        manifest.baseLayout,
        ...Object.values(manifest.adapters).map((adapter) => adapter.source),
      ];
    } else {
      if (manifest.manifestVersion !== 2) throw new Error(`${entry.id} must use manifestVersion 2`);
      if (manifest.patches || !manifest.targets || !Object.keys(manifest.targets).length) {
        throw new Error(`${entry.id} must declare canonical targets`);
      }
      if (!manifest.name || !manifest.description || !manifest.preview) {
        throw new Error(`${entry.id} needs name, description, and preview`);
      }
      references = [manifest.preview];
      for (const [appName, target] of Object.entries(manifest.targets)) {
        if (target.source || !Array.isArray(target.styles) || !target.styles.length) {
          throw new Error(`${entry.id} (${appName}) must declare a non-empty styles array`);
        }
        if (!target.intent || !target.bindings || !Object.keys(target.bindings).length) {
          throw new Error(`${entry.id} (${appName}) needs intent and semantic bindings`);
        }
        for (const [bindingName, binding] of Object.entries(target.bindings)) {
          if (typeof binding.role !== 'string' || typeof binding.required !== 'boolean') {
            throw new Error(`${entry.id} (${appName}.${bindingName}) has an invalid binding`);
          }
        }
        for (const style of target.styles) {
          if (!style.endsWith('.css')) throw new Error(`${entry.id} style must end in .css: ${style}`);
          const css = await readFile(resolve(packageRoot, style), 'utf8');
          if (css.includes('@attune-script')) {
            throw new Error(`${entry.id} must keep scripts in separate .js files`);
          }
        }
        if (target.script && !target.script.endsWith('.js')) {
          throw new Error(`${entry.id} script must end in .js: ${target.script}`);
        }
        references.push(...target.styles, target.script);
      }
    }

    for (const reference of references.filter(Boolean)) {
      const target = resolve(root, reference.startsWith(`${type}/`) ? reference : join(entry.path, reference));
      if (!target.startsWith(`${resolve(root)}/`)) {
        throw new Error(`${entry.id} reference escapes catalog root: ${reference}`);
      }
      await access(target).catch(() => {
        throw new Error(`${entry.id} is missing ${relative(root, target)}`);
      });
    }
  }
}

console.log(`Validated ${seen.size} catalog packages.`);
