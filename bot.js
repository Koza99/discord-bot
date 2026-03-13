require("dns").setDefaultResultOrder("ipv4first");

// ================= KEEP ALIVE (RENDER) =================
const http = require("http");
const PORT = process.env.PORT || 10000;
http.createServer((_, res) => {
  res.writeHead(200);
  res.end("OK");
}).listen(PORT, () => {
  console.log("🌐 HTTP server działa na porcie", PORT);
});

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

console.log("LOGIN TOKEN LENGTH:", TOKEN?.length);

// ================= API =================
const API_URL = "https://rozklady.skarzysko.pl/getRunningVehicles.json";

// ================= ROZKŁAD BRYGAD =================
const ROZKLAD = [];

const rawRozklad = `
P07
9 MKS (7:19) -> Rycerska (7:43)
9 Rycerska (7:46) -> MKS (8:18)
----PRZERWA----
22 MKS (12:50) -> Rycerska (13:22)
22 Rycerska (13:24) -> MKS (13:56)
9 MKS (14:14) -> Rycerska (14:38)
9 Rycerska (14:41) -> MKS (15:13)
9 MKS (15:16) -> Rycerska (15:40)
9 Rycerska (15:42) -> MKS (16:14)


P08 (MKS)
9 MKS (5:45) -> Rycerska (6:09)
9 Rycerska (6:26) -> MKS (6:58)
12 Szydłowiecka (7:30) -> Wojska Polskiego (8:03)
12 Wojska Polskiego (8:03) -> Wiejska Przychodnia (8:41)
14 Wiejska Przychodnia (8:45) -> Młodzawy (9:06)
14 Młodzawy (9:20) -> Wiejska Przychodnia (9:39)
12 Wiejska Przychodnia (10:25) -> Wojska Polskiego (11:07)
12 Wojska Polskiego (11:13) -> Wiejska Przychodnia (11:51)
15 Wiejska Przychodnia (12:08) -> Asfaltowa (12:34)
15 Asfaltowa (12:36) -> Wiejska Przychodnia (13:02)
12 Wiejska Przychodnia (13:12) -> Wojska Polskiego (13:54)
12 Wojska Polskiego (14:13) -> Wiejska Przychodnia (14:51)
7 Wiejska Przychodnia (15:06) -> Krakowska (15:33)
7 Krakowska (15:50) -> Wiejska Przychodnia (16:17)
14 Wiejska Przychodnia (16:40) -> Młodzawy (17:01)
14 Młodzawy (17:10) -> Szydłowiecka (17:27)
7 Szydłowiecka (17:35) -> Krakowska (18:00)
7 Krakowska (18:31) -> Szydłowiecka (18:56)
7 Szydłowiecka (19:08) -> Kilińskiego (19:39)
7 Kilińskiego (19:40) -> Szydłowiecka (20:08)
7 Szydłowiecka (20:15) -> Kilińskiego (20:42)
7 Kilińskiego (20:53) -> Szydłowiecka (21:21)
7 Szydłowiecka (21:35) -> Kilińskiego (22:08)
7 Kilińskiego (22:13) -> Szydłowiecka (22:48)


P09 (MKS)
25 MKS (5:25) -> Wojska Polskiego (6:02)
12 Wojska Polskiego (6:09) -> Wiejska Przychodnia (6:40)
15 Wiejska Przychodnia (7:12) -> Asfaltowa (7:38)
15 Asfaltowa (7:38) -> Wiejska Przychodnia (8:04)
12 Wiejska Przychodnia (8:28) -> Wojska Polskiego (9:10)
12 Wojska Polskiego (9:18) -> Wiejska Przychodnia (9:56)
7 Wiejska Przychodnia (10:03) -> Krakowska (12:30)
7 Krakowska (10:54) -> Wiejska Przychodnia (11:21)
12 Wiejska Przychodnia (11:23) -> Wojska Polskiego (12:05)
12 Wojska Polskiego (12:13) -> Wiejska Przychodnia (12:51)
15 Wiejska Przychodnia (13:03) -> Asfaltowa (13:29)
15 Asfaltowa (13:36) -> Wiejska Przychodnia (14:02)
12 Wiejska Przychodnia (14:25) -> Wojska Polskiego (15:07)
12 Wojska Polskiego (15:22) -> Wiejska Przychodnia (16:00)
7 Wiejska Przychodnia (16:05) -> Krakowska (16:36)
7 Krakowska (16:50) -> Wiejska Przychodnia (17:17)
12 Wiejska Przychodnia (17:32) -> Wojska Polskiego (18:14)
12 Wojska Polskiego (18:38) -> Szydłowiecka (19:07)

P10
8 MKS (5:20) -> Szydłowiecka (5:56)
12 Szydłowiecka (6:20) -> Wojska Polskiego (6:50)
12 Wojska Polskiego (7:00) -> Wiejska Przychodnia (7:46)
14 Wiejska Przychodnia (7:48) -> Młodzawy (8:19)
14 Młodzawy (8:29) -> Wiejska Przychodnia (8:56) 
15 Wiejska Przychodnia (9:18) -> Asfaltowa (9:44)
15 Asfaltowa (10:25) -> Wiejska Przychodnia (10:51)
15 Wiejska Przychodnia (11:08) -> Asfaltowa (11:34)
15 Asfaltowa (11:37) -> Wiejska Przychodnia (12:03)
12 Wiejska Przychodnia (12:25) -> Wojska Polskiego (13:07)
12 Wojska Polskiego (13:15) -> Wiejska Przychodnia (13:53)
15 Wiejska Przychodnia (13:55) -> Asfaltowa (14:21)
15 Asfaltowa (14:34) -> Wiejska Przychodnia (15:00)
14 Wiejska Przychodnia (15:15) -> Jaracza (15:42)
14 Jaracza (16:00) -> Szydłowiecka (16:23)

P11 (MKS)
14 Szydłowiecka (5:40) -> Młodzawy (6:08)
14 Młodzawy (6:16) -> Wiejska Przychodnia (6:44)
7 Wiejska Przychodnia (6:53) -> Krakowska (7:20)
7 Krakowska (7:23) -> Wiejska Przychodnia (7:50)
7 Wiejska Przychodnia (8:07) -> Krakowska (8:34)
7 Krakowska (8:40) -> Wiejska Przychodnia (9:07)
7 Wiejska Przychodnia (9:10) -> Krakowska (9:37)
7 Krakowska (9:50) -> Wiejska Przychodnia (10:17)
14 Wiejska Przychodnia (10:38) -> Młodzawy (10:59)
14 Młodzawy (11:10) -> Wiejska Przychodnia (11:29)
14 Wiejska Przychodnia (11:40) -> Jaracza (12:06)
14 Jaracza (12:13) -> Wiejska Przychodnia (12:37)
7 Wiejska Przychodnia (12:53) -> Krakowska (13:20)
7 Krakowska (13:50) -> Wiejska Przychodnia (14:17)
14 Wiejska Przychodnia (14:38) -> Młodzawy (15:08)
14 Młodzawy (15:15) -> Wiejska Przychodnia (15:42)
14 Wiejska Przychodnia (15:50) -> Jaracza (16:16)
14 Jaracza (16:22) -> Wiejska Przychodnia (16:46)
15 Wiejska Przychodnia (17:15) -> Asfaltowa (17:41)
15 Asfaltowa (18:00) -> Wiejska Przychodnia (18:26)
15 Wiejska Przychodnia (18:30) -> Asfaltowa (18:56)
15 Asfaltowa (19:00) -> Szydłowiecka (19:24)
1 Szydłowiecka (19:30) -> Wysypisko (19:58)
1 Wysypisko (20:15) -> Szydłowiecka (20:44)
1 Szydłowiecka (20:50) -> Langiewicza (21:16)
1 Langiewicza (21:25) -> Szydłowiecka (21:51)
1 Szydłowiecka (22:06) -> Langiewicza (22:32)

P12 (MKS)
15 Szydłowiecka (6:02) -> Asfaltowa (6:26)
15 Asfaltowa (6:26) -> Wiejska Przychodnia (6:52)
7 Wiejska Przychodnia (6:55) -> Młodzawy (7:25)
7 Młodzawy (7:25) -> Wiejska Przychodnia (7:58)
15 Wiejska Przychodnia (8:15) -> Asfaltowa (8:41)
15 Asfaltowa (9:00) -> Wiejska Przychodnia (9:26)
1 Wiejska Przychodnia (9:35) -> Langiewicza (10:03)
1 Langiewicza (10:20) -> Wiejska Przychodnia (10:48)
26 Szydłowiecka (11:02) -> Paryska (11:20)
26 Paryska (11:28) -> Szydłowiecka (11:46)
7 Szydłowiecka (11:53) -> Krakowska (12:18)
7 Krakowska (12:50) -> Wiejska Przychodnia (13:17)
7 Wiejska Przychodnia (13:40) -> Jaracza (14:07)
7 Jaracza (14:14) -> Wiejska Przychodnia (14:39)
15 Wiejska Przychodnia (14:50) -> Asfaltowa (15:16)
15 Asfaltowa (15:23) -> Wiejska Przychodnia (15:49)
1 Wiejska Przychodnia (16:20) -> Wysypisko (16:50)
1 Wysypisko (17:10) -> Wiejska Przychodnia (17:41)
7 Wiejska Przychodnia (17:48) -> Młodzawy (18:18)
7 Młodzawy (18:20) -> Szydłowiecka (18:45)
7 Szydłowiecka (19:02) -> Młodzawy (19:31)
7 Młodzawy (19:32) -> Szydłowiecka (19:57)
7 Szydłowiecka (20:05) -> Młodzawy (20:33)
7 Młodzawy (20:39) -> Szydłowiecka (21:04)
1 Szydłowiecka (21:20) -> Langiewicza (21:20)
8 MKS (22:18) -> Zakłady Metalowe nr.2 (22:45)
8 Zakłady Metalowe nr.2 (22:55) -> MKS (23:32)

P13
8 MKS (4:47) -> Zakłady Metalowe nr2 (4:54)
8 Zakłady Metalowe nr2 (4:57) -> MKS (5:22)
19 Langiewicza (6:05) -> Kilińskiego (6:38)
19 Kilińskiego (6:40) -> Wysypisko (7:14)
19 Wysypisko (7:18) -> Kilińskiego (7:54)
19 Kilińskiego (8:00) -> Wysypisko (8:39)
25 Langiewicza (9:54) -> Wojska Polskiego (10:35)
25 Wojska Polskiego (10:43) -> Langiewicza (11:12)
19 Langiewicza (11:20) -> Kilińskiego (11:53)
19 Kilińskiego (12:05) -> Langiewicza (12:37)
25 Langiewicza (12:55) -> Wojska Polskiego (13:29)
25 Wojska Polskiego (13:46) -> Langiewicza (14:15)
19 Langiewicza (14:33) -> Kilińskiego (15:06)
19 Kilińskiego (15:22) -> Langiewicza (15:54)

P14
25 MKS (5:40) -> Wojska Polskiego (6:10)
25 Wojska Polskiego (6:15) -> Langiewicza (6:44)
1 Langiewicza (6:52) -> Szydłowiecka (7:18)
1 Szydłowiecka (7:20) -> Langiewicza (7:46)
1 Langiewicza (9:06) -> Wiejska Przychodnia (9:37)
14 Wiejska Przychodnia (9:44) -> Jaracza (10:10)
14 Jaracza (10:11) -> Wiejska Przychodnia (10:35)
7 Wiejska Przychodnia (10:53) -> Krakowska (11:20)
7 Krakowska (11:50) -> Wiejska Przychodnia (12:17)
14 Wiejska Przychodnia (12:36) -> Młodzawy (13:06)
14 Młodzawy (13:08) -> Wiejska Przychodnia (13:35)
7 Wiejska Przychodnia (14:10) -> Krakowska (14:37)
7 Krakowska (14:50) -> Wiejska Przychodnia (15:17)
12 Wiejska Przychodnia (15:27) -> Wojska Polskiego (16:09)
12 Wojska Polskiego (16:11) -> Szydłowiecka (16:47)
7 Szydłowiecka (16:51) -> Kilińskiego (17:18)
7 Kilińskiego (17:36) -> Szydłowiecka (18:11)
26 Szydłowiecka (18:35) -> Paryska (18:53)
26 Paryska (19:05) -> Szydłowiecka (19:23)
12 Szydłowiecka (19:25) -> Wojska Polskiego (19:58)
25 Wojska Polskiego (20:15) -> MKS (20:46)

P15 (MKS)
9 MKS (6:40) -> Rycerska (7:04)
9 Rycerska (7:08) -> MKS (7:40)
1 Langiewicza (7:50) -> Wiejska Przychodnia (8:18)
1 Wiejska Przychodnia (8:22) -> Wysypisko (8:52)
19 Wysypisko (9:40) -> Kilińskiego (10:16)
19 Kilińskiego (10:18) -> Langiewicza (10:50)
25 Langiewicza (11:05) -> Wojska Polskiego (11:39)
25 Wojska Polskiego (11:46) -> Langiewicza (12:21)
19 Langiewicza (12:30) -> Kilińskiego (13:03)
19 Kilińskiego (13:05) -> Langiewicza (13:37)
25 Langiewicza (13:40) -> Wojska Polskiego (14:21)
25 Wojska Polskiego (14:30) -> Elektrowozownia (15:06)
19 Elektrowozowania (15:12) -> Kilińskiego (15:46)
19 Kilińskiego (16:45) -> Langiewicza (17:17)


P16
14 Szydłowiecka (6:26) -> Młodzawy (6:54)
14 Młodzawy (6:54) -> Wiejska Przychodnia (7:21)
18 Wiejska Przychodnia (7:22) -> Rajdowa (7:53)
18 Rajdowa (8:05) -> Langiewicza (8:49)
25 Langiewicza (8:55) -> Wojska Polskiego (9:36)
25 Wojska Polskiego (9:40) -> Langiewicza (10:09)
19 Langiewicza (10:30) -> Kilińskiego (11:07)
19 Kilińskiego (11:11) -> Langiewicza (11:43)
25 Langiewicza (11:58) -> Wojska Polskiego (12:39)
25 Wojska Polskiego (12:42) -> Langiewicza (13:11)
19 Langiewicza (13:20) -> Kilińskiego (13:53)
19 Kilińskiego (14:12) -> Langiewicza (14:44)
25 Langiewicza (15:02) -> Wojska Polskiego (15:43)
25 Wojska Polskiego (15:46) -> MKS (16:17)

P17
18 MKS (5:19) -> Rajdowa (5:56)
18 Rajdowa (6:03) -> Langiewicza (6:47)
18 Langiewicza (6:49) -> Rajdowa (7:30)
18 Rajdowa (7:33) -> Langiewicza (8:17)
18 Langiewicza (8:37) -> Rajdowa (9:18)
18 Rajdowa (9:20) -> Langiewicza (10:04)
----PRZERWA----
18 Langiewicza (12:15) -> Rajdowa (12:56)
18 Rajdowa (13:05) -> Langiewicza (13:49)
18 Langiewicza (13:56) -> Rajdowa (14:37)
18 Rajdowa (14:42) -> Langiewicza (15:26)
18 Langiewicza (15:27) -> Rajdowa (16:08)
18 Rajdowa (16:35) -> Langiewicza (17:19)
----PRZEWA----
22 Langiewicza (19:25) -> Rycerska (20:01)
22 Rycerska (20:02) -> MKS (20:34)

P18
19 Langiewicza (5:25) -> Kilińskiego (5:58)
19 Kilińskiego (6:03) -> Elektrowozownia (6:41)
19 Elektrowozownia (6:44) -> Kilińskiego (7:18)
19 Kilińskiego (7:21) -> Langiewicza (7:53)
19 Langiewicza (9:08) -> Kilińskiego (9:08)
19 Kilińskiego (9:10) -> Langiewicza (9:42)
`;

let currentBrygada = null;

rawRozklad.split("\n").forEach(line => {
  line = line.trim();
  if (!line) return;

  if (line.startsWith("P")) {
    currentBrygada = line.split(" ")[0];
    return;
  }

  if (line.includes("PRZERWA")) return;

  const m = line.match(/^(\d+)\s(.+?)\s\((\d+:\d+)\)\s->\s(.+?)\s\((\d+:\d+)\)/);
  if (!m) return;

  ROZKLAD.push({
    brygada: currentBrygada,
    linia: m[1],
    start: m[2],
    startTime: m[3],
    end: m[4],
    endTime: m[5]
  });
});

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function znajdzKurs(linia) {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();

  for (const k of ROZKLAD) {
    if (String(k.linia) !== String(linia)) continue;

    const s = timeToMinutes(k.startTime);
    const e = timeToMinutes(k.endTime);

    if (cur >= s && cur <= e) return k;
  }

  return null;
}

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
    if (Array.isArray(data?.vehicles)) return data.vehicles;
    return [];
  } catch (e) {
    console.error("❌ API error:", e);
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

  return parseInt(A.replace(/\D/g, "")) - parseInt(B.replace(/\D/g, ""));
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
      const kurs = znajdzKurs(v.lineName);
      const brygada = kurs ? ` | brygada **${kurs.brygada}**` : "";

      return `**${id}** (${desc}) — linia **${v.lineName}**${brygada}`;
    })
    .filter(Boolean)
    .join("\n");

  const channel = await client.channels.fetch(CHANNEL_ID);
  await channel.send(`📋 **Aktualnie jeżdżące pojazdy:**\n${text}`);
}

// ================= ALERTY =================
async function checkVehicles() {
  const vehicles = await fetchVehicles();
  if (!vehicles.length) return;

  const current = new Set();

  for (const v of vehicles) {
    const id = String(v.vehicleID || v.vehicleId);
    if (!id || id === "451") continue;
    current.add(id);

    if (!ALERT_VEHICLES.includes(id)) continue;
    if (lastVehicles.has(id)) continue;

    const desc = vehicleDescriptions[id] || "Nieznany pojazd";
    const kurs = znajdzKurs(v.lineName);
    const brygada = kurs ? ` | brygada ${kurs.brygada}` : "";

    const text = `🚍 **${id}** (${desc}) wyjechał na linię **${v.lineName}**${brygada}`;

    history.unshift({ time: new Date().toLocaleString("pl-PL"), text });
    history = history.slice(0, 50);

    const channel = await client.channels.fetch(CHANNEL_ID);
    await channel.send(`<@&${PING_ROLE_ID}> ${text}`);
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
  console.log("✅ Komendy zarejestrowane");
})();

// ================= INTERACTIONS =================
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
        const kurs = znajdzKurs(x.lineName);
        const brygada = kurs ? ` | brygada **${kurs.brygada}**` : "";

        return `**${id}** (${d}) — linia **${x.lineName}**${brygada}`;
      })
      .filter(Boolean)
      .join("\n");

    return i.reply(text);
  }

  if (i.commandName === "historia") {
    if (!history.length) return i.reply("📭 Brak historii");
    return i.reply(history.map(h => `🕒 ${h.time}\n${h.text}`).join("\n\n"));
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

// ================= LOGIN =================
console.log("⏳ Próba logowania do Discorda...");
client.login(TOKEN)
  .then(() => console.log("✅ Zalogowano do Discord API"))
  .catch(err => console.error("❌ Login error:", err));
