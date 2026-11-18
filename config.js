// AgentHall front-end configuration.
// Deployed 2026-11-18: 0x08B9F63F9772F04bdc998F7BF8d9271AD5413885 (BSC mainnet,
// Sourcify exact_match). ABI below mirrors app/artifacts/AgentHall.json.
window.AGENTHALL_CONFIG = {
  chainId: 56, // BNB Smart Chain mainnet
  chainName: "BNB Smart Chain",
  rpcUrl: "https://bsc-dataseed.binance.org/",
  blockExplorer: "https://bscscan.com",
  // Official Agent ID contract on BSC (SPACE ID "Agent ID", ERC-721):
  agentIdAddress: "0x60b9262456de011f7d15a54cdd8c48baaa8b022f",
  agentHallAddress: "0x08B9F63F9772F04bdc998F7BF8d9271AD5413885",
  agentIdAbi: [
    // balanceOf ONLY: the real Agent ID contract does not implement
    // ERC721Enumerable (tokenOfOwnerByIndex reverts on-chain — v1 bug).
    "function balanceOf(address owner) view returns (uint256)",
  ],
  agentHallAbi: [
    "function register()",
    "function checkIn()",
    "function isAgentHolder(address) view returns (bool)",
    "function isRegistered(address) view returns (bool)",
    "function getAgent(address) view returns (uint256 registeredAt, uint256 totalCheckIns, uint256 currentStreak, uint256 lastCheckInDay)",
    "function totalAgents() view returns (uint256)",
    "function totalCheckInsAll() view returns (uint256)",
    "function getAgents(uint256 offset, uint256 limit) view returns (address[])",
    "event Registered(address indexed agent)",
    "event CheckedIn(address indexed agent, uint256 day, uint256 streak)",
  ],
};
