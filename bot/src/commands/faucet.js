const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const { connection, treasury, parsePublicKey, explorerTx } = require("../lib/solana");
const claims = require("../lib/claims");

const MAX_PER_CLAIM = Number(process.env.FAUCET_MAX_SOL_PER_CLAIM || 2);
const MAX_PER_24H = Number(process.env.FAUCET_MAX_SOL_PER_24H || 2);

function fmtHours(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("faucet")
    .setDescription("Claim devnet SOL")
    .addStringOption((opt) =>
      opt.setName("address").setDescription("Your Solana wallet address (devnet)").setRequired(true)
    )
    .addNumberOption((opt) =>
      opt
        .setName("amount")
        .setDescription(`How much SOL (max ${MAX_PER_CLAIM})`)
        .setRequired(true)
        .setMinValue(0.01)
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const addressInput = interaction.options.getString("address", true);
    const requested = interaction.options.getNumber("amount", true);
    const userId = interaction.user.id;

    const recipient = parsePublicKey(addressInput);
    if (!recipient) {
      return interaction.editReply("That doesn't look like a valid Solana address. Double check it and try again.");
    }

    let notes = [];
    let amount = requested;
    if (amount > MAX_PER_CLAIM) {
      amount = MAX_PER_CLAIM;
      notes.push(`Capped at ${MAX_PER_CLAIM} SOL per claim.`);
    }

    const already = claims.usedInWindow("faucet", userId) / LAMPORTS_PER_SOL;
    const remaining = MAX_PER_24H - already;

    if (remaining <= 0) {
      const wait = claims.msUntilReset("faucet", userId);
      return interaction.editReply(
        `You've already claimed your ${MAX_PER_24H} SOL for today. Try again in ${fmtHours(wait)}.`
      );
    }

    if (amount > remaining) {
      amount = remaining;
      notes.push(`Reduced to ${remaining.toFixed(3)} SOL \u2014 that's all you have left of your ${MAX_PER_24H} SOL/24h limit.`);
    }

    try {
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: treasury.publicKey,
          toPubkey: recipient,
          lamports,
        })
      );

      const signature = await sendAndConfirmTransaction(connection, tx, [treasury]);
      claims.record("faucet", userId, lamports);

      const lines = [
        `Sent **${(lamports / LAMPORTS_PER_SOL).toFixed(3)} devnet SOL** to \`${recipient.toBase58()}\`.`,
        `Tx: ${explorerTx(signature)}`,
      ];
      if (notes.length) lines.push("", ...notes);

      return interaction.editReply(lines.join("\n"));
    } catch (err) {
      console.error("faucet error:", err);
      const msg = String(err?.message || err);
      if (msg.includes("insufficient")) {
        return interaction.editReply(
          "The faucet treasury is out of devnet SOL right now \u2014 the server owner needs to top it up. Try again later."
        );
      }
      return interaction.editReply("Something went wrong sending the SOL. Try again in a moment.");
    }
  },
};
