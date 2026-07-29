/**
 * Der Aufgabenzettel (v0.6.0) — Niemands wichtigstes Werkzeug neben dem Kurs.
 *
 * Ein Zettel, drei Schreiber: der Mensch am Desktop, die Cloud (Notizen-Panel)
 * und die Agenten (Skill „planen“). Gemeinsame Wahrheit ist die Markdown-Notiz
 * `workdir/notepad/Niemand-Aufgaben.md` im Kunden-Container — dort können
 * Agenten sie füllen, und das Notizen-Panel auf cloud.smartragents.ai zeigt
 * sie als ganz normale Notiz.
 *
 * Format (verbindlich, auch für den Agenten-Skill):
 *   - Kopfbereich (alles vor der ersten Checkbox-Zeile) bleibt beim Sync erhalten
 *   - Aufgaben sind AUSSCHLIESSLICH Checkbox-Zeilen: `- [ ] Text` / `- [x] Text`
 *   - andere Zeilen zwischen/nach den Checkboxen überleben den nächsten Sync nicht
 *
 * Sync = 3-Wege-Merge (Basis = letzter synchronisierter Stand):
 *   - die Seite, die etwas GEÄNDERT hat, gewinnt (lokal vor Cloud bei Konflikt)
 *   - Löschen gewinnt gegen Abhaken
 *   - Reihenfolge bestimmt die Cloud-Notiz, lokale Neuzugänge kommen ans Ende
 */
import { invoke } from "@tauri-apps/api/core";

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  /** Wer den Eintrag angelegt hat — steuert nur die kleine Kennzeichnung im UI. */
  quelle: "ich" | "cloud";
  angelegt: number;
}

export interface TodoStand {
  items: TodoItem[];
  /** Markdown des letzten erfolgreichen Sync — Basis für den 3-Wege-Merge. */
  basis: string | null;
}

const KEY = "niemand.aufgaben";
export const MAX_EINTRAEGE = 100;
export const MAX_TEXT = 500;

const STANDARD_KOPF =
  "# Niemand-Aufgaben\n\n" +
  "> Gemeinsamer Aufgabenzettel von Niemand (Desktop), der Cloud und den Agenten.\n" +
  "> Nur Checkbox-Zeilen zählen als Aufgaben — Details siehe Skill „planen“.\n\n";

/* --- Speicher (Muster wie kurs.ts) --------------------------------------- */

export function ladeAufgaben(): TodoStand {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as TodoStand;
      if (Array.isArray(s.items)) {
        return { items: s.items.filter((i) => i && typeof i.text === "string"), basis: s.basis ?? null };
      }
    }
  } catch {
    /* kaputter/fehlender Speicher → leerer Zettel */
  }
  return { items: [], basis: null };
}

export function speichereAufgaben(stand: TodoStand): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(stand));
  } catch {
    /* ohne Speicher gilt der Zettel nur für diese Sitzung */
  }
}

export function neueId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `t-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

/* --- Markdown ⇄ Einträge -------------------------------------------------- */

const CHECKBOX = /^\s*[-*]\s*\[( |x|X)\]\s+(.*)$/;

/** Vergleichs-Schlüssel: Text ohne Groß/klein- und Leerraum-Unterschiede. */
export function schluessel(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Kürzt an Codepoint-Grenzen — ein `slice` mitten im Emoji hinterlässt ein
 * einsames Surrogat, und ein solcher Text wäre nicht mehr JSON/HTTP-tauglich. */
export function kuerze(text: string, max: number = MAX_TEXT): string {
  return Array.from(text).slice(0, max).join("");
}

export interface GeparsteNotiz {
  kopf: string;
  eintraege: Array<{ text: string; done: boolean }>;
}

export function parseNotiz(md: string): GeparsteNotiz {
  const zeilen = md.split(/\r?\n/);
  const eintraege: Array<{ text: string; done: boolean }> = [];
  const gesehen = new Set<string>();
  let kopfEnde = zeilen.length;
  for (let i = 0; i < zeilen.length; i++) {
    const m = CHECKBOX.exec(zeilen[i]);
    if (!m) continue;
    if (kopfEnde === zeilen.length) kopfEnde = i;
    const text = kuerze(m[2].trim());
    const k = schluessel(text);
    if (!text || gesehen.has(k)) continue; // Doubletten: erste Zeile gewinnt
    gesehen.add(k);
    eintraege.push({ text, done: m[1] !== " " });
    // MAX_EINTRAEGE ist bewusst NUR eine Anlege-Grenze im UI — beim Parsen
    // alles einlesen, sonst würde ein Push Cloud-Einträge 101+ vernichten.
  }
  const kopf = zeilen.slice(0, kopfEnde).join("\n");
  return { kopf: kopf.trim() ? kopf.replace(/\s*$/, "\n\n") : "", eintraege };
}

export function serialisiereNotiz(items: TodoItem[], kopf?: string): string {
  const k = kopf && kopf.trim() ? kopf : STANDARD_KOPF;
  const zeilen = items.map((i) => `- [${i.done ? "x" : " "}] ${i.text}`);
  return k + zeilen.join("\n") + (zeilen.length ? "\n" : "");
}

/* --- 3-Wege-Merge ---------------------------------------------------------- */

export interface MergeErgebnis {
  items: TodoItem[];
  /** Weicht das Ergebnis von der Cloud-Notiz ab → hochladen nötig. */
  pushNoetig: boolean;
  /** Einträge, die neu aus der Cloud gekommen sind (für den Aufmerksamkeits-Puls). */
  neuVonCloud: number;
  /** Kopfbereich, mit dem beim Hochladen serialisiert werden soll. */
  kopf: string;
}

export function mergeAufgaben(basisMd: string | null, lokal: TodoItem[], remoteMd: string): MergeErgebnis {
  const basis = new Map<string, boolean>();
  for (const e of parseNotiz(basisMd ?? "").eintraege) basis.set(schluessel(e.text), e.done);
  const remote = parseNotiz(remoteMd);
  const lokalMap = new Map<string, TodoItem>();
  for (const i of lokal) if (!lokalMap.has(schluessel(i.text))) lokalMap.set(schluessel(i.text), i);

  const ergebnis: TodoItem[] = [];
  const verbaut = new Set<string>();
  let neuVonCloud = 0;

  // 1) Cloud-Reihenfolge führt
  for (const r of remote.eintraege) {
    const k = schluessel(r.text);
    if (verbaut.has(k)) continue;
    verbaut.add(k);
    const inBasis = basis.has(k);
    const l = lokalMap.get(k);
    if (inBasis) {
      if (!l) continue; // lokal gelöscht → Löschen gewinnt
      const basisDone = basis.get(k)!;
      const done = l.done !== basisDone ? l.done : r.done; // geänderte Seite gewinnt, lokal zuerst
      ergebnis.push({ ...l, text: r.text, done });
    } else if (l) {
      // beidseitig neu angelegt → zusammenführen, „erledigt“ gewinnt
      ergebnis.push({ ...l, text: r.text, done: l.done || r.done });
    } else {
      ergebnis.push({ id: neueId(), text: r.text, done: r.done, quelle: "cloud", angelegt: Date.now() });
      neuVonCloud++;
    }
  }

  // 2) Lokale Einträge, die die Cloud (noch) nicht hat
  for (const l of lokal) {
    const k = schluessel(l.text);
    if (verbaut.has(k)) continue;
    verbaut.add(k);
    if (basis.has(k)) continue; // Cloud hat gelöscht → Löschen gewinnt
    ergebnis.push(l);
  }

  const kanonRemote = remote.eintraege.map((e) => `${e.done ? "x" : " "}|${schluessel(e.text)}`).join("\n");
  const kanonMerge = ergebnis.map((e) => `${e.done ? "x" : " "}|${schluessel(e.text)}`).join("\n");
  return { items: ergebnis, pushNoetig: kanonMerge !== kanonRemote, neuVonCloud, kopf: remote.kopf };
}

/* --- Sync-Ablauf ------------------------------------------------------------
   Läuft aus dem Aufgaben-Panel (beim Öffnen, alle 60 s, nach Änderungen) UND
   als leiser Hintergrund-Puls aus App.tsx. Ein Mutex verhindert Doppel-Läufe;
   nach jeder Änderung geht das Ereignis `niemand://todo-geaendert` raus, damit
   offene Ansichten neu laden. */

export type SyncStatus = "ok" | "abgemeldet" | "offline" | "laeuft";

export interface SyncErgebnis {
  status: SyncStatus;
  neuVonCloud: number;
}

export const TODO_EVENT = "niemand://todo-geaendert";

let syncLaeuft = false;

function melden(): void {
  try {
    window.dispatchEvent(new CustomEvent(TODO_EVENT));
  } catch {
    /* ohne window (Tests) einfach still */
  }
}

function alsStatus(e: unknown): SyncStatus {
  return String(e).includes("abgemeldet") ? "abgemeldet" : "offline";
}

export async function syncEinmal(): Promise<SyncErgebnis> {
  if (syncLaeuft) return { status: "laeuft", neuVonCloud: 0 };
  syncLaeuft = true;
  try {
    let remote: string | null;
    try {
      remote = await invoke<string | null>("todo_pull");
    } catch (e) {
      return { status: alsStatus(e), neuVonCloud: 0 };
    }
    let neuGesamt = 0;
    // Bis zu 3 Anläufe: schreibt jemand anderes (Agent, Notizen-Panel,
    // Zweitgerät) zwischen unserem Pull und Push, mergen wir dessen Stand
    // erst ein, statt ihn zu überschreiben (optimistische Sperre).
    for (let anlauf = 0; anlauf < 3; anlauf++) {
      const stand = ladeAufgaben();
      if (remote === null) {
        if (stand.basis === null) {
          // Erstlauf: Notiz existiert noch nicht — nur anlegen, wenn es lokal etwas gibt.
          if (stand.items.length === 0) return { status: "ok", neuVonCloud: neuGesamt };
          const md = serialisiereNotiz(stand.items);
          try {
            await invoke("todo_push", { inhalt: md });
          } catch (e) {
            return { status: alsStatus(e), neuVonCloud: neuGesamt };
          }
          // Items frisch lesen: hat der Mensch WÄHREND des Push etwas geändert,
          // darf der alte Stand das nicht überschreiben — nur die Basis rückt vor.
          speichereAufgaben({ items: ladeAufgaben().items, basis: md });
          melden();
          return { status: "ok", neuVonCloud: neuGesamt };
        }
        // Notiz wurde in der Cloud GELÖSCHT: wie eine geleerte Liste behandeln —
        // synchronisierte Einträge gehen, echte lokale Neuzugänge bleiben.
        remote = "";
      }
      const m = mergeAufgaben(stand.basis, stand.items, remote);
      neuGesamt += m.neuVonCloud;
      // Basis = Stand der Cloud nach diesem Lauf; sofort melden, damit offene
      // Ansichten nicht sekundenlang mit veraltetem Zustand weiterklicken.
      speichereAufgaben({ items: m.items, basis: remote });
      melden();
      if (!m.pushNoetig) return { status: "ok", neuVonCloud: neuGesamt };
      // Kontroll-Pull direkt vor dem Push: hat sich die Notiz inzwischen
      // geändert, neue Runde mit dem frischen Stand.
      let kontrolle: string | null;
      try {
        kontrolle = await invoke<string | null>("todo_pull");
      } catch (e) {
        return { status: alsStatus(e), neuVonCloud: neuGesamt };
      }
      if ((kontrolle ?? "") !== remote) {
        remote = kontrolle;
        continue;
      }
      const md = serialisiereNotiz(m.items, m.kopf);
      try {
        await invoke("todo_push", { inhalt: md });
      } catch (e) {
        return { status: alsStatus(e), neuVonCloud: neuGesamt };
      }
      // s. o.: Änderungen aus dem Push-Zeitfenster nicht plattmachen.
      speichereAufgaben({ items: ladeAufgaben().items, basis: md });
      melden();
      return { status: "ok", neuVonCloud: neuGesamt };
    }
    // Drei Anläufe verloren (sehr reger Zettel) — lokale Änderungen bleiben
    // gemerkt, der nächste Takt trägt sie nach.
    return { status: "ok", neuVonCloud: neuGesamt };
  } finally {
    syncLaeuft = false;
  }
}
