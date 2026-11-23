/* =========================================================
   Site config
   ========================================================= */
const CONFIG = {
  // $BLOB contract address on Elysium.
  ca: "0x68B867F6De166449B57A482109B43e0cF562b090",

  // How fees reach Agent K (all on Elysium):
  // every $BLOB swap, sent.money's fee vault credits the creator share of the
  // fee to the locker, which holds it for @agentkinetiq to claim. On collection
  // the locker keeps `handleShare` for the handle (rest = protocol).
  // Every $BLOB launch counts toward the total, each paid in its pair token.
  feeVault: "0x3d36beb546e451584736957f97e7ee9d2acbd9a5",
  locker: "0xe79de6dd9a16a911f45acd8edb07232929e59f22",
  handleShare: 0.8,
  fromBlock: "0x7384d5", // first $BLOB launch
  launches: [
    { pool: "0xffddcc916a3639ab7df5731d28110582148ac0e098637b5f0386ab7f38877e55", token: "0x0000000000000000000000000000000000000000" }, // HYPE
    { pool: "0x4ff3c54277ce02707945f0f93373e588ade76803735557f3f9d626ee262308b3", token: "0xe45a355d9e9cad2ad85f2d03e3ee3102a036acf0" }, // KNTQ
  ],
  // Fee tokens: symbol + where to price them (native HYPE is priced via WHYPE).
  // Shown in this order. (The SENT-paired launch is left out: its fees are negligible.)
  tokens: {
    "0xe45a355d9e9cad2ad85f2d03e3ee3102a036acf0": { symbol: "KNTQ" },
    "0x0000000000000000000000000000000000000000": { symbol: "HYPE", priceVia: "0xba876237b0f021a6c6d852d6c26e107997cc5e81" },
  },

  rpc: "https://rpc.volta.family",
  dexscreener: "https://api.dexscreener.com/latest/dex/tokens/",
  refreshMs: 30000,
};

(function () {
  const $ = (id) => document.getElementById(id);
  const isAddr = (a) => /^0x[0-9a-fA-F]{40}$/.test(a || "");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Contract address + copy ---------- */
  const caEl = $("ca-value");
  const copyBtn = $("ca-copy");
  if (isAddr(CONFIG.ca)) {
    caEl.textContent = CONFIG.ca;
    caEl.title = CONFIG.ca;
    copyBtn.disabled = false;
  }
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(CONFIG.ca);
    } catch {
      const r = document.createRange();
      r.selectNodeContents(caEl);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      document.execCommand("copy");
      s.removeAllRanges();
    }
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
  });

  /* ---------- Sent to Agent K ---------- */
  const valueEl = $("agent-value");
  const usdEl = $("agent-usd");
  const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let shown = 0;
  const ACCRUED = "0xc95ddcad"; // fee vault: fee credited (poolId, recipient, currency, amount)

  // Agent K's share per fee token, summed over every $BLOB launch.
  async function loadSent() {
    const res = await fetch(CONFIG.rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "eth_getLogs",
        params: [{
          address: CONFIG.feeVault, fromBlock: CONFIG.fromBlock, toBlock: "latest",
          topics: [null, CONFIG.launches.map((l) => l.pool)],
        }],
      }),
    });
    const out = await res.json();
    if (out.error) throw new Error(out.error.message);
    const locker = CONFIG.locker.slice(2).toLowerCase();
    const wanted = new Map(CONFIG.launches.map((l) => [l.pool.toLowerCase(), l.token.slice(2).toLowerCase()]));
    const totals = {};
    for (const log of out.result) {
      if (!log.topics[0].startsWith(ACCRUED)) continue;
      const d = log.data.slice(2);
      const token = d.slice(88, 128).toLowerCase();
      if (d.slice(24, 64).toLowerCase() !== locker || wanted.get(log.topics[1].toLowerCase()) !== token) continue;
      totals["0x" + token] = (totals["0x" + token] || 0n) + BigInt("0x" + d.slice(128, 192));
    }
    const amounts = {};
    for (const [t, wei] of Object.entries(totals)) amounts[t] = (Number(wei / 10n ** 12n) / 1e6) * CONFIG.handleShare;
    return amounts;
  }

  // USD price from the token's most liquid DexScreener pair (as base, or via the quote side).
  async function loadPrice(address) {
    const res = await fetch(CONFIG.dexscreener + address);
    const t = address.toLowerCase();
    let best = null;
    for (const p of (await res.json()).pairs || []) {
      if (!p.priceUsd || !(Number(p.priceNative) > 0)) continue;
      const price = p.baseToken.address.toLowerCase() === t
        ? Number(p.priceUsd)
        : Number(p.priceUsd) / Number(p.priceNative);
      const liq = p.liquidity?.usd || 0;
      if (!best || liq > best.liq) best = { price, liq };
    }
    return best ? best.price : null;
  }

  function animate(target) {
    const from = shown;
    shown = target;
    if (reduce || from === target) { valueEl.textContent = money.format(target); return; }
    const t0 = performance.now();
    const dur = from === 0 ? 1600 : 900;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      valueEl.textContent = money.format(from + (target - from) * (1 - Math.pow(1 - t, 4)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const prices = {};
  async function refresh() {
    let amounts;
    try { amounts = await loadSent(); } catch { return; }
    const tokens = Object.keys(CONFIG.tokens);
    await Promise.all(tokens.map(async (t) => {
      try { const p = await loadPrice(CONFIG.tokens[t].priceVia || t); if (p) prices[t] = p; } catch {}
    }));
    let total = 0;
    for (const t of tokens) total += (amounts[t] || 0) * (prices[t] || 0);
    animate(total);
    usdEl.textContent = tokens
      .filter((t) => amounts[t])
      .map((t) => compact.format(amounts[t]) + " " + CONFIG.tokens[t].symbol)
      .join(" · ");
  }

  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, CONFIG.refreshMs);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
})();
