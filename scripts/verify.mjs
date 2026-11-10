import { spawn } from "node:child_process";

const steps = process.argv.slice(2);
if (steps.length === 0) {
  console.error("usage: node scripts/verify.mjs <npm script>...");
  process.exit(2);
}

const started = Date.now();
const seconds = (since) => `${((Date.now() - since) / 1000).toFixed(1)}s`;

function run(step) {
  const since = Date.now();
  return new Promise((resolve) => {
    const child = spawn("npm", ["run", step], {
      env: { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR ?? "1" },
      shell: process.platform === "win32",
    });
    const output = [];
    child.stdout.on("data", (chunk) => output.push(chunk));
    child.stderr.on("data", (chunk) => output.push(chunk));
    child.on("close", (code) => {
      const ok = code === 0;
      process.stdout.write(`\n${ok ? "✔" : "✘"} ${step} (${seconds(since)})\n`);
      if (!ok) {
        process.stdout.write(Buffer.concat(output));
      }
      resolve(ok);
    });
  });
}

const results = await Promise.all(steps.map(run));
const failed = steps.filter((_, i) => !results[i]);
console.log(
  failed.length === 0
    ? `\nverify passed in ${seconds(started)}`
    : `\nverify FAILED (${failed.join(", ")}) in ${seconds(started)}`,
);
process.exit(failed.length === 0 ? 0 : 1);
