const BASE_URL = 'http://100.76.63.125:8000';

export const api = {
  getDriftStatus: () =>
    fetch(`${BASE_URL}/drift/status`).then(r => r.json()),

  getCausalChain: () =>
    fetch(`${BASE_URL}/drift/causal-chain`).then(r => r.json()),

  getSuggestions: () =>
    fetch(`${BASE_URL}/agent/suggestions`).then(r => r.json()),

  getContextWindows: () =>
    fetch(`${BASE_URL}/context/windows`).then(r => r.json()),

  chat: (message, history = []) =>
    fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    }).then(r => r.json()),
};
