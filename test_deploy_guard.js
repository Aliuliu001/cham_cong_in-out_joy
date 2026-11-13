const assert = require('node:assert/strict');
const fs = require('node:fs');

const ignore = fs.readFileSync('.claspignore', 'utf8').replace(/\r\n/g, '\n').trim().split('\n').filter(Boolean);
const allowed = new Set(['Code.gs', 'Index.html', 'BaoCao.html', 'appsscript.json']);
const inventory = fs.readdirSync('.').filter(name => /\.(gs|html|json|js)$/i.test(name));

function selectedByAllowlist(name) {
  return allowed.has(name);
}

for (const name of allowed) {
  assert.ok(inventory.includes(name), `production file missing locally: ${name}`);
  assert.ok(ignore.includes(`!/${name}`), `.claspignore must explicitly include ${name}`);
}
for (const name of inventory) {
  if (allowed.has(name)) continue;
  assert.equal(selectedByAllowlist(name), false, `must never upload non-production file: ${name}`);
}
assert.ok(ignore.includes('**'), '.claspignore must first ignore every file');

const batch = fs.readFileSync('sync-deploy.bat', 'utf8');
assert.match(batch, /set "PROJECT_DIR=D:\\CLASP\\cham_cong"/);
assert.match(batch, /if not exist "%PROJECT_DIR%\\\.clasp\.json"/);
assert.match(batch, /set "EXPECTED_SCRIPT_ID=1FUf9yVSki_-dSpM4UfBsdsBuDf2pSdaKNq66ioSYIr12BQfe_qLJolex"/);
assert.match(batch, /findstr \/c:"%EXPECTED_SCRIPT_ID%" "%PROJECT_DIR%\\\.clasp\.json"/);
assert.match(batch, /git diff --quiet/);
assert.match(batch, /clasp deployments/);
assert.match(batch, /findstr \/c:"%DEPLOYMENT_ID%"/);
assert.match(batch, /clasp push/);
assert.match(batch, /clasp deploy -i "%DEPLOYMENT_ID%"/);

console.log('PASS: deployment allowlist and Windows launcher safeguards');
