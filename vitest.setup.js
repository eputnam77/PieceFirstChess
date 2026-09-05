import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach } from "vitest";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  globalThis.IDBKeyRange = IDBKeyRange;
  localStorage.clear();
});

afterEach(() => {
  // Testing Library only auto-cleans when vitest globals are on, and they are
  // not. Without this, a second render in the same file finds two copies of
  // every element and `getBy*` throws.
  cleanup();
  localStorage.clear();
});
