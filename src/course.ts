/**
 * Der Computerkurs — Szenen als DATEN (Plan § 7: versionierter Katalog,
 * nicht hartkodiert). Sprache: Du-Form, A2-Niveau, ein Gedanke pro Satz.
 *
 * Schritt-Arten:
 *  - sag:     Erklärkarte, „Weiter“-Knopf
 *  - auftrag: AUFTRAG-Karte — ausgeführt wird NUR per Nutzer-Klick
 *  - pruef:   Niemand prüft still über System-Befehle (online/drucker);
 *             Erfolg wird erkannt, nie behauptet
 *  - frage:   Kachel-Quiz; falsche Antwort → freundlicher Hinweis, nie „falsch“
 */

export type SkillLevel = "neu" | "etwas" | "geuebt";

export type Schritt =
  | { k: "sag"; text: string }
  | {
      k: "auftrag";
      text: string;
      knopf: string;
      cmd: "open_settings" | "open_url";
      arg: string;
      danach?: string;
    }
  | {
      k: "pruef";
      check: "online" | "drucker";
      warteText: string;
      auftragKnopf?: string;
      auftragCmd?: "open_settings";
      auftragArg?: string;
      erfolgText: string;
      schonErledigtText: string;
    }
  | {
      k: "frage";
      text: string;
      optionen: { t: string; ok: boolean; antwort?: string }[];
    };

export interface Szene {
  id: string;
  akt: 1 | 2;
  titel: string;
  schritte: Schritt[];
}

const istWindows = navigator.userAgent.includes("Windows");
const istMac = navigator.userAgent.includes("Mac OS");
const ausschaltenWeg = istWindows
  ? "Klicke unten links auf das Fenster-Symbol (Start). Dann auf den Kreis mit dem Strich (Ein/Aus). Dann auf „Herunterfahren“."
  : istMac
    ? "Klicke oben links auf den Apfel. Dann auf „Ausschalten …“."
    : "Klicke oben rechts auf die Symbole. Dann auf das Ein/Aus-Zeichen. Dann auf „Ausschalten“.";

export const KURS: Szene[] = [
  {
    id: "wlan",
    akt: 1,
    titel: "Ab ins Netz: dein Internet",
    schritte: [
      {
        k: "sag",
        text: "Ohne Internet ist der Computer wie ein Telefon ohne Leitung. Ich schaue mal nach, ob du verbunden bist.",
      },
      {
        k: "pruef",
        check: "online",
        warteText:
          "Noch kein Internet. Kein Problem — wir machen das zusammen. Wähle in der Liste dein WLAN. Das Kennwort steht oft unten auf deinem Router.",
        auftragKnopf: "AUFTRAG: Öffne die WLAN-Einstellungen",
        auftragCmd: "open_settings",
        auftragArg: "wifi",
        erfolgText: "Du bist verbunden! Das hast DU gemacht.",
        schonErledigtText: "Du bist schon im Internet — sehr gut! Dann hoppeln wir gleich weiter.",
      },
    ],
  },
  {
    id: "drucker",
    akt: 1,
    titel: "Dein Drucker",
    schritte: [
      {
        k: "sag",
        text: "Papier ist geduldig — und manchmal einfach praktisch. Ich schaue nach, ob dein Computer deinen Drucker schon kennt.",
      },
      {
        k: "pruef",
        check: "drucker",
        warteText:
          "Ich sehe noch keinen Drucker. Ist er an und im gleichen WLAN? Klicke dann auf „Hinzufügen“. Moderne Drucker findet der Computer von allein.",
        auftragKnopf: "AUFTRAG: Öffne die Drucker-Einstellungen",
        auftragCmd: "open_settings",
        auftragArg: "printers",
        erfolgText: "Dein Drucker ist eingerichtet! Zum Testen kannst du später eine Seite drucken.",
        schonErledigtText: "Dein Computer kennt deinen Drucker schon. Nichts zu tun — prima!",
      },
      {
        k: "sag",
        text: "Kein Drucker im Haus? Auch gut. Man kann fast alles als PDF-Datei speichern. Das zeige ich dir später beim Schreiben.",
      },
    ],
  },
  {
    id: "dateien",
    akt: 1,
    titel: "Deine Schubladen: Dateien und Ordner",
    schritte: [
      {
        k: "sag",
        text: "Dein Computer hat Schubladen. Wir nennen sie Ordner. In „Dokumente“ wohnen deine Briefe. In „Downloads“ landet alles aus dem Internet.",
      },
      {
        k: "frage",
        text: "Du lädst ein Bild aus dem Internet. Wo findest du es wieder?",
        optionen: [
          { t: "Im Ordner „Downloads“", ok: true },
          {
            t: "Im Papierkorb",
            ok: false,
            antwort: "Fast! Der Papierkorb ist für Gelöschtes. Alles aus dem Internet landet in „Downloads“.",
          },
        ],
      },
      {
        k: "sag",
        text: "Merke: Eine Datei ist ein Blatt Papier. Ein Ordner ist die Schublade dafür. Mehr brauchst du heute nicht.",
      },
    ],
  },
  {
    id: "ausschalten",
    akt: 1,
    titel: "Richtig ausschalten",
    schritte: [
      {
        k: "sag",
        text: `Den Computer schaltet man nicht am Stecker aus. Er will sich ordentlich verabschieden. So geht es: ${ausschaltenWeg}`,
      },
      {
        k: "frage",
        text: "Der Computer hängt und nichts geht mehr. Was tust du zuerst?",
        optionen: [
          {
            t: "Kurz warten und nochmal probieren",
            ok: true,
          },
          {
            t: "Sofort den Stecker ziehen",
            ok: false,
            antwort:
              "Lieber nicht — dabei können Dateien kaputtgehen. Erst warten. Wenn gar nichts mehr geht: den Einschalt-Knopf lange gedrückt halten.",
          },
        ],
      },
    ],
  },
  {
    id: "schutz",
    akt: 1,
    titel: "Die goldene Regel",
    schritte: [
      {
        k: "sag",
        text: "Eine Regel schützt dich fast immer: Dein Passwort gehört nur dir. Ich frage dich nie danach. Ehrliche Firmen tun das auch nicht.",
      },
      {
        k: "frage",
        text: "Eine E-Mail fragt nach deinem Passwort. Was tust du?",
        optionen: [
          { t: "Löschen und niemandem geben", ok: true },
          {
            t: "Das Passwort zurückschreiben",
            ok: false,
            antwort: "Bitte nie! Wer nach deinem Passwort fragt, will dich reinlegen. Löschen ist richtig.",
          },
        ],
      },
      {
        k: "sag",
        text: "Und noch ein Freund: Updates. Wenn dein Computer ein Update möchte, lass es zu. Es macht ihn sicherer.",
      },
    ],
  },
  {
    id: "browser",
    akt: 2,
    titel: "Dein Fenster ins Netz: der Browser",
    schritte: [
      {
        k: "sag",
        text: "Das Internet ist wie eine große Stadt. Der Browser ist dein Fenster. Du schaust hindurch und besuchst Seiten.",
      },
      {
        k: "sag",
        text: "Oben im Browser ist die Adresszeile — wie ein Navi. Kennst du die Adresse, tippst du sie ein. Kennst du sie nicht, tippst du eine Frage. Dann sucht er für dich.",
      },
      {
        k: "frage",
        text: "Du willst zu cloud.smartragents.ai. Was machst du?",
        optionen: [
          { t: "Die Adresse oben eintippen und Enter drücken", ok: true },
          {
            t: "Den Computer neu starten",
            ok: false,
            antwort: "Nicht nötig! Einfach oben in die Adresszeile tippen und Enter drücken. Das ist alles.",
          },
        ],
      },
    ],
  },
  {
    id: "tabs",
    akt: 2,
    titel: "Tabs: mehrere Seiten gleichzeitig",
    schritte: [
      {
        k: "sag",
        text: "Ein Tab ist ein Reiter oben im Browser — wie ein zweites Blatt Papier. Du kannst viele Seiten offen haben und zwischen ihnen wechseln.",
      },
      {
        k: "sag",
        text: "Probier es gleich: Drücke im Browser Strg und T zusammen. Schon hast du ein neues Blatt. Mit dem kleinen ✕ am Reiter machst du es wieder zu.",
      },
      {
        k: "frage",
        text: "Wofür ist das kleine ✕ am Tab?",
        optionen: [
          { t: "Es schließt nur diesen einen Tab", ok: true },
          {
            t: "Es löscht das Internet",
            ok: false,
            antwort: "Keine Sorge — es schließt nur dieses eine Blatt. Das Internet bleibt, wo es ist.",
          },
        ],
      },
    ],
  },
  {
    id: "favoriten",
    akt: 2,
    titel: "Dein Merkzettel: Favoriten",
    schritte: [
      {
        k: "sag",
        text: "Gute Orte merkt man sich. Ein Favorit (auch Lesezeichen genannt) ist dein Merkzettel im Browser. Setzen wir jetzt den wichtigsten.",
      },
      {
        k: "auftrag",
        text: "Ich öffne die Seite, auf der bald deine Helfer wohnen.",
        knopf: "AUFTRAG: Öffne cloud.smartragents.ai",
        cmd: "open_url",
        arg: "cloud",
        danach:
          "Siehst du den Stern rechts in der Adresszeile? Klicke ihn an. Oder drücke Strg und D zusammen. Dann bestätigen — fertig ist dein Merkzettel.",
      },
      {
        k: "frage",
        text: "Hast du den Stern angeklickt?",
        optionen: [
          { t: "Ja, erledigt!", ok: true },
          {
            t: "Ich finde den Stern nicht",
            ok: false,
            antwort:
              "Der Stern ist ganz rechts IN der Adresszeile — dort, wo die Adresse steht. Du kannst auch Strg und D zusammen drücken.",
          },
        ],
      },
    ],
  },
  {
    id: "verbinden",
    akt: 2,
    titel: "Deine Helfer warten",
    schritte: [
      {
        k: "sag",
        text: "Jetzt kommt der schönste Teil. Auf cloud.smartragents.ai wohnt dein Team: Helfer, die für dich schreiben, rechnen und planen. Du bleibst der Chef — Mensch mit Maschine.",
      },
      {
        k: "auftrag",
        text: "Melde dich dort an. Oder erstelle dein Konto — ich erkläre dort jeden Schritt.",
        knopf: "AUFTRAG: Öffne cloud.smartragents.ai",
        cmd: "open_url",
        arg: "cloud",
        danach:
          "Nimm dir Zeit. Dein Passwort tippst nur du — ich schaue extra weg. Wenn du drin bist, treffen wir uns dort wieder: Ich bin der kleine Hase unten in der Ecke.",
      },
      {
        k: "sag",
        text: "Das war dein Kurs! Computer, Internet, Browser, Favorit — alles DU. Ich bleibe hier auf deinem Schreibtisch. Wenn du mich brauchst: einfach anklicken.",
      },
    ],
  },
];

/* --- Kenntnis-Check (Szene 1.0, Inhaber-Vorgabe 28.07.) -------------------- */

export const CHECK_FRAGEN = [
  "Hast du schon öfter einen Computer benutzt?",
  "Bist du schon im Internet unterwegs?",
  "Nutzt du schon einen Browser mit Tabs und Favoriten?",
];

/** Je-Antwort „Ja“ ein Punkt → Einstiegslevel. */
export function levelAusAntworten(ja: number): SkillLevel {
  if (ja >= 3) return "geuebt";
  if (ja >= 2) return "etwas";
  return "neu";
}

/** Welche Szenen gelten je Level als „kenn ich schon“ (vorab abgehakt)? */
export function vorabErledigt(level: SkillLevel): string[] {
  if (level === "geuebt") return ["wlan", "drucker", "dateien", "ausschalten", "schutz", "browser", "tabs"];
  if (level === "etwas") return ["dateien", "ausschalten", "browser"];
  return [];
}

/* --- Fortschritt (lokal; später Sync über /api/v1/nobody/progress) --------- */

export interface KursStand {
  level: SkillLevel | null;
  erledigt: Record<string, boolean>;
}

const KEY = "niemand.kurs.v1";

export function ladeStand(): KursStand {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as KursStand;
  } catch {
    /* Neustart mit leerem Stand */
  }
  return { level: null, erledigt: {} };
}

export function speichereStand(stand: KursStand): void {
  localStorage.setItem(KEY, JSON.stringify(stand));
}
