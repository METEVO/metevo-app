
type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type WebViewHandle = { injectJavaScript: (code: string) => void; postMessage: (data: string) => void };

const pending = new Map<number, Pending>();
let webview: WebViewHandle | null = null;
let sequence = 0;
let ready = false;
let resolveReady: (() => void) | null = null;

const HELPER_BASE =
  process.env.EXPO_PUBLIC_WASM_HELPER_URL || 'http://192.168.1.147:3010';

/** The harness must post `ready` within this window after the page mounts. */
const READY_TIMEOUT_MS = 180_000;

const readyPromise = new Promise<void>((resolve, reject) => {
  resolveReady = resolve;
  setTimeout(() => {
    if (!ready) {
      reject(new Error('the on-device node did not become ready within 180 s'));
    }
  }, READY_TIMEOUT_MS);
});
// Callers attach their own rejection handlers; this keeps an idle bridge from
// logging an unhandled rejection when nothing is waiting for readiness.
void readyPromise.catch(() => {});

export function attachWasmWebView(ref: WebViewHandle | null): void {
  webview = ref;
}

export function handleWasmMessage(raw: string): void {
  let message: Record<string, unknown>;
  try {
    message = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return;
  }

  if (message.helper) {
    const id = message.id;
    const path = String(message.helper);
    const body = message.body ?? null;
    const emit = (result: unknown) => {
      webview?.injectJavaScript(
        `window.__metevoHelperResult && window.__metevoHelperResult(${JSON.stringify({ id, result })}); true;`,
      );
    };
    fetch(`${HELPER_BASE}${path}`, body ? {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    } : undefined)
      .then(async (resp) => {
        let result;
        try {
          result = await resp.json();
        } catch {
          result = { error: `HTTP ${resp.status}` };
        }
        if (!resp.ok && result.error === undefined) {
          result = { ...result, error: `HTTP ${resp.status}` };
        }
        emit(result);
      })
      .catch((error: unknown) => {
        emit({ error: String(error) });
      });
    return;
  }

  if (message.step === 'ready') {
    if (!ready) {
      ready = true;
      resolveReady?.();
    }
    return;
  }

  if (message.step === 'diag') {
    // One logcat entry per harness diagnostic line: the WebView console is
    // dropped in a release build, so this is the only path to logcat.
    console.log(String(message.line));
    return;
  }

  const id = message.id;
  if (typeof id !== 'number') {
    return;
  }
  const entry = pending.get(id);
  if (entry === undefined) {
    return;
  }
  pending.delete(id);
  clearTimeout(entry.timer);
  if (typeof message.error === 'string') {
    entry.reject(new Error(message.error));
  } else {
    entry.resolve(message.result);
  }
}

export function wasmCall<T>(method: string, params?: unknown): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    void readyPromise.then(() => {
      if (webview === null) {
        reject(new Error('the on-device node WebView is not mounted'));
        return;
      }
      const id = (sequence += 1);
      const timeoutMs = method === 'open'
        ? 900_000
        : method === 'selftest' || method === 'issueusdm'
          ? 900_000
          : 120_000;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`on-device node did not answer ${method}`));
      }, timeoutMs);
      pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });
      const payload = JSON.stringify({ id, method, params: params ?? null });
      webview.injectJavaScript(
        `window.__metevoDispatch && window.__metevoDispatch(${JSON.stringify(payload)}); true;`,
      );
    }, reject);
  });
}
