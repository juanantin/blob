/* =========================================================
   Site config
   ========================================================= */
const CONFIG = {
  // $BLOB contract address on Elysium.
  ca: "0x8589e6C3f5De71243aa5eDD23f994dd8a02b45C4",

  // How fees reach Agent K (all on Elysium, paid in native HYPE):
  // every $BLOB swap, sent.money's fee vault credits the creator share of the
  // fee to $BLOB's locker, which holds it for @agentkinetiq to claim. On
  // collection the locker keeps `handleShare` for the handle (rest = protocol).
  pool: "0xffddcc916a3639ab7df5731d28110582148ac0e098637b5f0386ab7f38877e55",
  feeVault: "0x3d36beb546e451584736957f97e7ee9d2acbd9a5",
  locker: "0xe79de6dd9a16a911f45acd8edb07232929e59f22",
  handleShare: 0.8,
  fromBlock: "0x7384d5", // $BLOB launch block
  feeSymbol: "HYPE",

  rpc: "https://rpc.volta.family",
  dexscreener: "https://api.dexscreener.com/latest/dex/tokens/",
  refreshMs: 30000,
};

(function () {
  const $ = (id) => document.getElementById(id);
  const isAddr = (a) => /^0x[0-9a-fA-F]{40}$/.test(a || "");
  const fmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const valueEl = $("agent-value");
  const usdEl = $("agent-usd");
  let shown = 0;
  const ACCRUED = "0xc95ddcad"; // fee vault: fee credited (poolId, recipient, ..., amount)

  async function loadSent() {
    const res = await fetch(CONFIG.rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "eth_getLogs",
        params: [{ address: CONFIG.feeVault, fromBlock: CONFIG.fromBlock, toBlock: "latest", topics: [null, CONFIG.pool] }],
      }),
    });
    const out = await res.json();
    if (out.error) throw new Error(out.error.message);
    const locker = CONFIG.locker.slice(2).toLowerCase();
    let total = 0n;
    for (const log of out.result) {
      if (!log.topics[0].startsWith(ACCRUED)) continue;
      const d = log.data.slice(2);
      if (d.slice(24, 64).toLowerCase() !== locker) continue;
      total += BigInt("0x" + d.slice(128, 192));
    }
    return (Number(total / 10n ** 12n) / 1e6) * CONFIG.handleShare;
  }

  // HYPE/USD derived from the $BLOB pair (priceUsd / priceNative).
  async function loadPrice() {
    const res = await fetch(CONFIG.dexscreener + CONFIG.ca);
    const pairs = ((await res.json()).pairs || []).filter((p) => Number(p.priceNative) > 0 && p.priceUsd);
    if (!pairs.length) return null;
    const best = pairs.reduce((a, b) => ((b.liquidity?.usd || 0) > (a.liquidity?.usd || 0) ? b : a));
    return Number(best.priceUsd) / Number(best.priceNative);
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
