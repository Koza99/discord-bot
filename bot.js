// ====== TLS FIX ======
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const fetch = require("node-fetch");

// ================= KONFIG =================
const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const GUILD_ID = process.env.GUILD_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const INTERVAL = parseInt(process.env.INTERVAL) || 600000;
const URL = "https://rozklady.skarzysko.pl/getRunningVehicles.json";
// ==========================================

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================== MAPA TABORU ==================
const vehicleMap = {
  "ZS01":"Solaris Urbino 10,5","ZS02":"Solaris Urbino 10,5","ZS03":"Solaris Urbino 10,5",
  "ZS04":"Solaris Urbino 10,5","ZS05":"Solaris Urbino 10,5","ZS06":"Solaris Urbino 10,5",
  "ZS07":"Solaris Urbino 10,5","ZS08":"Solaris Urbino 10,5","441":"MAN NL263","442":"MAN NL263",
  "443":"MAN NL263","445":"MAN NL263","451":"MAN NL263","452":"MAN NL263","453":"MAN NL313",
  "455":"MAN NL313","456":"MAN NL313","457":"MAN NL313","459":"MAN NL313 Lion`s City",
  "460":"MAN NÜ273 Lion`s City Ü","461":"MAN NÜ273 Lion`s City Ü","462":"MAN NL313 Lion`s City",
  "465":"MAN NL313 Lion`s City","467":"MAN NÜ313 Lion`s City Ü","468":"MAN NÜ313 Lion`s City Ü",
  "469":"MAN NL243 Lion`s City","470":"MAN NÜ313 Lion`s City Ü","471":"MAN NL263",
  "472":"MAN NL263 Lion`s City","473":"MAN NL263 Lion`s City","474":"MAN NL273 Lion`s City",
  "475":"MAN NL293 Lion`s City","476":"MAN NL293 Lion`s City","477":"Autosan M12LF.01",
  "478":"Autosan M12LE.V02"
};

// ================== FUNKCJA POBIERANIA POJAZDÓW ==================
async function pobierzPojazdy() {
  try {
    const res = await fetch(URL, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    if (!res.ok) return `❌ API zwróciło błąd HTTP ${res.status}`;

    const data = await res.json();
    if (!Array.isArray(data.vehicles)) return "❌ Niepoprawny format danych z API";

    return data.vehicles
      .map(v => {
        const id = String(v.vehicleId).trim();
        return { id, linia: v.lineName, opis: vehicleMap[id] || "Nieznany pojazd" };
      })
      .sort((a, b) => {
        // alfanumeryczne sortowanie liter+liczby
        const rx = /^([A-Z]+)?(\d+)$/;
        const ma = a.id.match(rx);
        const mb = b.id.match(rx);

        if (ma && mb) {
          if ((ma[1] || "") !== (mb[1] || "")) return (ma[1] || "").localeCompare(mb[1] || "");
          return parseInt(ma[2]) - parseInt(mb[2]);
        }
        return a.id.localeCompare(b.id, "pl", { numeric: true });
      })
      .map(v => `🚍 ${v.id} (${v.opis}) — linia ${v.linia}`)
      .join("\n");

  } catch (e) {
    console.error("FETCH ERROR:", e);
    return "❌ Nie udało się połączyć z API.";
  }
}

// ================== SLASH COMMAND ==================
const commands = [
  new SlashCommandBuilder()
    .setName("pojazdy")
    .setDescription("Lista aktualnie kursujących pojazdów")
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ /pojazdy zarejestrowane");
  } catch (e) {
    console.error("Błąd rejestracji komendy:", e);
  }
})();

// ================== OBSŁUGA KOMEND ==================
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "pojazdy") {
    try {
      await interaction.reply("⏳ Pobieram dane...");
      const txt = await pobierzPojazdy();
      await interaction.editReply(txt.length > 1900 ? txt.slice(0, 1900) : txt);
    } catch (e) {
      console.error("INTERACTION ERROR:", e);
      if (!interaction.replied) await interaction.reply("❌ Wystąpił błąd.");
    }
  }
});

// ================== AUTO WIADOMOŚCI CO 10 MINUT ==================
client.once("ready", async () => {
  console.log(`🤖 Bot online: ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID);

  setInterval(async () => {
    const txt = await pobierzPojazdy();
    await channel.send(`📡 **Aktywne pojazdy:**\n${txt}`);
  }, INTERVAL);
});

// ================== LOGIN ==================
client.login(TOKEN);
