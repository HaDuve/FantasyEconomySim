const PNPM_LIFECYCLE_PATTERN = /> fantasy-economy-sim@/;

export function firebaseIdTokenFromCommandOutput(stdout) {
  if (PNPM_LIFECYCLE_PATTERN.test(stdout)) {
    throw new Error(
      "pnpm lifecycle noise in token capture; use: node scripts/get-firebase-anon-token.mjs",
    );
  }

  const token = stdout
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("eyJ"));

  if (!token) {
    throw new Error("no Firebase ID token in output");
  }

  return token;
}
