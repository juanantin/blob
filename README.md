# $BLOB

One-screen landing page for $BLOB on Elysium. Static, no build step:

```bash
python3 -m http.server 8000
```

## Sent to Agent K
Fees are paid in SENT. On every $BLOB swap, sent.money's fee vault
(`0x3d36…d9a5`) credits the creator share to $BLOB's locker (`0xe79d…9f22`), which
holds it for @agentkinetiq to claim. The page sums those credits straight from the
Elysium RPC, applies the locker's 80% handle share, and converts to USD using the
SENT price on DexScreener. Refreshes every 30s. All of it is in `CONFIG` at the
top of `script.js`.

## Other
- Background video: `assets/bg.webm` + `assets/bg.mp4` (poster `assets/poster.jpg`).
- X: https://x.com/blob4agentk
