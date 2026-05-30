/**
 * Advanced Attack Pipeline Route Discovery Crawler Engine
 * Fixes #53: Implements explicit Fetch API request timeout controls via AbortController
 */

interface RouteDiscoveryResult {
  url: string;
  status: number;
  isAccessible: boolean;
  discoveredRoutes: string[];
}

const DEFAULT_TIMEOUT_MS = 5000; // Explicit 5-second connection timeout guard

/**
 * Probes a target route URL endpoint with explicit execution boundary timeouts.
 * Guarantees hung sockets or infinite-loop dead links do not freeze the pipeline.
 */
export async function parseTargetRoute(targetUrl: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<RouteDiscoveryResult> {
  // Establish an instance of the native AbortController interface
  const controller = new AbortController();
  const { signal } = controller;

  // Schedule an asynchronous hardware rejection timeout macro thread
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const result: RouteDiscoveryResult = {
    url: targetUrl,
    status: 0,
    isAccessible: false,
    discoveredRoutes: [],
  };

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      signal, // Bind the abort interceptor token node directly to the network fetch parameters
      headers: {
        "User-Agent": "SecDev-AttackPipeline-RouteCrawler/1.0",
        "Accept": "text/html,application/xhtml+xml,application/json",
      },
    });

    result.status = response.status;
    result.isAccessible = response.ok;

    // If endpoint responds with scrapeable HTML content, search for secondary link extensions
    if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
      const htmlText = await response.text();
      
      // Basic dynamic regex scraping expression to gather sibling path strings
      const hrefRegex = /href=["']([^"']+)["']/g;
      let match;
      const discovered = new Set<string>();

      while ((match = hrefRegex.exec(htmlText)) !== null) {
        const link = match[1];
        if (link.startsWith("/") || link.startsWith(targetUrl)) {
          discovered.add(link);
        }
      }
      result.discoveredRoutes = Array.from(discovered);
    }

    return result;
  } catch (error: any) {
    // Check if network pipeline error matches the Abort signal trigger
    if (error.name === "AbortError") {
      console.error(`NETWORK TIMEOUT CRITICAL EXCEPTION: Connection to ${targetUrl} aborted after exceeding ${timeoutMs}ms restriction.`);
      throw new Error(`Pipeline socket termination: Endpoint [${targetUrl}] failed to respond within ${timeoutMs}ms.`);
    }

    console.error(`Route Discovery Endpoint Connectivity Failure [${targetUrl}]:`, error.message);
    return result;
  } finally {
    // Clear out active timing handles to prevent process execution leaks
    clearTimeout(timeoutId);
  }
}