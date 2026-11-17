/* =========================================================
   Site config — fill these in at launch
   ========================================================= */
const CONFIG = {
  // $BLOB contract address on Elysium. Leave "" until deployed.
  ca: "0x8589e6C3f5De71243aa5eDD23f994dd8a02b45C4",

  // Agent K's wallet. Every KNTQ transfer into this address is counted.
  agentK: "",

  // Optional: only count transfers coming FROM this address
  // (e.g. the fee distributor). Leave "" to count every transfer in.
  feeFrom: "",

  // Token the fees are paid in. $BLOB trades against native HYPE; tracking TBD.
  feeToken: "0xe45a355d9e9cAd2aD85F2d03E3eE3102A036acF0",
  feeSymbol: "HYPE",
  feeDecimals: 18,

  rpc: "https://rpc.volta.family",
  dexscreener: "https://api.dexscreener.com/latest/dex/tokens/",
  refreshMs: 30000,
};

(function () {
  const $ = (id) => document.getElementById(id);
  const isAddr = (a) => /^0x[0-9a-fA-F]{40}$/.test(a || "");
  const topic = (a) => "0x" + "0".repeat(24) + a.slice(2).toLowerCase();
  const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 });
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
  $("agent-unit").textContent = CONFIG.feeSymbol;
  if (!isAddr(CONFIG.agentK)) return;

  const valueEl = $("agent-value");
  const usdEl = $("agent-usd");
  let shown = 0;

  async function loadSent() {
    const res = await fetch(CONFIG.rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "eth_getLogs",
        params: [{
          address: CONFIG.feeToken, fromBlock: "0x0", toBlock: "latest",
          topics: [TRANSFER, isAddr(CONFIG.feeFrom) ? topic(CONFIG.feeFrom) : null, topic(CONFIG.agentK)],
        }],
      }),
    });
    const out = await res.json();
    if (out.error) throw new Error(out.error.message);
    let total = 0n;
    for (const log of out.result) total += BigInt(log.data);
    const scale = 10n ** BigInt(Math.max(0, CONFIG.feeDecimals - 6));
    return Number(total / scale) / 1e6;
  }

  async function loadPrice() {
    const res = await fetch(CONFIG.dexscreener + CONFIG.feeToken);
    const pairs = ((await res.json()).pairs || []).filter(
      (p) => p.baseToken.address.toLowerCase() === CONFIG.feeToken.toLowerCase() && p.priceUsd
    );
    if (!pairs.length) return null;
    const best = pairs.reduce((a, b) => ((b.liquidity?.usd || 0) > (a.liquidity?.usd || 0) ? b : a));
    return Number(best.priceUsd);
  }

  function animate(target) {
    const from = shown;
    shown = target;
    if (reduce || from === target) { valueEl.textContent = fmt.format(target); return; }
    const t0 = performance.now();
    const dur = from === 0 ? 1600 : 900;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      valueEl.textContent = fmt.format(from + (target - from) * (1 - Math.pow(1 - t, 4)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  async function refresh() {
    const [sent, price] = await Promise.allSettled([loadSent(), loadPrice()]);
    if (sent.status === "fulfilled") {
      animate(sent.value);
      usdEl.textContent = price.status === "fulfilled" && price.value
        ? "≈ " + usd.format(sent.value * price.value)
        : "";
    }
  }

  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, CONFIG.refreshMs);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
})();
