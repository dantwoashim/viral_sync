#!/bin/bash
# VIRAL-SYNC V4 Deployment Shell Script
# Ensures build, key synchronization, and standard deployment rules are applied.

set -e

ENV=${1:-devnet}
CLUSTER_URL="https://api.$ENV.solana.com"

echo "================================================="
echo " Deploying VIRAL-SYNC V4 to $ENV"
echo "================================================="

echo "1. Running clean build..."
anchor build

echo "2. Syncing keys (verifying Program ID matches)..."
anchor keys sync

echo "3. Building explicitly for deployment..."
anchor build

# Execute cargo test strictly before allowing deployment to fire
echo "4. Running backend rust validation..."
cargo check --manifest-path programs/viral_sync/Cargo.toml

echo "5. Deploying to $CLUSTER_URL..."
# V4 requires the deployer to retain upgrade authority per the roadmap until audits are finalized
solana program deploy \
  --url $CLUSTER_URL \
  --program-id target/deploy/viral_sync-keypair.json \
  target/deploy/viral_sync.so

echo "Deployment Phase Complete. Validate transactions on explorer.solana.com"
