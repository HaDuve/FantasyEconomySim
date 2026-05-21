import type { ResourceBookSnapshot } from "@fantasy-economy-sim/domain";

import { bookForResource } from "./book-for-resource";

describe("bookForResource", () => {
  it("returns the matching book snapshot or an empty book", () => {
    const books: ResourceBookSnapshot[] = [
      {
        resourceId: "grain",
        bids: [{ orderId: "b1", price: 4, quantity: 1 }],
        asks: [],
      },
    ];

    expect(bookForResource(books, "grain")).toEqual(books[0]);
    expect(bookForResource(books, "ore")).toEqual({
      resourceId: "ore",
      bids: [],
      asks: [],
    });
  });
});
