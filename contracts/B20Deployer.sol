// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IB20Factory {
    function createB20(
        uint8 variant,
        bytes32 salt,
        bytes calldata params,
        bytes[] calldata initCalls
    ) external returns (address token);
}

/// @notice Collects a one-time deploy fee and forwards the B20 token creation to the factory.
/// After deployment the token belongs entirely to the user — no ongoing dependency on this contract.
contract B20Deployer {
    address public constant B20_FACTORY = 0xB20f000000000000000000000000000000000000;

    address public owner;
    uint256 public deployFee;
    address public pendingOwner;

    event TokenDeployed(address indexed deployer, address indexed token, uint256 feePaid);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event Withdrawn(address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error InsufficientFee(uint256 required, uint256 provided);
    error Unauthorized();
    error ZeroAddress();
    error TransferFailed();
    error NoPendingOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(uint256 _deployFee) {
        owner = msg.sender;
        deployFee = _deployFee;
    }

    // ─────────────────────────────────────────────
    //  Deploy
    // ─────────────────────────────────────────────

    /// @notice Deploy a B20 token. Caller must send at least `deployFee` ETH.
    /// Excess ETH is refunded. The token's initialAdmin (encoded inside `params`) becomes
    /// the sole owner — this contract retains no role on the deployed token.
    function deployB20Token(
        uint8 variant,
        bytes32 salt,
        bytes calldata params,
        bytes[] calldata initCalls
    ) external payable returns (address token) {
        if (msg.value < deployFee) revert InsufficientFee(deployFee, msg.value);

        token = IB20Factory(B20_FACTORY).createB20(variant, salt, params, initCalls);

        uint256 excess = msg.value - deployFee;
        if (excess > 0) {
            (bool ok,) = payable(msg.sender).call{value: excess}("");
            if (!ok) revert TransferFailed();
        }

        emit TokenDeployed(msg.sender, token, deployFee);
    }

    // ─────────────────────────────────────────────
    //  Fee management
    // ─────────────────────────────────────────────

    /// @notice Update the deploy fee (in wei). Set to 0 to make deployment free.
    function setFee(uint256 newFee) external onlyOwner {
        emit FeeUpdated(deployFee, newFee);
        deployFee = newFee;
    }

    // ─────────────────────────────────────────────
    //  Withdrawal
    // ─────────────────────────────────────────────

    /// @notice Withdraw a specific amount to any address.
    function withdraw(address payable to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(to, amount);
    }

    /// @notice Withdraw entire balance to any address.
    function withdrawAll(address payable to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = address(this).balance;
        (bool ok,) = to.call{value: bal}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(to, bal);
    }

    /// @notice Check collected fee balance.
    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    // ─────────────────────────────────────────────
    //  Ownership (two-step — prevents accidental lockout)
    // ─────────────────────────────────────────────

    /// @notice Step 1 — current owner nominates a new owner.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
    }

    /// @notice Step 2 — pending owner accepts. Completes the transfer.
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NoPendingOwner();
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }
}
