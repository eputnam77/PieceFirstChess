import "@testing-library/jest-dom/vitest";

import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach } from "vitest";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  globalThis.IDBKeyRange = IDBKeyRange;
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});
