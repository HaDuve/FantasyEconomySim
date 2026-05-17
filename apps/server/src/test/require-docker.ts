import { execSync } from "node:child_process";

export function isDockerAvailable(): boolean {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function requireDocker(): void {
  if (isDockerAvailable()) {
    return;
  }

  throw new Error(
    [
      "Docker is required for integration tests.",
      "Start Docker Desktop, or run: pnpm db:up",
      "Then: pnpm --filter @fantasy-economy-sim/server test:integration",
    ].join(" "),
  );
}
