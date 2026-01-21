// ================= HTTP KEEP-ALIVE (RENDER) =================
const http = require("http");
const PORT = process.env.PORT || 10000;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("OK");
}).listen(PORT);

// ================= DISCORD =================
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

// ================= ENV =================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const PING_ROLE_ID = process.env.PING_ROLE_ID;

// ================= API =================
const API_URL = "https://rozklady.skarzysko.pl/getRunningVehicles.json";

// ================= OPISY POJAZDÓW =================
const vehicleDescriptions = {
  "441": "MAN NL263",
  "442": "MAN NL263",
  "443": "MAN NL263",
  "445": "MAN NL263",
  "452": "MAN NL263",
  "453": "MAN NL313",
  "455": "MAN NL313",
  "456": "MAN NL313",
  "457": "MAN NL313",
  "471": "MAN NL263"
};

// ================= ALERTY (PING ROLI) =================
const ALERT_VEHICLES = [
  "441",
  "442",
  "443",
  "445",
  "452",
  "453",
  "455", // ← DODANY
  "456",
  "457",
  "471"
];

// ================= STAN =================
let lastVehicles = new Set();
let history = [];

// ================= SAFE FETCH =================
async function fetchVehicles() {
  try {
    const res = await fetch(API_URL, { timeout: 10000 });
    const data = await res.json();

    if (!data || !Array.isArray(data.vehicles)) return [];
    return data.vehicles;
  } catch (err) {
    console.error("⚠️ API error:", err.message);
    return [];
  }
}

// ================= CHECK =================
async function checkVehicles() {
  const vehicles = await fetchVehicles();
  if (!vehicles.length) return;

  const current = new Set();

  for (const v of vehicles) {
    if (!v.vehicleId || !v.lineName) continue;

    const id = String(v.vehicleId);
    current.add(id);

    if (!lastVehicles.has(id)) {
      const desc = vehicleDescriptions[id] || "Nieznany pojazd";
      const text = `🚍 **${id}** (${desc}) wyjechał na linię **${v.lineName}**`;

      history.unshift({
        time: new Date().toLocaleString("pl-PL"),
        text
      });
      history = history.slice(0, 50);

      const channel = await client.channels.fetch(CHANNEL_ID);

      const ping =
        ALERT_VEHICLES.includes(id) && PING_ROLE_ID
          ? `<@&${PING_ROLE_ID}> `
          : "";

      await channel.send(ping + text);
    }
  }

  lastVehicles = current;
}

// ================= KOMENDY =================
const commands = [
  new SlashCommandBuilder()
    .setName("pojazdy")
    .setDescription("Lista aktualnie jeżdżących pojazdów"),
  new SlashCommandBuilder()
    .setName("historia")
    .setDescription("Historia wyjazdów")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();

// ================= INTERACTIONS =================
client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;

  if (i.commandName === "pojazdy") {
    const v = await fetchVehicles();
    if (!v.length) return i.reply("❌ Brak danych z API");

    const text = v
      .map(x => {
        const id = String(x.vehicleId);
        const d = vehicleDescriptions[id] || "Nieznany pojazd";
        return `**${id}** (${d}) — linia **${x.lineName}**`;
      })
      .join("\n");

    return i.reply(text);
  }

  if (i.commandName === "historia") {
    if (!history.length) return i.reply("📭 Brak danych");

    return i.reply(
      history.map(h => `🕒 ${h.time}\n${h.text}`).join("\n\n")
    );
  }
});

// ================= READY =================
client.once("ready", () => {
  console.log(`🤖 Online: ${client.user.tag}`);
  checkVehicles();
  setInterval(checkVehicles, 10 * 60 * 1000);
});

client.login(TOKEN);
