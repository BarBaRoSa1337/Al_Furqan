import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { importQuranStructureSnapshot } from '../src/lib/content/structureImporter';

const fixturePath = resolve(process.cwd(), process.argv[2] ?? 'src/content/structure/hafs/full.json');
const snapshot: unknown = JSON.parse(readFileSync(fixturePath, 'utf8'));
const imported = importQuranStructureSnapshot(snapshot, {
  hash: value => createHash('sha256').update(value).digest('hex'),
});

console.log(`Validated ${imported.structureIndex.length} ayah memberships and ${imported.divisions.length} division ranges from ${fixturePath}`);
