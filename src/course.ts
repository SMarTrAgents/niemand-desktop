/**
 * Der Computerkurs — Szenen als DATEN (Plan § 7: versionierter Katalog,
 * nicht hartkodiert). Sprache: Du-Form, A2-Niveau, ein Gedanke pro Satz.
 *
 * ANPASSUNG AN DEN MENSCHEN (Inhaber-Vorgabe 28.07.): Der Kurs passt sich an
 * Wissensstand UND Lebenssituation an. Jeder Text kann Varianten je
 * Zielgruppe tragen — gewählt wird im Kennenlern-Check, gespeichert lokal.
 *
 * Stand 28.07. spät: alle Befunde der Didaktik-Gegenprüfung eingearbeitet
 * (Mac = cmd statt Strg, Safari ohne Stern, Win-11-Start in der Mitte,
 * Browser wird vor der Tab-Übung geöffnet, Router/Cloud/PDF mit Alltagsbild).
 */

export type SkillLevel = "neu" | "etwas" | "geuebt";
export type Zielgruppe = "senior" | "beruf" | "jung";

/** Text mit optionalen Zielgruppen-Varianten. */
export type TextVar = string | ({ standard: string } & Partial<Record<Zielgruppe, string>>);

export function textFuer(t: TextVar, zg: Zielgruppe | null): string {
  if (typeof t === "string") return t;
  return (zg && t[zg]) || t.standard;
}

export type Schritt =
  | { k: "sag"; text: TextVar }
  | {
      k: "auftrag";
      text: TextVar;
      knopf: string;
      cmd: "open_settings" | "open_url";
      arg: string;
      danach?: TextVar;
    }
  | {
      k: "pruef";
      check: "online" | "drucker";
      warteText: TextVar;
      auftragKnopf?: string;
      auftragCmd?: "open_settings";
      auftragArg?: string;
      erfolgText: TextVar;
      schonErledigtText: TextVar;
    }
  | {
      k: "frage";
      text: TextVar;
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
/** Mac sagt cmd (⌘), alle anderen Strg — sonst scheitert die erste Tastenübung. */
const taste = istMac ? "cmd (⌘)" : "Strg";
const ausschaltenWeg = istWindows
  ? "Klicke unten auf das Fenster-Symbol (Start). Es ist meist in der Mitte der Leiste. Dann auf den Kreis mit dem Strich (Ein/Aus). Dann auf „Herunterfahren“."
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
          "Noch kein Internet. Kein Problem — wir machen das zusammen. Klicke unten auf den Auftrag. Wähle dann dein WLAN aus der Liste." +
          (istWindows ? " Siehst du keine Liste? Klicke auf „Verfügbare Netzwerke anzeigen“." : "") +
          " Das Kennwort steht oft unten auf dem Router. Der Router ist das Internet-Kästchen mit den Lämpchen.",
        auftragKnopf: "AUFTRAG: Öffne die WLAN-Einstellungen",
        auftragCmd: "open_settings",
        auftragArg: "wifi",
        erfolgText: "Du bist verbunden! Das hast DU gemacht.",
        schonErledigtText: "Du bist schon im Internet — sehr gut! Dann hoppeln wir gleich weiter.",
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
        text: {
          standard:
            "Dein Computer hat Schubladen. Wir nennen sie Ordner. In „Dokumente“ wohnen deine Briefe. In „Downloads“ landet alles aus dem Internet.",
          senior:
            "Dein Computer hat Schubladen. Wir nennen sie Ordner. In „Dokumente“ wohnen deine Briefe. In „Bilder“ die Fotos von der Familie. In „Downloads“ landet alles aus dem Internet.",
          beruf:
            "Dein Computer hat Schubladen. Wir nennen sie Ordner. In „Dokumente“ wohnen deine Angebote und Rechnungen. In „Downloads“ landet alles aus dem Internet.",
          jung: "Dein Computer hat Schubladen. Wir nennen sie Ordner. In „Dokumente“ wohnen deine Texte und Unterlagen. In „Downloads“ landet alles aus dem Internet.",
        },
      },
      {
        k: "frage",
        text: {
          standard: "Du lädst ein Bild aus dem Internet. Wo findest du es wieder?",
          senior: "Deine Tochter schickt dir ein Foto. Du lädst es herunter. Wo findest du es wieder?",
          beruf: "Ein Kunde schickt dir eine Datei. Du lädst sie herunter. Wo findest du sie wieder?",
          jung: "Du lädst ein Skript für die Prüfung herunter. Wo findest du es wieder?",
        },
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
    id: "drucker",
    akt: 1,
    titel: "Dein Drucker",
    schritte: [
      {
        k: "sag",
        text: {
          standard:
            "Papier ist geduldig — und manchmal einfach praktisch. Ich schaue nach, ob dein Computer deinen Drucker schon kennt.",
          beruf:
            "Angebote, Rechnungen, Lieferscheine — vieles will aufs Papier. Ich schaue nach, ob dein Computer deinen Drucker schon kennt.",
        },
      },
      {
        k: "pruef",
        check: "drucker",
        warteText:
          "Ich sehe noch keinen Drucker. Ist er eingeschaltet? Steckt das Kabel? Oder ist er im gleichen WLAN? Klicke unten auf den Auftrag. Dann klicke auf „Gerät hinzufügen“ oder „Hinzufügen“. Moderne Drucker findet der Computer von allein.",
        auftragKnopf: "AUFTRAG: Öffne die Drucker-Einstellungen",
        auftragCmd: "open_settings",
        auftragArg: "printers",
        erfolgText: "Du hast deinen Drucker eingerichtet! Zum Testen kannst du später eine Seite drucken.",
        schonErledigtText: "Dein Computer kennt deinen Drucker schon. Nichts zu tun — prima!",
      },
      {
        k: "sag",
        text: "Kein Drucker im Haus? Auch gut. Man kann fast alles als PDF speichern. Ein PDF ist wie ein festes Blatt Papier im Computer. Deine Helfer in der Cloud zeigen dir das später.",
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
        text: {
          standard: "Eine E-Mail fragt nach deinem Passwort. Was tust du?",
          senior: "Eine E-Mail sagt: „Ihre Bank braucht Ihr Passwort.“ Was tust du?",
          beruf: "Eine E-Mail sagt: „Dringend! Ihr Firmenkonto braucht Ihr Passwort.“ Was tust du?",
          jung: "Eine Nachricht sagt: „Dein Konto wird gesperrt! Schick dein Passwort.“ Was tust du?",
        },
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
          { t: "Die Adresse oben eintippen und die Enter-Taste drücken", ok: true },
          {
            t: "Den Computer neu starten",
            ok: false,
            antwort:
              "Nicht nötig! Einfach oben in die Adresszeile tippen. Dann die große Enter-Taste drücken. Das ist alles.",
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
        k: "auftrag",
        text: "Probier es gleich aus. Ich öffne deinen Browser für dich.",
        knopf: "AUFTRAG: Öffne den Browser",
        cmd: "open_url",
        arg: "cloud",
        danach: `Drücke jetzt ${taste} und T zusammen. Schon hast du ein neues Blatt. Mit dem kleinen ✕ am Reiter machst du es wieder zu.`,
      },
      {
        k: "frage",
        text: "Wofür ist das kleine ✕ am Tab?",
        optionen: [
          { t: "Es schließt nur diesen einen Tab", ok: true },
          {
            t: "Es schließt den ganzen Browser",
            ok: false,
            antwort: "Keine Sorge — es schließt nur dieses eine Blatt. Die anderen Blätter bleiben offen.",
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
        danach: istMac
          ? "Drücke jetzt cmd (⌘) und D zusammen. Ein kleines Fenster erscheint. Klicke auf „Hinzufügen“ — fertig ist dein Merkzettel."
          : "Siehst du den Stern rechts in der Adresszeile? Klicke ihn an. Oder drücke Strg und D zusammen. Dann bestätigen — fertig ist dein Merkzettel.",
      },
      {
        k: "frage",
        text: istMac ? "Hast du das Lesezeichen gesetzt?" : "Hast du den Stern angeklickt?",
        optionen: [
          { t: "Ja, erledigt!", ok: true },
          istMac
            ? {
                t: "Es hat noch nicht geklappt",
                ok: false,
                antwort:
                  "Drücke cmd (⌘) und D zusammen. Dann erscheint ein kleines Fenster. Klicke dort auf „Hinzufügen“.",
              }
            : {
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
    id: "koennen",
    akt: 2,
    titel: "Was wir noch alles können",
    schritte: [
      {
        k: "sag",
        text: {
          standard:
            "Bevor du dich anmeldest, zeige ich dir, was dich erwartet. Die Cloud ist ein Ort im Internet. Dort wohnt dein Team: Helfer, die für dich SCHREIBEN. Du sagst, was du brauchst. Sie machen einen Entwurf. Du entscheidest.",
          senior:
            "Bevor du dich anmeldest, zeige ich dir, was dich erwartet. Die Cloud ist ein Ort im Internet. Dort wohnen deine Helfer. Sie SCHREIBEN für dich: den Brief an die Krankenkasse. Die Einladung zum Geburtstag. Den Gruß an die Enkel. Du sagst, was du brauchst — sie machen einen Entwurf. Du entscheidest.",
          beruf:
            "Bevor du dich anmeldest, zeige ich dir, was dich erwartet. Die Cloud ist ein Ort im Internet. Dort wohnen deine Helfer. Sie SCHREIBEN für dich: Angebote. Rechnungstexte. Antworten auf Kundenfragen. Werbetexte. Du gibst Stichpunkte — sie machen einen Entwurf. Du entscheidest.",
          jung: "Bevor du dich anmeldest, zeige ich dir, was dich erwartet. Die Cloud ist ein Ort im Internet. Dort wohnen deine Helfer. Sie SCHREIBEN für dich: die Bewerbung. Die Zusammenfassung. Die Gliederung der Hausarbeit. Du gibst Stichpunkte — sie machen einen Entwurf. Du entscheidest.",
        },
      },
      {
        k: "sag",
        text: {
          standard:
            "Sie können noch mehr. Sie RECHNEN für dich: Tabellen rechnen sich selbst aus — wie ein Haushaltsbuch. Sie erstellen BILDER. Sie PLANEN Termine und Projekte. Und sie LESEN dir alles VOR, wenn du lieber zuhörst.",
          senior:
            "Sie können noch mehr. Dein Haushaltsbuch rechnet sich selbst. Sie erstellen BILDER. Sie planen Termine und Wochen. Und sie lesen dir alles VOR. Zuhören statt lesen: Das ist mein Lieblings-Knopf.",
          beruf:
            "Sie können noch mehr. Sie rechnen Preislisten und Kalkulationen. Sie machen BILDER für deine Werbung. Sie schreiben Beiträge für Facebook und Co. Sie bauen mit dir eine eigene HOMEPAGE — Schritt für Schritt. Und sie lesen dir alles vor, wenn du unterwegs bist.",
          jung: "Sie können noch mehr. Tabellen für dein Budget. Lernpläne bis zur Prüfung. Karteikarten aus deinem Skript. BILDER für Projekte. Und alles vorlesen, wenn du lieber zuhörst.",
        },
      },
      {
        k: "sag",
        text: "Und ich? Ich bleibe dein Begleiter. In der Cloud wohne ich unten in der Ecke. Ich erkläre dir dort jeden Helfer. Und ich schlage dir die ersten Aufträge vor. Wichtig bleibt: Die Helfer schlagen vor — entscheiden tust immer du. Mensch mit Maschine.",
      },
    ],
  },
  {
    id: "verbinden",
    akt: 2,
    titel: "Deine Helfer warten",
    schritte: [
      {
        k: "auftrag",
        text: "Jetzt kommt der schönste Teil: dein eigenes Konto. Das Anmelden kostet nichts. Dein Guthaben siehst du in der Cloud immer oben. Melde dich an — oder erstelle ein Konto. Ich erkläre dort jeden Schritt.",
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

/* --- Kennenlern-Check (Szene 1.0, Inhaber-Vorgabe 28.07.) ------------------ */

export const CHECK_FRAGEN = [
  "Hast du schon öfter einen Computer benutzt?",
  "Bist du schon im Internet unterwegs?",
  "Nutzt du im Internet schon mehrere Seiten gleichzeitig (Tabs)?",
];

/** Lebenssituation → Beispiele, Tonlage und Schriftgröße des Kurses. */
export const GRUPPEN_FRAGE = "Damit ich die richtigen Beispiele wähle: Was beschreibt dich am besten?";
export const GRUPPEN_OPTIONEN: { t: string; zg: Zielgruppe | null }[] = [
  { t: "Ich bin im Ruhestand", zg: "senior" },
  { t: "Ich arbeite oder habe eine Firma", zg: "beruf" },
  { t: "Ich lerne noch — Schule, Ausbildung, Studium", zg: "jung" },
  { t: "Sage ich lieber nicht", zg: null },
];

/** Je-Antwort „Ja“ ein Punkt → Einstiegslevel. */
export function levelAusAntworten(ja: number): SkillLevel {
  if (ja >= 3) return "geuebt";
  if (ja >= 2) return "etwas";
  return "neu";
}

/** Welche Szenen gelten je Level als „kenn ich schon“ (vorab abgehakt)?
    „koennen“ und „verbinden“ werden NIE übersprungen — sie sind das Ziel. */
export function vorabErledigt(level: SkillLevel): string[] {
  if (level === "geuebt") return ["wlan", "drucker", "dateien", "ausschalten", "schutz", "browser", "tabs"];
  if (level === "etwas") return ["dateien", "ausschalten", "browser"];
  return [];
}

/* --- Fortschritt (lokal; später Sync über /api/v1/nobody/progress) --------- */

export interface KursStand {
  level: SkillLevel | null;
  /** null = „sage ich lieber nicht“; undefined = noch nie gefragt */
  zielgruppe?: Zielgruppe | null;
  erledigt: Record<string, boolean>;
}

const KEY = "niemand.kurs.v1";

export function ladeStand(): KursStand {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<KursStand> | null;
      if (p && typeof p === "object") {
        return {
          level: p.level ?? null,
          zielgruppe: p.zielgruppe,
          erledigt: p.erledigt && typeof p.erledigt === "object" ? p.erledigt : {},
        };
      }
    }
  } catch {
    /* Neustart mit leerem Stand */
  }
  return { level: null, erledigt: {} };
}

export function speichereStand(stand: KursStand): void {
  localStorage.setItem(KEY, JSON.stringify(stand));
}
