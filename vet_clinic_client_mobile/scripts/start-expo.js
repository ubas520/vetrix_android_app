const net = require('net');
const { spawn } = require('child_process');

const requestedArgs = process.argv.slice(2);
const hasExplicitPort = requestedArgs.some(
  (argument) =>
    argument === '--port' ||
    argument === '-p' ||
    argument.startsWith('--port=')
);
const port = hasExplicitPort
  ? Number(
      requestedArgs.find((argument) => argument.startsWith('--port='))?.split('=')[1] ??
        requestedArgs[requestedArgs.findIndex((argument) => argument === '--port' || argument === '-p') + 1]
    )
  : 8080;
const expoArgs = [
  'expo',
  'start',
  ...(hasExplicitPort ? [] : ['--port', String(port)]),
  ...requestedArgs,
];
const env = Object.fromEntries(
  Object.entries(process.env)
    .filter(([key, value]) => key && !key.startsWith('=') && value !== undefined)
    .map(([key, value]) => [key, String(value)])
);

env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1';

const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
const args =
  process.platform === 'win32'
    ? ['/d', '/c', ['npx.cmd', ...expoArgs].join(' ')]
    : expoArgs;

function startExpo() {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env,
    shell: false,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Expo requires a valid port number.');
  process.exit(1);
}

const probe = net.createServer();

probe.once('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Expo was not moved to another port.`);
    console.error(`Stop the process on port ${port}, then run npm start again.`);
    process.exit(1);
  }

  throw error;
});

probe.once('listening', () => {
  probe.close(startExpo);
});

probe.listen(port, '0.0.0.0');
