/**
 * Global HTTP Fetch Interceptor & Request Retry Mechanism
 * Fixes #77: Implements exponential backoff for transient network drops and 5xx faults.
 */

interface FetchRetryOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
}

const DEFAULT_RETRIES = 3;
const DEFAULT_INITIAL_DELAY = 1000; // 1 second

/**
 * A fault-tolerant wrapper around the native fetch API.
 * Automatically retries failed requests (network drops or 5xx server errors)
 * using an exponential backoff algorithm: delay = initial * (2 ^ attempt).
 */
export async function fetchWithRetry(url: string, options: FetchRetryOptions = {}): Promise<Response> {
  const { 
    retries = DEFAULT_RETRIES, 
    retryDelay = DEFAULT_INITIAL_DELAY, 
    ...fetchOptions 
  } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      // If the response is successful (2xx) or a client error (4xx - no point in retrying bad syntax), return it immediately
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // If we've exhausted our retries and it's still returning a 5xx, pass the response back to throw downstream
      if (attempt === retries) {
        return response;
      }

      console.warn(`[HTTP Client] 5xx Server Error on ${url}.`);

    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const errName = error instanceof Error ? error.name : "";

      // If the user or a system explicitly aborted the request (like Issue #53), DO NOT retry.
      if (errName === "AbortError") {
        throw error;
      }

      // If it's a network socket hang/drop and we are out of retries, throw the error
      if (attempt === retries) {
        throw new Error(`[HTTP Client] Network failure. Exhausted all ${retries} retry attempts for ${url}.`);
      }

      console.warn(`[HTTP Client] Network drop on ${url}: ${errMsg}`);
    }

    // --- EXPONENTIAL BACKOFF MATH ---
    // Attempt 0 -> 1000ms * (2^0) = 1000ms delay
    // Attempt 1 -> 1000ms * (2^1) = 2000ms delay
    // Attempt 2 -> 1000ms * (2^2) = 4000ms delay
    const delay = retryDelay * Math.pow(2, attempt);
    
    console.warn(`[HTTP Client] Retrying in ${delay}ms... (Attempt ${attempt + 1} of ${retries})`);
    
    // Pause execution thread for the calculated delay duration
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  // Fallback safety (should be mathematically unreachable due to the loop structure)
  throw new Error("Critical: Fetch retry loop collapsed.");
}

export const httpClient = {
  get: (url: string, options?: FetchRetryOptions) => fetchWithRetry(url, { ...options, method: 'GET' }),
  post: (url: string, body: unknown, options?: FetchRetryOptions) => fetchWithRetry(url, { 
    ...options, 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(body) 
  }),
  delete: (url: string, options?: FetchRetryOptions) => fetchWithRetry(url, { ...options, method: 'DELETE' }),
};