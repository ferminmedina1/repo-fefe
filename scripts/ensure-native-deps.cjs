const { spawnSync } = require('node:child_process');

const dependencies = [
  { name: '@rollup/rollup-linux-x64-gnu', version: '4.59.0' },
  { name: '@swc/core-linux-x64-gnu', version: '1.13.2' },
];

const isLinuxX64 = process.platform === 'linux' && process.arch === 'x64';

if (!isLinuxX64) {
  process.exit(0);
}

const missing = dependencies.filter((dep) => {
  try {
    require.resolve(dep.name);
    return false;
  } catch {
    return true;
  }
});

if (missing.length === 0) {
  process.exit(0);
}

const packages = missing.map((dep) => `${dep.name}@${dep.version}`);
const result = spawnSync(
  'npm',
  ['install', '--no-save', '--include=optional', '--no-audit', '--no-fund', ...packages],
  { stdio: 'inherit', shell: true }
);

if (result.status !== 0) {
  process.exit(result.status || 1);
}
