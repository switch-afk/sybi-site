// Reads the repo's root .env instead of a separate bot/.env, since
// everything lives in one repo now.
require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
const { Client, GatewayIntentBits, Collection, MessageFlags } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const faucet = require("./commands/faucet");
const createtoken = require("./commands/createtoken");

for (const cmd of [faucet, createtoken]) {
  client.commands.set(cmd.data.name, cmd);
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === createtoken.modalId) {
        await createtoken.handleModal(interaction);
      }
      return;
    }
  } catch (err) {
    console.error("interaction error:", err);
    const payload = { content: "Something went wrong. Try again in a moment.", flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
