const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} = require("discord.js");
const {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
  AuthorityType,
} = require("@solana/spl-token");
const { connection, treasury, parsePublicKey, explorerAddress, explorerTx } = require("../lib/solana");
const claims = require("../lib/claims");

const MAX_PER_24H = Number(process.env.TOKEN_CREATIONS_MAX_PER_24H || 3);
const MODAL_ID = "createtoken-modal";

module.exports = {
  data: new SlashCommandBuilder().setName("createtoken").setDescription("Create your own SPL token on devnet"),

  async execute(interaction) {
    const used = claims.countInWindow("createtoken", interaction.user.id);
    if (used >= MAX_PER_24H) {
      return interaction.reply({
        content: `You've created ${MAX_PER_24H} tokens in the last 24h, which is the limit. Try again later.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = new ModalBuilder().setCustomId(MODAL_ID).setTitle("Create a devnet token");

    const name = new TextInputBuilder()
      .setCustomId("name")
      .setLabel("Token name")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("e.g. Blue Brick")
      .setRequired(true)
      .setMaxLength(32);

    const symbol = new TextInputBuilder()
      .setCustomId("symbol")
      .setLabel("Symbol")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("e.g. BRICK")
      .setRequired(true)
      .setMaxLength(10);

    const decimals = new TextInputBuilder()
      .setCustomId("decimals")
      .setLabel("Decimals (0-9)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("9")
      .setRequired(true)
      .setMaxLength(1);

    const supply = new TextInputBuilder()
      .setCustomId("supply")
      .setLabel("Total supply")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("1000000")
      .setRequired(true)
      .setMaxLength(20);

    const address = new TextInputBuilder()
      .setCustomId("address")
      .setLabel("Your devnet wallet address")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Where the supply gets minted to")
      .setRequired(true)
      .setMaxLength(64);

    modal.addComponents(
      new ActionRowBuilder().addComponents(name),
      new ActionRowBuilder().addComponents(symbol),
      new ActionRowBuilder().addComponents(decimals),
      new ActionRowBuilder().addComponents(supply),
      new ActionRowBuilder().addComponents(address)
    );

    await interaction.showModal(modal);
  },

  modalId: MODAL_ID,

  async handleModal(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const name = interaction.fields.getTextInputValue("name").trim();
    const symbol = interaction.fields.getTextInputValue("symbol").trim().toUpperCase();
    const decimalsRaw = interaction.fields.getTextInputValue("decimals").trim();
    const supplyRaw = interaction.fields.getTextInputValue("supply").trim();
    const addressRaw = interaction.fields.getTextInputValue("address").trim();

    const decimals = Number(decimalsRaw);
    const supply = Number(supplyRaw);
    const recipient = parsePublicKey(addressRaw);

    if (!recipient) {
      return interaction.editReply("That wallet address doesn't look valid. Run `/createtoken` again with a correct devnet address.");
    }
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 9) {
      return interaction.editReply("Decimals has to be a whole number from 0 to 9.");
    }
    if (!Number.isFinite(supply) || supply <= 0 || !Number.isInteger(supply)) {
      return interaction.editReply("Total supply has to be a positive whole number.");
    }

    const userId = interaction.user.id;
    const used = claims.countInWindow("createtoken", userId);
    if (used >= MAX_PER_24H) {
      return interaction.editReply(`You've created ${MAX_PER_24H} tokens in the last 24h, which is the limit. Try again later.`);
    }

    try {
      const mint = await createMint(
        connection,
        treasury, // payer
        treasury.publicKey, // mint authority (revoked below after minting)
        null, // freeze authority
        decimals
      );

      const ata = await getOrCreateAssociatedTokenAccount(connection, treasury, mint, recipient);

      const mintAmount = BigInt(supply) * BigInt(10 ** decimals);
      const mintSig = await mintTo(connection, treasury, mint, ata.address, treasury, mintAmount);

      // Fixed supply: give up mint authority once the initial supply is out.
      await setAuthority(connection, treasury, mint, treasury.publicKey, AuthorityType.MintTokens, null);

      claims.record("createtoken", userId, 1);

      const lines = [
        `Created **${name} (${symbol})** on devnet.`,
        `Mint address: \`${mint.toBase58()}\``,
        `Minted ${supply.toLocaleString()} ${symbol} to \`${recipient.toBase58()}\`.`,
        `Mint authority revoked \u2014 supply is fixed.`,
        `Mint: ${explorerAddress(mint.toBase58())}`,
        `Mint tx: ${explorerTx(mintSig)}`,
      ];

      return interaction.editReply(lines.join("\n"));
    } catch (err) {
      console.error("createtoken error:", err);
      const msg = String(err?.message || err);
      if (msg.includes("insufficient")) {
        return interaction.editReply(
          "The bot's treasury is out of devnet SOL to pay for rent right now \u2014 the server owner needs to top it up. Try again later."
        );
      }
      return interaction.editReply("Something went wrong creating the token. Try again in a moment.");
    }
  },
};
