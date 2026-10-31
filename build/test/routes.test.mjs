import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES, FILE_TO_PATH, sitePath } from '../lib/routes.mjs';

test('every prototype route maps back to its path', () => {
  for (const [path, file] of Object.entries(ROUTES)) assert.equal(FILE_TO_PATH[file], path);
});

test('sitePath rewrites prototype links and keeps query and hash', () => {
  assert.equal(sitePath('Main.dc.html'), '/');
  assert.equal(sitePath('./Cviceni.dc.html#videa'), '/cviceni/#videa');
  assert.equal(sitePath('Rozvrh.dc.html'), '/kurzy-a-lekce/');
  assert.equal(sitePath('Rozvrh.dc.html#zlin'), '/kurzy-a-lekce/#zlin');
  assert.equal(sitePath('Seminare.dc.html#chu'), '/akce/#chu');
  assert.equal(sitePath('OMne.dc.html?x=1'), '/o-mne/?x=1');
});

test('sitePath leaves other links alone and rejects unknown prototype files', () => {
  for (const h of ['tel:+4207732871113', 'mailto:tkadlcik@centrum.cz', 'https://www.gstaichi.org/', '#brokat', '/kontakt/', 'http://x.cz/a.dc.html']) assert.equal(sitePath(h), h);
  assert.throws(() => sitePath('Nope.dc.html'), /No route/);
});
