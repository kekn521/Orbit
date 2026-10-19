import { resolve } from 'node:path';
import { Store } from './database.ts';
import { seed } from './seed.ts';
const store = new Store(resolve(process.env.DATA_DIR || 'data', 'orbit.sqlite'));
try {
  console.log(
    seed(store) ? 'Labeled demo records created.' : 'Workspace contains records; seed skipped.',
  );
} finally {
  store.close();
}
