import { requireDocker } from "./require-docker.js";

export default function integrationGlobalSetup(): void {
  requireDocker();
}
