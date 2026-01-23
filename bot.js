// ================= KEEP ALIVE (RENDER) =================
const http = require("http");
const PORT = process.env.PORT || 10000;
http.createServer((_, res) => {
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

// ================= ALERTY =================
const ALERT_VEHICLES = [
  "441", "442", "443", "445",
  "452", "453", "455",
  "456", "457", "471"
];

// ================= STAN =================
let lastVehicles = new Set();
let history = [];

// ================= FETCH =================
async function fetchVehicles() {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    const data = await res.json();

    if (Array.isArray(data)) return data;
    if (Array.isArray(data.vehicles)) return data.vehicles;

    return [];
  } catch {
    return [];
  }
}

// ================= SORT =================
function sortVehicles(a, b) {
  const A = String(a.vehicleID || a.vehicleId);
  const B = String(b.vehicleID || b.vehicleId);

  const isZS_A = A.startsWith("ZS");
  const isZS_B = B.startsWith("ZS");

  if (isZS_A && !isZS_B) return -1;
  if (!isZS_A && isZS_B) return 1;

  const numA = parseInt(A.replace(/\D/g, ""));
  const numB = parseInt(B.replace(/\D/g, ""));

  return numA - numB;
}

// ================= LISTA CO 10 MIN =================
async function sendVehicleList() {
  const vehicles = await fetchVehicles();
  if (!vehicles.length) return;

  const text = vehicles
    .sort(sortVehicles)
    .map(v => {
      const id = String(v.vehicleID || v.vehicleId);
      if (id === "451") return null;

      const desc = vehicleDescriptions[id] || "Nieznany pojazd";
      return `**${id}** (${desc}) — linia **${v.lineName}**`;
    })
    .filter(Boolean)
    .join("\n");

  const channel = await client.channels.fetch(CHANNEL_ID);
  await channel.send(`📋 **Aktualnie jeżdżące pojazdy:**\n${text}`);
}

// ================= ALERTY WYJAZDU =================
async function checkVehicles() {
  const vehicles = await fetchVehicles();
  if (!vehicles.length) return;

  const current = new Set();

  for (const v of vehicles) {
    const id = String(v.vehicleID || v.vehicleId);
    if (!id || id === "451") continue;

    current.add(id);

    // 🚨 ALERT TYLKO DLA WYBRANYCH
    if (!ALERT_VEHICLES.includes(id)) continue;

    if (!lastVehicles.has(id)) {
      const desc = vehicleDescriptions[id] || "Nieznany pojazd";
      const text = `🚍 **${id}** (${desc}) wyjechał na linię **${v.lineName}**`;

      history.unshift({
        time: new Date().toLocaleString("pl-PL"),
        text
      });
      history = history.slice(0, 50);

      const channel = await client.channels.fetch(CHANNEL_ID);
      await channel.send(`<@&${PING_ROLE_ID}> ${text}`);
    }
  }

  lastVehicles = current;
}

// ================= KOMENDY =================
const commands = [
  new SlashCommandBuilder().setName("pojazdy").setDescription("Lista jeżdżących pojazdów"),
  new SlashCommandBuilder().setName("historia").setDescription("Historia alertów")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();

client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;

  if (i.commandName === "pojazdy") {
    const v = await fetchVehicles();
    if (!v.length) return i.reply("❌ Brak danych z API");

    const text = v
      .sort(sortVehicles)
      .map(x => {
        const id = String(x.vehicleID || x.vehicleId);
        if (id === "451") return null;
        const d = vehicleDescriptions[id] || "Nieznany pojazd";
        return `**${id}** (${d}) — linia **${x.lineName}**`;
      })
      .filter(Boolean)
      .join("\n");

    return i.reply(text);
  }

  if (i.commandName === "historia") {
    if (!history.length) return i.reply("📭 Brak historii");
    return i.reply(
      history.map(h => `🕒 ${h.time}\n${h.text}`).join("\n\n")
    );
  }
});

// ================= READY =================
client.once("ready", () => {
  console.log(`🤖 Bot online: ${client.user.tag}`);

  checkVehicles();
  sendVehicleList();

  setInterval(checkVehicles, 60 * 1000);
  setInterval(sendVehicleList, 10 * 60 * 1000);
});

client.login(process.env.DISCORD_TOKEN);


