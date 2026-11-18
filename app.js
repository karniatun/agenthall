// AgentHall front-end logic (ethers v6, user-signed transactions only).
// No QR/pairing login, no server-side sessions: the user's own wallet
// (window.ethereum) signs everything directly.
(function () {
  const cfg = window.AGENTHALL_CONFIG;
  const $ = (id) => document.getElementById(id);
  const statusEl = $("status");

  let provider = null;   // ethers BrowserProvider (wallet)
  let readProvider = null; // read-only provider for stats before connect
  let signer = null;
  let myAddress = null;
  let hall = null;       // contract via signer
  let hallRead = null;   // contract via read provider / provider

  function setStatus(text) { statusEl.textContent = text; }
  function short(addr) { return addr ? addr.slice(0, 6) + "…" + addr.slice(-4) : ""; }
  function configured() { return cfg.agentHallAddress && cfg.agentHallAddress.length === 42; }

  function getReadProvider() {
    if (!readProvider) readProvider = new ethers.JsonRpcProvider(cfg.rpcUrl);
    return readProvider;
  }
  function hallReadContract() {
    if (!configured()) return null;
    if (!hallRead) hallRead = new ethers.Contract(cfg.agentHallAddress, cfg.agentHallAbi, getReadProvider());
    return hallRead;
  }

  async function refreshStats() {
    const c = hallReadContract();
    if (!c) { setStatus("AgentHall contract address not configured yet (see config.js TODO)."); return; }
    try {
      const [agents, checkins] = await Promise.all([c.totalAgents(), c.totalCheckInsAll()]);
      $("stat-agents").textContent = agents.toString();
      $("stat-checkins").textContent = checkins.toString();
      await refreshMine(c);
      await refreshLeaderboard(c, agents);
    } catch (e) {
      console.error(e);
      setStatus("Could not load stats: " + (e.shortMessage || e.message));
    }
  }

  async function refreshMine(c) {
    if (!myAddress) return;
    const g = await c.getAgent(myAddress);
    $("stat-my-streak").textContent = g.currentStreak.toString();
    $("stat-my-total").textContent = g.totalCheckIns.toString();
  }

  async function refreshLeaderboard(c, totalAgents) {
    const total = Number(totalAgents);
    const tbody = $("leaderboard");
    if (total === 0) { tbody.innerHTML = '<tr><td colspan="4">No registrations yet — be the first.</td></tr>'; return; }
    const from = Math.max(0, total - 10);
    const addrs = await c.getAgents(from, 10);
    const rows = [];
    for (let i = addrs.length - 1; i >= 0; i--) {
      const addr = addrs[i];
      const g = await c.getAgent(addr);
      const name = (await window.resolveName(addr)) || short(addr);
      rows.push(
        `<tr><td>${from + i + 1}</td><td title="${addr}">${name}</td>` +
        `<td>${g.totalCheckIns.toString()}</td><td>${g.currentStreak.toString()}</td></tr>`
      );
    }
    tbody.innerHTML = rows.join("");
  }

  async function refreshMyStatus() {
    if (!myAddress) return;
    const c = hallReadContract();
    const agentId = new ethers.Contract(cfg.agentIdAddress, cfg.agentIdAbi, getReadProvider());
    const [balance, registered] = await Promise.all([
      agentId.balanceOf(myAddress),
      c ? c.isRegistered(myAddress) : Promise.resolve(false),
    ]);
    const name = await window.resolveName(myAddress);
    $("who").textContent = name ? `${name} (${short(myAddress)})` : short(myAddress);
    if (balance === 0n) {
      setStatus("This wallet does not hold an Agent ID, so it cannot register.\nAgent IDs are claimed inside the Binance App (Wallet → Agent ID banner).");
      $("btn-register").disabled = true;
      $("btn-checkin").disabled = true;
      return;
    }
    if (!registered) {
      setStatus("Agent ID detected ✔ — you can register in the hall.");
      $("btn-register").disabled = !configured();
      $("btn-checkin").disabled = true;
    } else {
      setStatus("Registered ✔ — check in once per UTC day to grow your streak.");
      $("btn-register").disabled = true;
      $("btn-checkin").disabled = false;
    }
    if (c) await refreshMine(c);
  }

  async function connect() {
    if (!window.ethereum) { setStatus("No wallet found. Install a Web3 wallet extension or open this page in a wallet browser."); return; }
    provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== cfg.chainId) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x" + cfg.chainId.toString(16) }],
        });
        provider = new ethers.BrowserProvider(window.ethereum);
      } catch (e) {
        setStatus("Please switch your wallet to " + cfg.chainName + " (chainId 56).");
        return;
      }
    }
    signer = await provider.getSigner();
    myAddress = await signer.getAddress();
    if (configured()) hall = new ethers.Contract(cfg.agentHallAddress, cfg.agentHallAbi, signer);
    await refreshMyStatus();
    await refreshStats();
  }

  async function sendTx(fn, label) {
    try {
      setStatus(label + " — confirm the transaction in your wallet…");
      const tx = await fn();
      setStatus(label + " sent, waiting for confirmation… " + tx.hash);
      await tx.wait();
      setStatus(label + " confirmed ✔");
      await refreshMyStatus();
      await refreshStats();
    } catch (e) {
      console.error(e);
      setStatus(label + " failed: " + (e.shortMessage || e.message));
    }
  }

  $("btn-connect").addEventListener("click", connect);
  $("btn-refresh").addEventListener("click", refreshStats);
  $("btn-register").addEventListener("click", () => {
    if (!hall) return;
    sendTx(() => hall.register(), "Register");
  });
  $("btn-checkin").addEventListener("click", () => {
    if (!hall) return;
    sendTx(() => hall.checkIn(), "Check-in");
  });

  if (window.ethereum && window.ethereum.on) {
    window.ethereum.on("accountsChanged", () => location.reload());
    window.ethereum.on("chainChanged", () => location.reload());
  }

  refreshStats();
})();
