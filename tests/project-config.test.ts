import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {describe, it} from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('Tauri v2, Rust & GitHub Actions Integrity', () => {
  it('has package-lock.json and .npmrc so GitHub Actions npm cache and npm ci succeed', () => {
    assert.equal(fs.existsSync(path.join(ROOT, 'package-lock.json')), true);
    assert.equal(fs.existsSync(path.join(ROOT, '.npmrc')), true);
  });

  it('has valid Tauri v2 configuration and all declared bundle icons on disk', () => {
    const confPath = path.join(ROOT, 'src-tauri', 'tauri.conf.json');
    assert.equal(fs.existsSync(confPath), true);
    const conf = JSON.parse(fs.readFileSync(confPath, 'utf8'));

    assert.equal(conf.build.frontendDist, '../dist');
    assert.equal(conf.bundle.active, true);
    assert.ok(Array.isArray(conf.bundle.icon) && conf.bundle.icon.length >= 5);

    for (const iconRel of conf.bundle.icon) {
      const full = path.join(ROOT, 'src-tauri', iconRel);
      assert.equal(fs.existsSync(full), true, `Missing Tauri icon: ${iconRel}`);
      assert.ok(fs.statSync(full).size > 0, `Empty Tauri icon: ${iconRel}`);
    }
  });

  it('has Rust Cargo.toml with pure-Rust deps and mobile entry point in lib.rs', () => {
    const cargo = fs.readFileSync(path.join(ROOT, 'src-tauri', 'Cargo.toml'), 'utf8');
    assert.match(cargo, /name = "workdesk_lib"/);
    assert.match(cargo, /crate-type = \["staticlib", "cdylib", "rlib"\]/);
    assert.doesNotMatch(cargo, /openssl-sys/);

    const libRs = fs.readFileSync(path.join(ROOT, 'src-tauri', 'src', 'lib.rs'), 'utf8');
    assert.match(libRs, /#\[cfg_attr\(mobile, tauri::mobile_entry_point\)\]/);
    assert.match(libRs, /tauri_plugin_opener::init\(\)/);
    assert.match(libRs, /rng\.fill_bytes\(&mut verifier_bytes\)/);
  });

  it('has Tauri v2 capabilities granting core:default and opener:default', () => {
    const capPath = path.join(ROOT, 'src-tauri', 'capabilities', 'default.json');
    const cap = JSON.parse(fs.readFileSync(capPath, 'utf8'));
    assert.ok(cap.permissions.includes('core:default'));
    assert.ok(cap.permissions.includes('opener:default'));
  });

  it('configures GitHub Actions for Windows, Linux, Android, and automated tests', () => {
    const wf = fs.readFileSync(
      path.join(ROOT, '.github', 'workflows', 'build.yml'),
      'utf8',
    );
    assert.match(wf, /windows-latest/);
    assert.match(wf, /ubuntu-22\.04/);
    assert.match(wf, /x86_64-pc-windows-msvc/);
    assert.match(wf, /x86_64-unknown-linux-gnu/);
    assert.match(wf, /android-actions\/setup-android@v4/);
    assert.match(wf, /aarch64-linux-android/);
    assert.match(wf, /tauri android init --ci/);
    assert.match(wf, /tauri android build --apk --debug/);
    assert.match(wf, /rm -f package-lock\.json && npm install/);
    assert.match(wf, /softprops\/action-gh-release@v2/);
    assert.match(wf, /npm test/);
  });
});
