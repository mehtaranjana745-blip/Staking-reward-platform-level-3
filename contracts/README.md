# Soroban Smart Contracts

This directory contains the Soroban smart contracts for the Staking Reward Platform.

## Architecture

- **Token Contract**: Custom token implementation with initialization, minting, and transfer mechanisms.
- **Staking Contract**: Staking system that accepts staking tokens, computes time-based rewards, and interacts with the token contract using inter-contract calls.

## Development

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- [Stellar CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup#install-stellar-cli)

### Compile

To build the contracts into WASM:

```bash
cargo build --target wasm32-unknown-unknown --release
```

### Run Tests

To run the contract suite:

```bash
cargo test
```
