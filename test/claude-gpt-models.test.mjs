import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const packageRoot = join(root, 'attunements', 'claude-gpt-models');
const manifest = JSON.parse(await readFile(join(packageRoot, 'manifest.json'), 'utf8'));
const stylesheet = await readFile(
  join(packageRoot, 'apps', 'claude-gpt-models.css'),
  'utf8',
);
const preview = await readFile(join(packageRoot, 'preview.png'));

test('Claude GPT Models is a declarative first-party bridge attunement', () => {
  const target = manifest.targets.Claude;

  assert.equal(manifest.manifestVersion, 2);
  assert.match(manifest.description, /Keep Claude Desktop's first-party Claude models/);
  assert.deepEqual(target.styles, ['apps/claude-gpt-models.css']);
  assert.equal('script' in target, false, 'the signed Claude renderer must not be monkey-patched');
  assert.match(target.intent, /without modifying Claude's bundle or renderer runtime/);
  assert.equal(target.bindings.modelPicker.role, 'claude.modelPicker');
  assert.match(stylesheet, /data-attune-host-roles~="claude\.modelPicker"/);
  assert.doesNotMatch(stylesheet, /@attune-(?:preload-)?script/);
});

test('the catalog uses the supplied Claude model-picker PNG as its preview', () => {
  assert.equal(manifest.preview, 'preview.png');
  assert.deepEqual([...preview.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(preview.readUInt32BE(16), 1016);
  assert.equal(preview.readUInt32BE(20), 722);
});
