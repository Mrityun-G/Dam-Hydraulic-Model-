import { access, cp, mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const hydroRoot = resolve(process.cwd());
const monitoringRoot = resolve(hydroRoot, '..', 'dam-monitoring-react (1)', 'dam-monitoring-react');
const monitoringDist = join(monitoringRoot, 'dist');
const bundledMonitoring = join(hydroRoot, 'public', 'monitoring');

try {
  await access(join(monitoringRoot, 'package.json'));
  execSync('npm run build', {
    cwd: monitoringRoot,
    stdio: 'inherit',
  });
  await rm(bundledMonitoring, { recursive: true, force: true });
  await mkdir(join(hydroRoot, 'public'), { recursive: true });
  await cp(monitoringDist, bundledMonitoring, { recursive: true });
} catch {
  await access(join(bundledMonitoring, 'index.html'));
}

execSync('npm exec -- vite build', {
  cwd: hydroRoot,
  stdio: 'inherit',
});

execSync('npm exec -- esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs', {
  cwd: hydroRoot,
  stdio: 'inherit',
});
