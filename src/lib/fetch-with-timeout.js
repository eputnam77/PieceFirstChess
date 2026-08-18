export const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * fetch() with a hard timeout so a hung network request can't leave the UI
 * stuck loading forever. Rejects with a clear "timed out" Error on expiry —
 * distinct from a genuine network failure — instead of a raw AbortError.
 */
export const fetchWithTimeout = async (
  url,
  options = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        `Request timed out after ${Math.round(timeoutMs / 1000)}s. Please try again.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * AbortSignal that fires after timeoutMs, for SDKs (e.g. the Google GenAI
 * client) that accept an `abortSignal` option instead of a fetch() call directly.
 * Call `cancel()` once the request settles to release the timer.
 */
export const createTimeoutSignal = (timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, cancel: () => clearTimeout(timeoutId) };
};

export const isTimeoutAbortError = (error) => error?.name === "AbortError";
