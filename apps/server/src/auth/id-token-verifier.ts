export type VerifiedIdToken = {
  uid: string;
};

export type IdTokenVerifier = {
  verify(idToken: string): Promise<VerifiedIdToken>;
};

export class InvalidIdTokenError extends Error {
  readonly name = "InvalidIdTokenError";
}
