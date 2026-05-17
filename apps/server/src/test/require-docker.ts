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
      "Docker is required for integration tests (Testcontainers).",
      "Start Docker Desktop (or another Docker engine), then run:",
      "pnpm test:integration",
    ].join(" "),
  );
}
