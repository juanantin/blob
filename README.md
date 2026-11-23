# $BLOB

One-screen landing page for $BLOB on Elysium. Static, no build step:

```bash
python3 -m http.server 8000
```

## Sent to Agent K
The total covers every $BLOB launch (fees paid in KNTQ and HYPE; the SENT-paired launch is left out). On every
swap, sent.money's fee vault (`0x3d36…d9a5`) credits the creator share to the locker
(`0xe79d…9f22`), which holds it for @agentkinetiq to claim. The page sums those credits
per launch straight from the Elysium RPC, applies the locker's 80% handle share, and
prices each token with DexScreener. Refreshes every 30s. Add a new launch to
`CONFIG.launches` (and its token to `CONFIG.tokens`) in `script.js`.

## Other
- Background video: `assets/bg.webm` + `assets/bg.mp4` (poster `assets/poster.jpg`).
- X: https://x.com/blob4agentk
