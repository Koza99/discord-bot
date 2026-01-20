require("dotenv").config();
const fs = require("fs");

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

/* ===== ŚLEDZONE POJAZDY ===== */
const trackedVehicles = [
  "441","442","443","445","451",
  "452","453","456","457","471"
];

let lastActiveVehicles = new Set();

/* ===== HISTORIA ===== */
const HISTORY_FILE = "./history.json";
let history = [];

if (fs.existsSync(HISTORY_FILE)) {
  history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
}

/* ===== KOMENDY ===== */
const commands = [
  new SlashCommandBuilder()
    .setName("pojazdy")
    .setDescription("Lista aktywnych pojazdów"),

  new SlashCommandBuilder()
    .setName("historia")
    .setDescription("Ostatnie wyjazdy śledzonych pojazdów")
];

client.once("clientReady", async () => {
  console.log(`🤖 Bot online: ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID,
      process.env.GUILD_ID
    ),
    { body: commands.map(c => c.toJSON()) }
  );

  console.log("✅ Komendy zarejestrowane");

  setInterval(checkVehicles, 60 * 1000);
});

/* ===== FUNKCJA POBIERANIA ===== */
async function fetchVehicles() {
  const res = await fetch(
    "https://rozklady.skarzysko.pl/getRunningVehicles.json",
    { headers: { "User-Agent": "DiscordBot" } }
  );

  const data = await res.json();

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.vehicles)) return data.vehicles;

  throw new Error("Nieznany format API");
}

/* ===== OBSŁUGA KOMEND ===== */
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "pojazdy") {
    await interaction.deferReply();

    try {
      const vehicles = await fetchVehicles();

      const list = vehicles
        .sort((a,b)=>String(a.vehicleID).localeCompare(String(b.vehicleID)))
        .map(v =>
          `**${v.vehicleID}** (${vehiclesMap[v.vehicleID] || "?"}) — linia **${v.lineName}**`
        );

      await interaction.editReply(
        list.length ? list.join("\n") : "Brak aktywnych pojazdów."
      );
    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ Błąd pobierania danych.");
    }
  }

  if (interaction.commandName === "historia") {
    if (!history.length) {
      return interaction.reply("Brak zapisanych wyjazdów.");
    }

    const last = history.slice(-10).reverse();

    interaction.reply(
      last.map(h =>
        `🚍 **${h.id}** (${h.desc}) — linia **${h.line}** o **${h.time}**`
      ).join("\n")
    );
  }
});

/* ===== MONITOR ===== */
async function checkVehicles() {
  try {
    const vehicles = await fetchVehicles();
    const current = new Set(vehicles.map(v => String(v.vehicleID)));

    const channel = await client.channels.fetch(process.env.CHANNEL_ID);
    const rolePing = `<@&${process.env.ROLE_ID}>`;

    for (const id of trackedVehicles) {
      if (current.has(id) && !lastActiveVehicles.has(id)) {
        const vehicle = vehicles.find(v => String(v.vehicleID) === id);
        if (!vehicle) continue;

        const desc = vehiclesMap[id] || "?";
        const time = new Date().toLocaleTimeString("pl-PL");

        history.push({
          id,
          desc,
          line: vehicle.lineName,
          time
        });

        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

        await channel.send(
          `${rolePing}\n🚍 **${id}** (${desc}) wyjechał na linię **${vehicle.lineName}** o **${time}**`
        );
      }
    }

    lastActiveVehicles = current;
  } catch (err) {
    console.error("Monitor error:", err.message);
  }
}

client.login(process.env.TOKEN);
