// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title AgentHall
 * @notice A check-in hall for Agent ID holders on BNB Smart Chain (BSC).
 *
 *         AgentHall lets a wallet that holds an Agent ID (the non-transferable
 *         ERC-721 "name.ai" identity issued through the Binance App) register
 *         itself once and then check in once per UTC day, building a public
 *         daily streak. Registration binds the wallet address to the Agent ID
 *         tokenId it currently holds.
 *
 * @dev OWNER POWERS — FULL DISCLOSURE (hackathon red-line requirement)
 *      The contract has a single `owner` (the deployer, changeable only via
 *      `transferOwnership`). The owner can do EXACTLY the following, and
 *      nothing else:
 *        1. `setPaused(bool)` — pause or unpause `register()` and `checkIn()`
 *           (a circuit breaker for emergencies only).
 *        2. `transferOwnership(address)` — hand the owner role to a new address.
 *        3. `renounceOwnership()` — permanently remove the owner role, after
 *           which pausing becomes impossible forever.
 *      The owner CANNOT:
 *        - move, seize, freeze, or spend any user's BNB or tokens — this
 *          contract holds no user funds and contains no transfer, withdrawal,
 *          approval, mint, tax, or blacklist function of any kind;
 *        - register, check in, edit, or delete another user's record;
 *        - change the Agent ID contract address after deployment (it is
 *          `immutable`);
 *        - alter streaks, counters, or bindings in any way.
 *      There is no proxy, no upgrade mechanism, and no hidden admin path.
 *
 *      FUNDS: This contract is non-custodial and non-payable by design. It
 *      never receives, holds, or forwards user assets. Registration and
 *      check-in are plain state writes; the only cost a user ever pays is
 *      the network gas of their own transaction, signed in their own wallet.
 *
 *      This contract describes attendance/streak bookkeeping only. It makes
 *      no statement about financial return of any kind.
 */

/// @notice Minimal read interface of the official Agent ID contract on BSC:
///         0x60b9262456de011f7d15a54cdd8c48baaa8b022f
///         (SPACE ID "Agent ID", symbol AI, ERC-721, non-transferable, max 1 per wallet)
interface IAgentID {
    function balanceOf(address owner) external view returns (uint256);
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
}

contract AgentHall {
    // ---------------------------------------------------------------------
    // Types & storage
    // ---------------------------------------------------------------------

    struct Agent {
        uint256 tokenId;        // Agent ID tokenId bound at registration time
        uint256 registeredAt;   // block.timestamp of registration
        uint256 totalCheckIns;  // lifetime check-in count for this agent
        uint256 currentStreak;  // consecutive UTC days checked in
        uint256 lastCheckInDay; // last check-in day number (timestamp / 86400)
        bool registered;        // true once register() succeeded
    }

    /// @notice The official Agent ID contract. Immutable — set once at deploy.
    IAgentID public immutable agentId;

    /// @notice Contract owner. Powers are limited to pause + ownership
    ///         transfer/renounce only — see the header disclosure.
    address public owner;

    /// @notice Circuit breaker. When true, register() and checkIn() revert.
    bool public paused;

    mapping(address => Agent) private _agents;

    /// @notice All registered addresses, in registration order (for leaderboards).
    address[] private _agentList;

    uint256 private _totalCheckInsAll;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event Registered(address indexed agent, uint256 tokenId);
    event CheckedIn(address indexed agent, uint256 tokenId, uint256 day, uint256 streak);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error NotOwner();
    error ContractPaused();
    error NotAgentHolder();
    error AlreadyRegistered();
    error NotRegistered();
    error AlreadyCheckedInToday();
    error ZeroAddress();

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    /// @param agentIdAddress Address of the Agent ID contract on BSC
    ///        (mainnet: 0x60b9262456de011f7d15a54cdd8c48baaa8b022f).
    constructor(address agentIdAddress) {
        if (agentIdAddress == address(0)) revert ZeroAddress();
        agentId = IAgentID(agentIdAddress);
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ---------------------------------------------------------------------
    // Owner — pause circuit breaker & ownership only (see header disclosure)
    // ---------------------------------------------------------------------

    /// @notice Pause or unpause register() and checkIn(). Owner only.
    ///         This is the owner's only operational power over the contract.
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        if (_paused) {
            emit Paused(msg.sender);
        } else {
            emit Unpaused(msg.sender);
        }
    }

    /// @notice Transfer the owner role to a new address. Owner only.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Permanently remove the owner role. Owner only.
    ///         After this, nobody can pause the contract ever again.
    function renounceOwnership() external onlyOwner {
        emit OwnershipTransferred(owner, address(0));
        owner = address(0);
    }

    // ---------------------------------------------------------------------
    // Core — register & check in
    // ---------------------------------------------------------------------

    /// @notice Register the caller in the hall.
    ///         Requires: caller currently holds an Agent ID, and has not
    ///         registered before. Binds caller -> their Agent ID tokenId.
    function register() external whenNotPaused {
        if (agentId.balanceOf(msg.sender) == 0) revert NotAgentHolder();
        Agent storage a = _agents[msg.sender];
        if (a.registered) revert AlreadyRegistered();

        uint256 tokenId = agentId.tokenOfOwnerByIndex(msg.sender, 0);

        a.tokenId = tokenId;
        a.registeredAt = block.timestamp;
        a.registered = true;
        // totalCheckIns / currentStreak / lastCheckInDay start at 0.

        _agentList.push(msg.sender);

        emit Registered(msg.sender, tokenId);
    }

    /// @notice Check in for today (UTC). One check-in per registered agent
    ///         per UTC day. Consecutive days extend the streak; a missed
    ///         day restarts the streak at 1.
    function checkIn() external whenNotPaused {
        Agent storage a = _agents[msg.sender];
        if (!a.registered) revert NotRegistered();

        uint256 day = block.timestamp / 86400;

        if (a.totalCheckIns > 0 && a.lastCheckInDay == day) {
            revert AlreadyCheckedInToday();
        }

        if (a.totalCheckIns > 0 && a.lastCheckInDay == day - 1) {
            a.currentStreak += 1;
        } else {
            a.currentStreak = 1;
        }

        a.totalCheckIns += 1;
        a.lastCheckInDay = day;
        _totalCheckInsAll += 1;

        emit CheckedIn(msg.sender, a.tokenId, day, a.currentStreak);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @notice Live check: does `account` currently hold an Agent ID?
    function isAgentHolder(address account) external view returns (bool) {
        return agentId.balanceOf(account) > 0;
    }

    /// @notice Has `account` registered in the hall?
    function isRegistered(address account) external view returns (bool) {
        return _agents[account].registered;
    }

    /// @notice Full record for a registered agent.
    /// @return tokenId       Agent ID tokenId bound at registration
    /// @return registeredAt  Registration timestamp (seconds)
    /// @return totalCheckIns Lifetime check-ins by this agent
    /// @return currentStreak Current consecutive-day streak
    /// @return lastCheckInDay Last check-in day number (timestamp / 86400), 0 if never
    function getAgent(address account)
        external
        view
        returns (
            uint256 tokenId,
            uint256 registeredAt,
            uint256 totalCheckIns,
            uint256 currentStreak,
            uint256 lastCheckInDay
        )
    {
        Agent storage a = _agents[account];
        return (a.tokenId, a.registeredAt, a.totalCheckIns, a.currentStreak, a.lastCheckInDay);
    }

    /// @notice Total number of registered agents.
    function totalAgents() external view returns (uint256) {
        return _agentList.length;
    }

    /// @notice Total check-ins across all agents, all time.
    function totalCheckInsAll() external view returns (uint256) {
        return _totalCheckInsAll;
    }

    /// @notice Registered addresses in registration order (paginated).
    /// @dev For leaderboard/front-end enumeration. `offset` beyond the end
    ///      returns an empty array; `limit` is capped by the remaining count.
    function getAgents(uint256 offset, uint256 limit) external view returns (address[] memory page) {
        uint256 total = _agentList.length;
        if (offset >= total) return new address[](0);
        uint256 count = total - offset;
        if (count > limit) count = limit;
        page = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            page[i] = _agentList[offset + i];
        }
        return page;
    }
}
