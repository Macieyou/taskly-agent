import { spawn } from 'node:child_process';

// No shell interpolation. Bound output and wall time even for hostile test code.
export function command(executable, args, { cwd, timeout = 120_000, maxBytes = 2_000_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd, shell: false, windowsHide: true,
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, HOME: process.env.HOME,
        DOCKER_HOST: process.env.DOCKER_HOST, DOCKER_CONFIG: process.env.DOCKER_CONFIG } });
    let output = ''; let size = 0; let failure;
    const timer = setTimeout(() => { failure = new Error('Command timed out'); child.kill('SIGKILL'); }, timeout);
    const collect = (chunk) => {
      size += chunk.length;
      if (size > maxBytes) { failure = new Error('Command output limit exceeded'); child.kill('SIGKILL'); }
      else output += chunk.toString();
    };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => { clearTimeout(timer); failure ? reject(failure) : resolve({ code, output }); });
  });
}
export async function checked(executable, args, options) {
  const result = await command(executable, args, options);
  if (result.code !== 0) throw new Error(`${executable} failed (${result.code}): ${result.output.slice(-5000)}`);
  return result.output;
}
