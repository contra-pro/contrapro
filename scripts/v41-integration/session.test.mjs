import {test} from 'node:test';import assert from 'node:assert/strict';import {authenticates} from './session.mjs';import {readFile} from 'node:fs/promises';
test('control token comparison rejects absent, wrong and differently sized tokens',()=>{assert.equal(authenticates('abcd','abcd'),true);for(const token of [undefined,123,'ab','abce','éééé'])assert.equal(authenticates('abcd',token),false);});
test('session never spawns or detaches a child server and binds HTTP to loopback',async()=>{const source=await readFile(new URL('./session.mjs',import.meta.url),'utf8');assert.doesNotMatch(source,/\b(?:spawn|fork)\s*\(|detached\s*:/);assert.match(source,/http\.listen\(3330,'127\.0\.0\.1'/);assert.match(source,/open\(lockPath,'wx'\)/);});
console.log('Node executable:',process.execPath);
