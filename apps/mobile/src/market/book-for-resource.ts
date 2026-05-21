import type { ResourceBookSnapshot, ResourceId } from "@fantasy-economy-sim/domain";

export function bookForResource(
  books: ResourceBookSnapshot[],
  resourceId: ResourceId,
): ResourceBookSnapshot {
  return (
    books.find((book) => book.resourceId === resourceId) ?? {
      resourceId,
      bids: [],
      asks: [],
    }
  );
}
