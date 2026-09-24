// Safe wrappers: storage can be unavailable (private mode, blocked site data, previews).

function wrap(getBackend) {
  const backend = () => {
    try { return getBackend(); } catch { return null; }
  };
  return {
    get(key, fallback = null) {
      try {
        const rawValue = backend()?.getItem(key);
        return rawValue == null ? fallback : JSON.parse(rawValue);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        backend()?.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try { backend()?.removeItem(key); } catch { /* ignore */ }
    },
  };
}

export const local = wrap(() => window.localStorage);
export const session = wrap(() => window.sessionStorage);
