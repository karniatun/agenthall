// name-resolver.js — reverse resolution: wallet address -> primary ".ai" name.
//
// Uses the SPACE ID Web3 Name SDK (docs.space.id):
//   const web3Name = createWeb3Name();
//   await web3Name.getDomainName({ address, queryChainIdList: [56] })
// returns the primary domain for the address (e.g. "ald.ai") or undefined.
//
// The SDK is loaded as an ES module from a CDN in index.html and exposed as
// window.__spaceIdWeb3Name. If the SDK failed to load, resolveName() falls
// back to returning null (the UI then shows the short address instead).
//
// TODO (hardening, optional): pin the SDK version + SRI hash on the CDN tag
// in index.html, or self-host the SDK bundle, before mainnet launch.

async function resolveName(address) {
  try {
    const sdk = window.__spaceIdWeb3Name;
    if (!sdk || typeof sdk.getDomainName !== "function") {
      // SDK unavailable — TODO: optionally fall back to the SPACE ID API here.
      return null;
    }
    const name = await sdk.getDomainName({ address, queryChainIdList: [56] });
    return name || null;
  } catch (e) {
    console.warn("resolveName failed:", e);
    return null;
  }
}

window.resolveName = resolveName;
