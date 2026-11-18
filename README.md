# AgentHall

**The check-in hall for Agent ID holders on BNB Smart Chain.**

Live site: https://karniatun.github.io/agenthall/

AgentHall is a small, fully non-custodial dApp built for the Binance Wallet
Agent ID Hackathon. If your wallet holds an **Agent ID** (the SPACE ID
`.ai` agent identity NFT on BSC), you can register in the hall once and
check in once per day. Your registration, check-in streak and totals are
recorded on-chain, and a public leaderboard shows who keeps showing up.

## How it works

1. **Connect** any BSC wallet on the live site (a normal wallet
   connection — no QR pairing, no seed phrase, nothing is ever asked
   beyond a signature in your own wallet).
2. **Register** — the contract checks that your wallet actually holds an
   Agent ID (a `balanceOf` gate on the official contract) and records
   your wallet address in the hall. One registration per wallet.
3. **Check in** — once per UTC day. Consecutive days build your streak;
   miss a day and the streak resets, but your total check-ins and your
   registration stay yours forever.
4. **Leaderboard** — the site lists registered agents with their
   `.ai` names (resolved via the SPACE ID Web3 Name SDK), streaks and
   totals, all read straight from the contract.

## How Agent ID is used

Agent ID is the gate and the identity of the hall — not a decoration:

- The official Agent ID contract on BSC is
  `0x60b9262456de011f7d15a54Cdd8c48bAaa8B022F`.
- `register()` calls `balanceOf(msg.sender)` on that contract and
  reverts unless it is greater than zero — only real Agent ID holders
  can enter.
- Registration records the holder's wallet address on-chain. The hall
  never reads or stores the Agent ID token ID: the official Agent ID
  contract does not expose ERC721Enumerable (`tokenOfOwnerByIndex`
  reverts on it), so the contract deliberately relies on `balanceOf`
  alone, and your `.ai` name is resolved from your address by the
  front-end via the SPACE ID SDK.
- `isAgentHolder(address)` re-checks the official contract live, so the
  hall always reflects who currently holds an Agent ID.

## Contract

| | |
|---|---|
| Contract | `0x08B9F63F9772F04bdc998F7BF8d9271AD5413885` |
| Network | BNB Smart Chain (chain ID 56) |
| Deploy tx | `0x0a1101dffeab579b9d072a471a13682a31cc490739cd478062c659d8e50e93ee` |
| Source | [`contracts/AgentHall.sol`](contracts/AgentHall.sol) in this repo |
| Verification | Sourcify **exact match** (runtime code) — [look it up](https://sourcify.dev/#/lookup/0x08B9F63F9772F04bdc998F7BF8d9271AD5413885) |
| Explorer | [BscScan](https://bscscan.com/address/0x08B9F63F9772F04bdc998F7BF8d9271AD5413885) |

> **Deployment history:** the first deployment (v1, `0x39d834FD374A34768C23c19d053B522489c4FF7e`, 2026-11-18) was superseded the same day by the v2 contract above. V1's `register()` depended on `tokenOfOwnerByIndex`, which the official Agent ID contract does not implement, so it reverted for every real holder. V1 is preserved for transparency in [`contracts/AgentHall-v1.sol`](contracts/AgentHall-v1.sol); do not use it.

The deployed bytecode contains no token-transfer, approval, withdrawal
or mint functions at all — see [`AUDIT.md`](AUDIT.md) for the pre-deploy
audit and the post-deploy selector scan.

## Safety & owner powers (full disclosure)

- The contract is **non-custodial**: it never holds, moves or approves
  user funds or tokens. Registering and checking in cost only the gas
  of your own transaction.
- The Agent ID contract address is stored in an **immutable** variable —
  it can never be pointed at a different contract.
- The owner's only powers are `setPaused(bool)` (pause/unpause new
  registrations and check-ins), `transferOwnership` and
  `renounceOwnership`. The owner cannot touch registrations, streaks or
  any user asset. Renouncing ownership disables the pause power forever.
- AgentHall makes no promise of returns, rewards or income. It is a
  check-in hall, not an investment product.

## Repository layout

- `index.html`, `app.js`, `config.js`, `name-resolver.js` — the static
  front-end served by GitHub Pages (ethers.js v6 via CDN; `.ai` name
  resolution via the SPACE ID Web3 Name SDK, degrading gracefully if
  the SDK is unavailable).
- `contracts/AgentHall.sol` — the deployed contract source.
- `AUDIT.md` — pre-deploy audit notes and post-deploy verification.
- `DEPLOY-NOTES.md` — build, test and deployment notes.

## License

MIT — see [`LICENSE`](LICENSE).
