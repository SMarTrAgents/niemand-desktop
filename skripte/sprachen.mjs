#!/usr/bin/env node
/**
 * `npm run sprachen` — der Fortschrittsbericht für Übersetzer.
 *
 * Sagt je Sprache, wie weit sie ist und was als Nächstes fehlt. Er scheitert
 * NICHT an einer unfertigen Übersetzung: Halbe Stände sollen ankommen und
 * gemergt werden, sonst gibt es keine ganzen. Rot wird er nur, wenn die
 * QUELLSPRACHE Löcher hat — denn dann fehlt der Rückfall, auf dem alles steht.
 *
 * Gelesen wird der Quelltext, nicht ein gepflegtes Verzeichnis. Eine Liste,
 * die jemand von Hand nachziehen muss, stimmt irgendwann nicht mehr — dieser
 * Fehler hat das Projekt an anderer Stelle schon Zeit gekostet.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HIER = dirname(fileURLToPath(import.meta.url));
const SRC = join(HIER, "..", "src");

const lies = (datei) => readFileSync(join(SRC, datei), "utf8");

/* --- Welche Sprachen gibt es? ------------------------------------------- */

const i18n = lies("i18n.ts");
const sprachZeile = i18n.match(/export const SPRACHEN = \[([^\]]*)\]/s);
if (!sprachZeile) {
  console.error("SPRACHEN nicht gefunden — steht die Liste noch in src/i18n.ts?");
  process.exit(2);
}
const SPRACHEN = [...sprachZeile[1].matchAll(/"([a-z-]{2,5})"/g)].map((m) => m[1]);
const QUELLE = (i18n.match(/QUELLSPRACHE = "([a-z-]{2,5})"/) || [, "de"])[1];

const namen = {};
for (const m of (i18n.match(/SPRACHNAMEN[^{]*\{([^}]*)\}/s)?.[1] || "").matchAll(
  /([a-z-]{2,5}):\s*"([^"]*)"/g
)) {
  namen[m[1]] = m[2];
}

/* --- Oberflächentexte: welche Schlüssel hat die Quellsprache? ----------- */

/** Der Rumpf eines Sprachblocks in UI_ROH, z. B. UI_ROH.de { … }. */
function uiBlock(sprache) {
  const start = i18n.search(new RegExp(`^\\s{2}${sprache}:\\s*\\{`, "m"));
  if (start < 0) return null;
  let tiefe = 0;
  let i = i18n.indexOf("{", start);
  const von = i;
  for (; i < i18n.length; i += 1) {
    if (i18n[i] === "{") tiefe += 1;
    else if (i18n[i] === "}") {
      tiefe -= 1;
      if (tiefe === 0) return i18n.slice(von, i + 1);
    }
  }
  return null;
}

/** Die Schlüsselnamen auf oberster Ebene eines Blocks. */
function schluessel(block) {
  if (!block) return [];
  const gefunden = new Set();
  let tiefe = 0;
  for (const zeile of block.split("\n")) {
    const vorher = tiefe;
    tiefe += (zeile.match(/\{/g) || []).length - (zeile.match(/\}/g) || []).length;
    if (vorher !== 1) continue; // nur die oberste Ebene des Blocks
    const m = zeile.match(/^\s{4}([A-Za-zäöüÄÖÜ_][\w]*)\s*:/);
    if (m) gefunden.add(m[1]);
  }
  return [...gefunden];
}

const uiQuelle = schluessel(uiBlock(QUELLE));

/* --- Kurstexte: wie viele LText-Objekte gibt es? ------------------------ */

const kurs = lies("kurs.ts");
/**
 * Ein Kurstext ist ein Objekt, das die Quellsprache als Schlüssel führt.
 * Gezählt werden die Vorkommen von `de:` auf Objektebene; für jede andere
 * Sprache wird dasselbe gezählt. Die Differenz ist, was fehlt.
 */
function kurstexte(sprache) {
  const re = new RegExp(`(^|[\\{,\\s])${sprache}:\\s*(["'\\{])`, "g");
  return (kurs.match(re) || []).length;
}

const kursGesamt = kurstexte(QUELLE);

/* --- Bericht ------------------------------------------------------------ */

const balken = (p) => "█".repeat(Math.round(p / 5)).padEnd(20, "·");
const zeilen = [];
let quelleKaputt = false;

for (const s of SPRACHEN) {
  const uiHat = s === QUELLE ? uiQuelle : schluessel(uiBlock(s));
  const uiFehlt = s === QUELLE ? [] : uiQuelle.filter((k) => !uiHat.includes(k));
  const kursHat = s === QUELLE ? kursGesamt : kurstexte(s);
  const kursFehlt = Math.max(0, kursGesamt - kursHat);

  const gesamt = uiQuelle.length + kursGesamt;
  const fehlt = uiFehlt.length + kursFehlt;
  const prozent = gesamt === 0 ? 0 : Math.round(((gesamt - fehlt) / gesamt) * 100);
  const fertig = fehlt === 0;

  if (s === QUELLE && (uiQuelle.length === 0 || kursGesamt === 0)) quelleKaputt = true;

  const marke = s === QUELLE ? "🏠" : fertig ? "✅" : "🔸";
  const sicht = fertig ? "in der Auswahl sichtbar" : `noch nicht sichtbar — es fehlen ${fehlt}`;
  zeilen.push(
    `  ${marke} ${(namen[s] || s).padEnd(12)} ${String(prozent).padStart(3)} %  ${balken(prozent)}  ${sicht}`
  );
  if (!fertig && uiFehlt.length) {
    zeilen.push(`       Oberfläche: ${uiFehlt.slice(0, 6).join(", ")}${uiFehlt.length > 6 ? ` … (+${uiFehlt.length - 6})` : ""}`);
  }
  if (!fertig && kursFehlt) {
    zeilen.push(`       Kurstexte : ${kursFehlt} von ${kursGesamt} fehlen noch`);
  }
}

console.log("\nNiemand — Stand der Übersetzungen\n");
console.log(zeilen.join("\n"));
console.log(`
  🏠 Quellsprache · ✅ vollständig, wird angeboten · 🔸 wird gesammelt

  Eine Sprache erscheint in der Auswahl erst, wenn sie ganz da ist. Halbe
  Stände sind trotzdem willkommen — schick sie als Pull Request, der Nächste
  macht weiter. Wie es geht, steht in CONTRIBUTING.md.
`);

if (quelleKaputt) {
  console.error(`FEHLER: Die Quellsprache "${QUELLE}" ist leer oder nicht lesbar.`);
  console.error("Ohne sie gibt es keinen Rückfall — das ist der einzige Fall, in dem");
  console.error("diese Prüfung scheitert.");
  process.exit(1);
}
