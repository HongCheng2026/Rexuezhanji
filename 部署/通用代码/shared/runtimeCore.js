(function registerRuntimeCore(root) {
  const scope = root.RXGame || (root.RXGame = {});
  const events = [];
  const track = (name, payload = {}) => events.push({ name, payload, at: Date.now() });
  const createInventory = (value = {}) => ({ ...value });
  const addInventoryItem = (inventory, itemId, amount = 1) => ({ ...inventory, [itemId]: Math.max(0, Number(inventory[itemId]) || 0) + amount });
  const createPauseState = () => ({ paused: false, reviveUsed: false });
  const withErrorFallback = async (work, fallback) => { try { return await work(); } catch (error) { console.error(error); return fallback?.(error); } };
  const api = { track, getEvents: () => [...events], createInventory, addInventoryItem, createPauseState, withErrorFallback, assetPath: (name) => `assets/${String(name).replace(/^\/+/, "")}` };
  scope.runtimeCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
