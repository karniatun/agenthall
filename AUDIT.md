# Audit AgentHall — BSC 56 — pre-deploy source review
Date: 2026-11-18 · Source: contracts/AgentHall.sol (solc 0.8.26, optimizer 200 runs, evm paris) · deployed bytecode 2.870 byte
Method: bsc-contract-audit rubric adapted to a pre-deploy review of our own contract (the skill's
on-chain probes apply post-deploy; source is the strongest evidence level and was read in full).
Unit tests: 13/13 pass (see artifacts/test-results). Bytecode selector scan: see Evidence.

Score (applicable criteria): Security 28/30 · Investor protection 25/25 · Anti-manipulation 18/20 · Transparency 13/15 · Market viability n/a (non-token utility, no market) 
DECISION: GO — no user funds exist in this design; owner powers are minimal and fully disclosed.

## Privilege inventory (from source + ABI, 14 functions total)
- owner (deployer): setPaused(bool) — pause/unpause register+checkIn only; transferOwnership; renounceOwnership.
- agentId address: immutable, set once in constructor (official Agent ID 0x60b9262456de011f7d15a54cdd8c48baaa8b022f).
- No proxy, no upgrade path, no second admin, no roles.

## Critical
- None.

## Moderate / notes
1. Pause is discretionary timing: the owner can halt registrations/check-ins indefinitely.
   It touches no assets and is disclosed verbatim in the contract header (hackathon red-line
   requirement). Mitigation available at any time: renounceOwnership() makes pausing impossible forever.
2. External calls in register() (balanceOf, tokenOfOwnerByIndex) precede state writes, but both are
   STATICCALL view calls to the immutable official Agent ID contract — a static frame cannot reenter
   with a state change, and checkIn() makes no external calls at all. Reentrancy: not exploitable.
3. getAgents(offset, limit) with an oversized limit is a view-call gas concern only, not a security issue.

## Investor protection evidence
- Non-payable: zero payable functions, no receive/fallback — the contract cannot hold user BNB;
  accidental plain transfers revert. No transfer/transferFrom/approve/setApprovalForAll/withdraw/mint
  selectors exist in the bytecode (scan below). Users pay only their own gas, in their own wallet.
- Records are per-user and writable only by that user (register/checkIn act on msg.sender only);
  the owner cannot edit, delete, or forge another user's record.

## Evidence log
E1 Selector scan over artifacts/AgentHall.json deployedBytecode: transfer a9059cbb absent ·
   transferFrom 23b872dd absent · approve 095ea7b3 absent · withdraw 3ccfd60b/2e1a7d4d absent ·
   setApprovalForAll a22cb465 absent · safeTransferFrom 42842e0e absent · mint 40c10f19/a0712d68 absent ·
   payable functions: [] · receive/fallback: none.
E2 ABI functions = [agentId, checkIn, getAgent, getAgents, isAgentHolder, isRegistered, owner, paused,
   register, renounceOwnership, setPaused, totalAgents, totalCheckInsAll, transferOwnership] — matches source 1:1.
E3 Ganache unit tests 13/13: non-holder register reverts; double register reverts; checkIn gating,
   same-day revert, streak up/reset verified with time travel; pause blocks and unpause restores;
   non-owner cannot pause; record survives holder losing Agent ID (isAgentHolder goes false).
E4 Gas measured on Ganache: deploy 699.639 · register pertama 144.333 · checkIn pertama 118.813 · checkIn berikutnya ±50.726.

## Post-deploy record (2026-11-18)
- DEPLOYED: 0x39d834FD374A34768C23c19d053B522489c4FF7e · tx 0x87a83cfd08701a19550d5f6061c5be15beac901afed8dde7a3e058e67e788ea6
  · block 134313032 · gasUsed 699.639 (= Ganache measurement) · cost 0,00003498 BNB @ 0,05 gwei · deployer 0x55A23Fb86F04D29205e96A5a6E66eaF2946fC498.
- Live probes at deploy block: getCode 2.870 byte (= artifact) · owner() = deployer · agentId() = 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F
  (official Agent ID) · paused() = false · totalAgents() = 0.
- Sourcify: exact_match (creation + runtime), verifiedAt 2026-11-18T12:41:34Z, matchId 59468400;
  Sourcify also forwarded the verification to Etherscan/BscScan (their GUID 1f1ebcpprsga3ewxydqhzmwsvtdkwbkt9iephm3wxdikz1jfq1).
- Consider renouncing ownership after the submission period ends to retire the pause power.

Reference only, not investment advice.
