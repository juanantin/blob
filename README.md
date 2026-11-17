# $BLOB

One-screen landing page for $BLOB on Elysium. Static, no build step:

```bash
python3 -m http.server 8000
```

## At launch
Edit `CONFIG` at the top of `script.js`:
- `ca` — the $BLOB contract address: 0x8589e6C3f5De71243aa5eDD23f994dd8a02b45C4.
- `agentK` — Agent K's wallet. The page sums every KNTQ `Transfer` into it, read straight from the Elysium RPC, and shows the USD value using the KNTQ price from DexScreener. Refreshes every 30s.
- `feeFrom` (optional) — count only transfers from this address (e.g. the fee distributor).

## Other
- Background video: `assets/bg.webm` + `assets/bg.mp4` (poster `assets/poster.jpg`).
- X: https://x.com/Blob_elykntq
