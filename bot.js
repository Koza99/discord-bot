// ===== HTTP SERVER (WYMAGANY DLA RENDER) =====
const http = require("http");
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Discord bot działa");
}).listen(PORT, () => {
  console.log("🌐 HTTP server działa na porcie", PORT);
});

// ===== DISCORD =====
const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder 
} = require("discord.js");

// Node 18+ ma fetch wbudowany
const API_URL = "https://rozklady.skarzysko.pl/getRunningVehicles.json";

// ===== KONFIG =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const PING_ROLE_ID = process.env.PING_ROLE_ID;

// ===== OPISY POJAZDÓW =====
const vehicleDescriptions = {
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
  "459": "MAN NL313 Lion`s City",
  "460": "MAN NÜ273 Lion`s City Ü",
  "461": "MAN NÜ273 Lion`s City Ü",
  "462": "MAN NL313 Lion`s City",
  "465": "MAN NL313 Lion`s City",
  "467": "MAN NÜ313 Lion`s City Ü",
  "468": "MAN NÜ313 Lion`s City Ü",
  "469": "MAN NL243 Lion`s City",
  "470": "MAN NÜ313 Lion`s City Ü",
  "471": "MAN NL263",
  "472": "MAN NL263 Lion`s City",
  "473": "MAN NL263 Lion`s City",
  "474": "MAN NL273 Lion`s City",
  "475": "MAN NL293 Lion`s City",
  "476": "MAN NL293 Lion`s City",
  "477": "Autosan M12LF.01",
  "478": "Autosan M12LE.V02"
};

// ===== POJAZDY Z ALERTEM =====
const ALERT_VEHICLES = [
  "441", "442", "443", "445", "451",
  "452", "453", "456", "457", "471"
];

// ===== STAN =====
let lastVehicles = new Set();

// ===== POBIERANIE API =====
async function fetchVehicles() {
  const res = await fetch(API_URL);
  const data = await res.json();

  if (!Array.isArray(data)) return [];
  return data;
}

// ===== CHECK CO 10 MIN =====
async function checkVehicles() {
  try {
    const vehicles = await fetchVehicles();
    const current = new Set();

    for (const v of vehicles) {
      const id = String(v.vehicleID);
      current.add(id);

      // ALERT TYLKO DLA WYBRANYCH
      if (ALERT_VEHICLES.includes(id) && !lastVehicles.has(id)) {
        const channel = await client.channels.fetch(CHANNEL_ID);
        const desc = vehicleDescriptions[id] || "Nieznany pojazd";

        channel.send({
          content: `<@&${PING_ROLE_ID}> 🚍 **${id}** (${desc}) **wyjechał na linię ${v.lineName}**`
        });
      }
    }

    lastVehicles = current;
  } catch (err) {
    console.error("❌ Błąd checkVehicles:", err);
  }
}

// ===== SLASH COMMAND =====
const commands = [
  new SlashCommandBuilder()
    .setName("pojazdy")
    .setDescription("Lista aktualnie kursujących pojazdów")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("✅ Komendy zarejestrowane");
})();

// ===== INTERAKCJE =====
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "pojazdy") return;

  await interaction.deferReply();

  try {
    const vehicles = await fetchVehicles();

    if (vehicles.length === 0) {
      return interaction.editReply("❌ Brak danych z API");
    }

    const list = vehicles
      .sort((a, b) => String(a.vehicleID).localeCompare(String(b.vehicleID)))
      .map(v => {
        const desc = vehicleDescriptions[v.vehicleID] || "Nieznany pojazd";
        return `**${v.vehicleID}** (${desc}) — linia **${v.lineName}**`;
      })
      .join("\n");

    interaction.editReply(list);
  } catch {
    interaction.editReply("❌ Błąd pobierania danych");
  }
});

// ===== READY =====
client.once("ready", () => {
  console.log(`🤖 Bot online: ${client.user.tag}`);
  setInterval(checkVehicles, 10 * 60 * 1000);
  checkVehicles();
});

client.login(TOKEN);
