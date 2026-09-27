require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
const { REST, Routes } = require("discord.js");
const faucet = require("./commands/faucet");
const createtoken = require("./commands/createtoken");

const commands = [faucet.data.toJSON(), createtoken.data.toJSON()];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const guildId = process.env.DISCORD_GUILD_ID;

    const route = guildId
      ? Routes.applicationGuildCommands(clientId, guildId)
      : Routes.applicationCommands(clientId);

    const data = await rest.put(route, { body: commands });
    console.log(`Registered ${data.length} command(s)${guildId ? " to your test server" : " globally"}.`);
  } catch (err) {
    console.error(err);
  }
})();
