const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const bs58 = require("bs58");

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

function loadTreasury() {
  const raw = (process.env.TREASURY_SECRET_KEY || "").trim();
  if (!raw) {
    throw new Error("TREASURY_SECRET_KEY is not set in .env");
  }
  // Accept either a JSON array (solana-keygen format) or a base58 string
  // (what Phantom/Solflare export).
  if (raw.startsWith("[")) {
    const arr = Uint8Array.from(JSON.parse(raw));
    return Keypair.fromSecretKey(arr);
  }
  return Keypair.fromSecretKey(bs58.decode(raw));
}

const treasury = loadTreasury();

function parsePublicKey(input) {
  try {
    return new PublicKey(input.trim());
  } catch {
    return null;
  }
}

function explorerTx(signature) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

function explorerAddress(address) {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
}

module.exports = {
  connection,
  treasury,
  parsePublicKey,
  explorerTx,
  explorerAddress,
};
