require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== MAPA TABORU =====
const vehicleNames = {
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
  "459": "MAN NL313 Lion's City",
  "460": "MAN NÜ273 Lion's City Ü",
  "461": "MAN NÜ273 Lion's City Ü",
  "462": "MAN NL313 Lion's City",
  "465": "MAN NL313 Lion's City",
  "467": "MAN NÜ313 Lion's City Ü",
  "468": "MAN NÜ313 Lion's City Ü",
  "469": "MAN NL243 Lion's City",
  "470": "MAN NÜ313 Lion's City Ü",
  "471": "MAN NL263",
  "472": "MAN NL263 Lion's City",
  "473": "MAN NL263 Lion's City",
  "474": "MAN NL273 Lion's City",
  "475": "MAN NL293 Lion's City",
  "476": "MAN NL293 Lion's City",
  "477": "Autosan M12LF.01",
  "478": "Autosan M12LE.V02"
};

// ===== KOMENDA =====
const commands = [
  new SlashCommandBuilder()
    .setName("pojazdy")
    .setDescription("Aktywne pojazdy z linii")
    .toJSON()
];

// ===== REJESTRACJA SLASH =====
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID,
      process.env.GUILD_ID
    ),
    { body: commands }
  );
  console.log("✅ /pojazdy zarejestrowane");
})();

// ===== READY =====
client.once("ready", () => {
  console.log(`🤖 Bot online: ${client.user.tag}`);
});

// ===== OBSŁUGA KOMENDY =====
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "pojazdy") return;

  await interaction.deferReply();

  try {
    const res = await fetch("https://rozklady.skarzysko.pl/getRunningVehicles.json");
    const data = await res.json();

    if (!Array.isArray(data)) {
      return interaction.editReply("❌ Brak danych.");
    }

    const list = data
      .map(v => {
        const name = vehicleNames[v.vehicleID] || "Nieznany pojazd";
        return `${v.vehicleID} (${name}) — linia ${v.lineName}`;
      })
      .sort((a, b) => a.localeCompare(b, "pl", { numeric: true }));

    await interaction.editReply(
      list.length ? list.join("\n") : "🚫 Brak aktywnych pojazdów"
    );

  } catch (err) {
    console.error(err);
    await interaction.editReply("❌ Błąd połączenia z API.");
  }
});

client.login(process.env.TOKEN);
