const fs = require('fs/promises');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const supportedArguments = new Set(['--dry-run', '--include-dependencies']);
const requestedArguments = process.argv.slice(2);
const unknownArguments = requestedArguments.filter((argument) => !supportedArguments.has(argument));

if (unknownArguments.length) {
  console.error(`Unknown cleanup option: ${unknownArguments.join(', ')}`);
  process.exit(1);
}

const dryRun = requestedArguments.includes('--dry-run');
const includeDependencies = requestedArguments.includes('--include-dependencies');

function isGeneratedEntry(entry) {
  const { name } = entry;

  if (name === '.expo' || name === '.visual-check' || name === 'dist' || name === 'web-build') {
    return true;
  }

  if (name === 'vetrix-expo-mobile-data-qr.png') {
    return true;
  }

  if (entry.isDirectory() && (name.startsWith('.expo-') || name.startsWith('.headless-') || name.startsWith('dist-'))) {
    return true;
  }

  return (
    /^\.expo-.*\.log$/.test(name) ||
    /^\.metro-health-check/.test(name) ||
    /^(npm-debug|yarn-debug|yarn-error)\./.test(name)
  );
}

function resolveDirectChild(name) {
  const target = path.resolve(appRoot, name);

  if (path.dirname(target) !== appRoot) {
    throw new Error(`Refusing to clean a path outside the app root: ${target}`);
  }

  return target;
}

async function main() {
  const entries = await fs.readdir(appRoot, { withFileTypes: true });
  const names = entries.filter(isGeneratedEntry).map((entry) => entry.name);

  if (includeDependencies && entries.some((entry) => entry.name === 'node_modules' && entry.isDirectory())) {
    names.push('node_modules');
  }

  names.sort();

  if (!names.length) {
    console.log('No generated artifacts found.');
    return;
  }

  for (const name of names) {
    const target = resolveDirectChild(name);

    if (dryRun) {
      console.log(`[dry-run] Would remove ${name}`);
      continue;
    }

    await fs.rm(target, {
      force: true,
      maxRetries: 3,
      recursive: true,
      retryDelay: 100,
    });
    console.log(`Removed ${name}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
