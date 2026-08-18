import { describe, expect, it, vi } from "vitest";

import { autoSave, deleteGame, listGames, loadAutoSave, saveGame } from "@/lib/db";

describe("db (IndexedDB persistence)", () => {
  describe("autoSave / loadAutoSave", () => {
    it("round-trips saved data under a fixed id", async () => {
      await autoSave({ fen: "start-fen", moves: ["e4"] });

      const loaded = await loadAutoSave();

      expect(loaded).toMatchObject({
        id: "autosave",
        fen: "start-fen",
        moves: ["e4"],
        isAutosave: true,
      });
      expect(typeof loaded.timestamp).toBe("number");
    });

    it("overwrites the previous autosave — only one autosave record ever exists", async () => {
      await autoSave({ fen: "first-fen" });
      await autoSave({ fen: "second-fen" });

      const loaded = await loadAutoSave();
      expect(loaded.fen).toBe("second-fen");

      const all = await listGames();
      // listGames excludes autosave, so verify indirectly there is no
      // stray extra autosave-like record by checking loadAutoSave is singular.
      expect(all.every((g) => g.id !== "autosave")).toBe(true);
    });

    it("loadAutoSave resolves null (not undefined, not a rejection) when nothing saved", async () => {
      const loaded = await loadAutoSave();
      expect(loaded).toBeNull();
    });
  });

  describe("saveGame", () => {
    it("returns a generated string id and the record is retrievable, distinct from the autosave slot", async () => {
      const id = await saveGame({ fen: "game-fen" });

      expect(typeof id).toBe("string");
      expect(id).not.toBe("autosave");

      const games = await listGames();
      const saved = games.find((g) => g.id === id);
      expect(saved).toMatchObject({ id, fen: "game-fen", isAutosave: false });
    });

    it("produces unique ids across multiple calls, all appearing in listGames()", async () => {
      const id1 = await saveGame({ fen: "fen-1" });
      const id2 = await saveGame({ fen: "fen-2" });
      const id3 = await saveGame({ fen: "fen-3" });

      expect(new Set([id1, id2, id3]).size).toBe(3);

      const games = await listGames();
      const ids = games.map((g) => g.id);
      expect(ids).toEqual(expect.arrayContaining([id1, id2, id3]));
      expect(games).toHaveLength(3);
    });
  });

  describe("listGames", () => {
    it("never includes the autosave record, even when mixed with saved games", async () => {
      await autoSave({ fen: "auto-fen" });
      const id = await saveGame({ fen: "real-fen" });

      const games = await listGames();

      expect(games).toHaveLength(1);
      expect(games[0].id).toBe(id);
      expect(games.some((g) => g.id === "autosave")).toBe(false);
    });

    it("sorts newest-first by timestamp", async () => {
      const nowSpy = vi.spyOn(Date, "now");
      nowSpy.mockReturnValueOnce(1000);
      const idOld = await saveGame({ fen: "oldest" });
      nowSpy.mockReturnValueOnce(2000);
      const idMid = await saveGame({ fen: "middle" });
      nowSpy.mockReturnValueOnce(3000);
      const idNew = await saveGame({ fen: "newest" });
      nowSpy.mockRestore();

      const games = await listGames();
      expect(games.map((g) => g.id)).toEqual([idNew, idMid, idOld]);
    });

    it("returns [] on an empty store", async () => {
      const games = await listGames();
      expect(games).toEqual([]);
    });
  });

  describe("deleteGame", () => {
    it("removes a saved game; it's gone from a subsequent listGames()", async () => {
      const idKeep = await saveGame({ fen: "keep-me" });
      const idRemove = await saveGame({ fen: "remove-me" });

      await deleteGame(idRemove);

      const games = await listGames();
      expect(games.map((g) => g.id)).toEqual([idKeep]);
    });

    it("resolves without throwing when deleting a non-existent id (no-op success)", async () => {
      await expect(deleteGame("does-not-exist")).resolves.toBeUndefined();
    });
  });

  describe("unicode / large payloads", () => {
    it("round-trips unicode, emoji, and very long strings without corruption", async () => {
      const name = "♔ 长的中文字符串 ".repeat(50);
      const id = await saveGame({ name, fen: "unicode-fen" });

      const games = await listGames();
      const saved = games.find((g) => g.id === id);

      expect(saved.name).toBe(name);
      expect(saved.name.length).toBe(name.length);
    });
  });
});
