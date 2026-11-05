import * as fs from 'node:fs';
import { readFile as read } from 'node:fs/promises';
import client from 'example-client';
import type { Client } from 'example-client';
export type { Client };
export type Other = import('types-only').Other;
fs.readFileSync('omitted-input');
read('omitted-input');
client?.get?.('omitted-input');
export function shadowed(read: () => void) { read(); }
// Static inventory only. Never execute or install this fixture.
