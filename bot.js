require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* ===== MAPA TABORU ===== */
const vehiclesMap = {
  "ZS01": "Solaris Urbino 10,5",
  "ZS02": "Solaris Urbino 10,5",
  "ZS03": "Solaris Urbino 10,5",
  "ZS04": "Solaris Urbino 10,5",
  "ZS05": "Solaris Urbino 10,5",
  "ZS06": "Solaris Urbino 10,5",
  "ZS07": "Solaris Urbino 10,5",
  "ZS08": "Solaris Urbino 10,5",

  "441": "MAN NL263",
  "442": "MAN NL263",
  "443": "MAN NL263",
  "445": "MAN NL263",
  "451": "MAN NL263",
  "452": "MAN NL263",
  "453": "MAN NL313",
  "455": "MAN NL313",
  "456": "MAN NL313",
  "457": "MAN NL313",
  "459": "MAN NL313 Lion’s City",
  "460": "MAN NÜ273 Lion’s City Ü",
  "461": "MAN NÜ273 Lion’s City Ü",
  "462": "MAN NL313 Lion’s City",
  "465": "MAN NL313 Lion’s City",
  "467": "MAN NÜ313 Lion’s City Ü",
  "468": "MAN NÜ313 Lion’s City Ü",
  "469": "MAN NL243 Lion’s City",
  "470": "MAN NÜ313 Lion’s City Ü",
  "471": "MAN NL263",
  "472": "MAN NL263 Lion’s City",
  "473": "MAN NL263 Lion’s City",
  "474": "MAN NL273 Lion’s City",
  "475": "MAN NL293 Lion’s City",
  "476": "MAN NL293 Lion’s City",
  "477": "Autosan M12LF.01",
  "478": "Autosan M12LE.V02"
};

/* ===== KOMENDA ===== */
const command = new SlashCommandBuilder()
  .setName("pojazdy")
  .setDescription("Lista aktywnych pojazdów");

client.once("ready", async () => {
  console.log(`🤖 Bot online: ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID,
      process.env.GUILD_ID
    ),
    { body: [command.toJSON()] }
  );

  console.log("✅ /pojazdy zarejestrowane");
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "pojazdy") return;

  await interaction.deferReply();

  try {
    const res = await fetch(
      "https://rozklady.skarzysko.pl/getRunningVehicles.json",
      {
        headers: {
          "User-Agent": "DiscordBot"
        }
      }
    );

    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }

    const data = await res.json();

    const list = data
      .sort((a, b) => String(a.vehicleID).localeCompare(String(b.vehicleID)))
      .map(v => {
        const desc = vehiclesMap[v.vehicleID] || "nieznany typ";
        return `**${v.vehicleID}** (${desc}) — linia **${v.lineName}**`;
      });

    if (!list.length) {
      return interaction.editReply("Brak aktywnych pojazdów.");
    }

    await interaction.editReply(list.join("\n"));
  } catch (err) {
    console.error("API ERROR:", err);
    await interaction.editReply("❌ Błąd pobierania danych.");
  }
});

client.login(process.env.TOKEN);
