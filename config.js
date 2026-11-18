// AgentHall front-end configuration.
// Deployed 2026-11-18: 0x39d834FD374A34768C23c19d053B522489c4FF7e (BSC mainnet,
// Sourcify exact_match). ABI below mirrors app/artifacts/AgentHall.json.
window.AGENTHALL_CONFIG = {
  chainId: 56, // BNB Smart Chain mainnet
  chainName: "BNB Smart Chain",
  rpcUrl: "https://bsc-dataseed.binance.org/",
  blockExplorer: "https://bscscan.com",
  // Official Agent ID contract on BSC (SPACE ID "Agent ID", ERC-721):
  agentIdAddress: "0x60b9262456de011f7d15a54cdd8c48baaa8b022f",
  agentHallAddress: "0x39d834FD374A34768C23c19d053B522489c4FF7e",
  agentIdAbi: [
    "function balanceOf(address owner) view returns (uint256)",
    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  ],
  agentHallAbi: [
    "function register()",
    "function checkIn()",
    "function isAgentHolder(address) view returns (bool)",
    "function isRegistered(address) view returns (bool)",
    "function getAgent(address) view returns (uint256 tokenId, uint256 registeredAt, uint256 totalCheckIns, uint256 currentStreak, uint256 lastCheckInDay)",
    "function totalAgents() view returns (uint256)",
    "function totalCheckInsAll() view returns (uint256)",
    "function getAgents(uint256 offset, uint256 limit) view returns (address[])",
    "event Registered(address indexed agent, uint256 tokenId)",
    "event CheckedIn(address indexed agent, uint256 tokenId, uint256 day, uint256 streak)",
  ],
};
