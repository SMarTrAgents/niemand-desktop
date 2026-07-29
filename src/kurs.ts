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
 *
 * Zweisprachig ab 0.5.0: Jeder Text ist ein LText { de, en }. Die deutschen
 * Texte sind WÖRTLICH unverändert. Englisch in einfacher Sprache (kurze
 * Sätze, ein Gedanke pro Satz, warm, nie „wrong/error“ — stattdessen
 * „Almost!“ / „No worries“). Feste Konvention: „AUFTRAG:“ → „TASK:“.
 */

import type { Sprache } from "./i18n";
import { QUELLSPRACHE, SPRACHEN, setzeKursPruefer } from "./i18n";

export type SkillLevel = "neu" | "etwas" | "geuebt";
export type Zielgruppe = "senior" | "beruf" | "jung";

/** Text mit optionalen Zielgruppen-Varianten. */
export type TextVar = string | ({ standard: string } & Partial<Record<Zielgruppe, string>>);

/**
 * Ein Text in allen Sprachen — jede Seite darf Zielgruppen-Varianten tragen.
 *
 * **Deutsch ist Pflicht, alles andere freiwillig.** Das ist die eine Zeile, an
 * der die Mitarbeit hängt: Vorher stand hier `{ de: TextVar; en: TextVar }`,
 * beide Sprachen als Pflichtfelder. Wer eine dritte Sprache eintragen wollte,
 * musste sie in JEDEM Textobjekt dieser Datei ergänzen — 644 Zeilen —, sonst
 * kompilierte TypeScript nicht. Eine halbe Übersetzung war damit technisch
 * unmöglich, und eine Mauer am Anfang ist dasselbe wie eine geschlossene Tür.
 *
 * Jetzt gilt: Trag ein, was du hast. Der Rest fällt auf Deutsch zurück, und
 * deine Sprache erscheint in der Auswahl, sobald sie vollständig ist.
 */
export type LText = { de: TextVar } & Partial<Record<Sprache, TextVar>>;

/**
 * Wählt erst die Sprache, dann die Zielgruppen-Variante (Rückfall standard).
 *
 * Der Rückfall auf die Quellsprache ist eine Sicherung, kein Betriebszustand:
 * Eine unvollständige Sprache steht gar nicht zur Wahl (i18n.ts,
 * `verfuegbareSprachen`). Er verhindert nur, dass ein einzelner vergessener
 * Text den Kurs anhält — mitten in einer Lektion ist ein deutscher Satz
 * unendlich viel besser als ein Absturz.
 */
export function textFuer(lt: LText, sprache: Sprache, zg: Zielgruppe | null): string {
  const t = lt[sprache] ?? lt[QUELLSPRACHE];
  if (typeof t === "string") return t;
  return (zg && t[zg]) || t.standard;
}

export type Schritt =
  | { k: "sag"; text: LText }
  | {
      k: "auftrag";
      text: LText;
      knopf: LText;
      cmd: "open_settings" | "open_url";
      arg: string;
      danach?: LText;
    }
  | {
      k: "pruef";
      check: "online" | "drucker";
      warteText: LText;
      auftragKnopf?: LText;
      auftragCmd?: "open_settings";
      auftragArg?: string;
      erfolgText: LText;
      schonErledigtText: LText;
    }
  | {
      k: "frage";
      text: LText;
      optionen: { t: LText; ok: boolean; antwort?: LText }[];
    };

export interface Szene {
  id: string;
  akt: 1 | 2;
  titel: LText;
  schritte: Schritt[];
}

const istWindows = navigator.userAgent.includes("Windows");
const istMac = navigator.userAgent.includes("Mac OS");
/** Mac sagt cmd (⌘), alle anderen Strg — sonst scheitert die erste Tastenübung. */
const tasteDe = istMac ? "cmd (⌘)" : "Strg";
/** Englisch heißt dieselbe Taste Ctrl — auf dem Mac bleibt es cmd (⌘). */
const tasteEn = istMac ? "cmd (⌘)" : "Ctrl";
const ausschaltenWegDe = istWindows
  ? "Klicke unten auf das Fenster-Symbol (Start). Es ist meist in der Mitte der Leiste. Dann auf den Kreis mit dem Strich (Ein/Aus). Dann auf „Herunterfahren“."
  : istMac
    ? "Klicke oben links auf den Apfel. Dann auf „Ausschalten …“."
    : "Klicke oben rechts auf die Symbole. Dann auf das Ein/Aus-Zeichen. Dann auf „Ausschalten“.";
const ausschaltenWegEn = istWindows
  ? "Click the window icon (Start) at the bottom. It is usually in the middle of the bar. Then click the circle with the small line (power). Then click “Shut down”."
  : istMac
    ? "Click the Apple at the top left. Then click “Shut Down …”."
    : "Click the icons at the top right. Then click the power sign. Then click “Power Off”.";

export const KURS: Szene[] = [
  {
    id: "wlan",
    akt: 1,
    titel: { de: "Ab ins Netz: dein Internet", en: "Off to the net: your internet" },
    schritte: [
      {
        k: "sag",
        text: {
          de: "Ohne Internet ist der Computer wie ein Telefon ohne Leitung. Ich schaue mal nach, ob du verbunden bist.",
          en: "Without the internet, the computer is like a phone without a line. Let me check if you are connected.",
        },
      },
      {
        k: "pruef",
        check: "online",
        warteText: {
          de:
            "Noch kein Internet. Kein Problem — wir machen das zusammen. Klicke unten auf den Auftrag. Wähle dann dein WLAN aus der Liste." +
            (istWindows ? " Siehst du keine Liste? Klicke auf „Verfügbare Netzwerke anzeigen“." : "") +
            " Das Kennwort steht oft unten auf dem Router. Der Router ist das Internet-Kästchen mit den Lämpchen.",
          en:
            "No internet yet. No worries — we will do this together. Click the task below. Then pick your Wi-Fi from the list." +
            (istWindows ? " Do you not see a list? Click “Show available networks”." : "") +
            " The password is often on the bottom of the router. The router is the internet box with the little lights.",
        },
        auftragKnopf: {
          de: "AUFTRAG: Öffne die WLAN-Einstellungen",
          en: "TASK: Open the Wi-Fi settings",
        },
        auftragCmd: "open_settings",
        auftragArg: "wifi",
        erfolgText: {
          de: "Du bist verbunden! Das hast DU gemacht.",
          en: "You are connected! YOU did that.",
        },
        schonErledigtText: {
          de: "Du bist schon im Internet — sehr gut! Dann hoppeln wir gleich weiter.",
          en: "You are already online — very good! Then let's hop right along.",
        },
      },
    ],
  },
  {
    id: "dateien",
    akt: 1,
    titel: { de: "Deine Schubladen: Dateien und Ordner", en: "Your drawers: files and folders" },
    schritte: [
      {
        k: "sag",
        text: {
          de: {
            standard:
              "Dein Computer hat Schubladen. Wir nennen sie Ordner. In „Dokumente“ wohnen deine Briefe. In „Downloads“ landet alles aus dem Internet.",
            senior:
              "Dein Computer hat Schubladen. Wir nennen sie Ordner. In „Dokumente“ wohnen deine Briefe. In „Bilder“ die Fotos von der Familie. In „Downloads“ landet alles aus dem Internet.",
            beruf:
              "Dein Computer hat Schubladen. Wir nennen sie Ordner. In „Dokumente“ wohnen deine Angebote und Rechnungen. In „Downloads“ landet alles aus dem Internet.",
            jung: "Dein Computer hat Schubladen. Wir nennen sie Ordner. In „Dokumente“ wohnen deine Texte und Unterlagen. In „Downloads“ landet alles aus dem Internet.",
          },
          en: "Your computer has drawers. We call them folders. Your letters live in “Documents”. Everything from the internet lands in “Downloads”.",
        },
      },
      {
        k: "frage",
        text: {
          de: {
            standard: "Du lädst ein Bild aus dem Internet. Wo findest du es wieder?",
            senior: "Deine Tochter schickt dir ein Foto. Du lädst es herunter. Wo findest du es wieder?",
            beruf: "Ein Kunde schickt dir eine Datei. Du lädst sie herunter. Wo findest du sie wieder?",
            jung: "Du lädst ein Skript für die Prüfung herunter. Wo findest du es wieder?",
          },
          en: {
            standard: "You download a picture from the internet. Where do you find it again?",
            senior: "Your daughter sends you a photo. You download it. Where do you find it again?",
            beruf: "A customer sends you a file. You download it. Where do you find it again?",
            jung: "You download lecture notes for your exam. Where do you find them again?",
          },
        },
        optionen: [
          { t: { de: "Im Ordner „Downloads“", en: "In the “Downloads” folder" }, ok: true },
          {
            t: { de: "Im Papierkorb", en: "In the trash" },
            ok: false,
            antwort: {
              de: "Fast! Der Papierkorb ist für Gelöschtes. Alles aus dem Internet landet in „Downloads“.",
              en: "Almost! The trash is for deleted things. Everything from the internet lands in “Downloads”.",
            },
          },
        ],
      },
      {
        k: "sag",
        text: {
          de: "Merke: Eine Datei ist ein Blatt Papier. Ein Ordner ist die Schublade dafür. Mehr brauchst du heute nicht.",
          en: "Remember: a file is a sheet of paper. A folder is the drawer for it. That is all you need today.",
        },
      },
    ],
  },
  {
    id: "drucker",
    akt: 1,
    titel: { de: "Dein Drucker", en: "Your printer" },
    schritte: [
      {
        k: "sag",
        text: {
          de: {
            standard:
              "Papier ist geduldig — und manchmal einfach praktisch. Ich schaue nach, ob dein Computer deinen Drucker schon kennt.",
            beruf:
              "Angebote, Rechnungen, Lieferscheine — vieles will aufs Papier. Ich schaue nach, ob dein Computer deinen Drucker schon kennt.",
          },
          en: "Paper is patient — and sometimes just practical. Let me check if your computer already knows your printer.",
        },
      },
      {
        k: "pruef",
        check: "drucker",
        warteText: {
          de: "Ich sehe noch keinen Drucker. Ist er eingeschaltet? Steckt das Kabel? Oder ist er im gleichen WLAN? Klicke unten auf den Auftrag. Dann klicke auf „Gerät hinzufügen“ oder „Hinzufügen“. Moderne Drucker findet der Computer von allein.",
          en: "I do not see a printer yet. Is it switched on? Is the cable plugged in? Or is it on the same Wi-Fi? Click the task below. Then click “Add device” or “Add”. The computer finds modern printers on its own.",
        },
        auftragKnopf: {
          de: "AUFTRAG: Öffne die Drucker-Einstellungen",
          en: "TASK: Open the printer settings",
        },
        auftragCmd: "open_settings",
        auftragArg: "printers",
        erfolgText: {
          de: "Du hast deinen Drucker eingerichtet! Zum Testen kannst du später eine Seite drucken.",
          en: "You set up your printer! To test it, you can print a page later.",
        },
        schonErledigtText: {
          de: "Dein Computer kennt deinen Drucker schon. Nichts zu tun — prima!",
          en: "Your computer already knows your printer. Nothing to do — great!",
        },
      },
      {
        k: "sag",
        text: {
          de: "Kein Drucker im Haus? Auch gut. Man kann fast alles als PDF speichern. Ein PDF ist wie ein festes Blatt Papier im Computer. Deine Helfer in der Cloud zeigen dir das später.",
          en: "No printer at home? That is fine too. You can save almost anything as a PDF. A PDF is like a firm sheet of paper inside the computer. Your helpers in the cloud will show you later.",
        },
      },
    ],
  },
  {
    id: "ausschalten",
    akt: 1,
    titel: { de: "Richtig ausschalten", en: "Switching off the right way" },
    schritte: [
      {
        k: "sag",
        text: {
          de: `Den Computer schaltet man nicht am Stecker aus. Er will sich ordentlich verabschieden. So geht es: ${ausschaltenWegDe}`,
          en: `You do not switch off the computer by pulling the plug. It wants to say goodbye properly. Here is how: ${ausschaltenWegEn}`,
        },
      },
      {
        k: "frage",
        text: {
          de: "Der Computer hängt und nichts geht mehr. Was tust du zuerst?",
          en: "The computer is stuck and nothing works. What do you do first?",
        },
        optionen: [
          {
            t: { de: "Kurz warten und nochmal probieren", en: "Wait a moment and try again" },
            ok: true,
          },
          {
            t: { de: "Sofort den Stecker ziehen", en: "Pull the plug right away" },
            ok: false,
            antwort: {
              de: "Lieber nicht — dabei können Dateien kaputtgehen. Erst warten. Wenn gar nichts mehr geht: den Einschalt-Knopf lange gedrückt halten.",
              en: "Better not — files can break that way. Wait first. If nothing works at all: press and hold the power button.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "schutz",
    akt: 1,
    titel: { de: "Die goldene Regel", en: "The golden rule" },
    schritte: [
      {
        k: "sag",
        text: {
          de: "Eine Regel schützt dich fast immer: Dein Passwort gehört nur dir. Ich frage dich nie danach. Ehrliche Firmen tun das auch nicht.",
          en: "One rule protects you almost always: your password belongs only to you. I will never ask for it. Honest companies do not ask either.",
        },
      },
      {
        k: "frage",
        text: {
          de: {
            standard: "Eine E-Mail fragt nach deinem Passwort. Was tust du?",
            senior: "Eine E-Mail sagt: „Ihre Bank braucht Ihr Passwort.“ Was tust du?",
            beruf: "Eine E-Mail sagt: „Dringend! Ihr Firmenkonto braucht Ihr Passwort.“ Was tust du?",
            jung: "Eine Nachricht sagt: „Dein Konto wird gesperrt! Schick dein Passwort.“ Was tust du?",
          },
          en: {
            standard: "An email asks for your password. What do you do?",
            senior: "An email says: “Your bank needs your password.” What do you do?",
            beruf: "An email says: “Urgent! Your business account needs your password.” What do you do?",
            jung: "A message says: “Your account will be locked! Send your password.” What do you do?",
          },
        },
        optionen: [
          { t: { de: "Löschen und niemandem geben", en: "Delete it and give it to no one" }, ok: true },
          {
            t: { de: "Das Passwort zurückschreiben", en: "Write back with the password" },
            ok: false,
            antwort: {
              de: "Bitte nie! Wer nach deinem Passwort fragt, will dich reinlegen. Löschen ist richtig.",
              en: "Please never! Anyone who asks for your password wants to trick you. Deleting is right.",
            },
          },
        ],
      },
      {
        k: "sag",
        text: {
          de: "Und noch ein Freund: Updates. Wenn dein Computer ein Update möchte, lass es zu. Es macht ihn sicherer.",
          en: "And one more friend: updates. When your computer wants an update, let it. It makes it safer.",
        },
      },
    ],
  },
  {
    id: "browser",
    akt: 2,
    titel: { de: "Dein Fenster ins Netz: der Browser", en: "Your window to the net: the browser" },
    schritte: [
      {
        k: "sag",
        text: {
          de: "Das Internet ist wie eine große Stadt. Der Browser ist dein Fenster. Du schaust hindurch und besuchst Seiten.",
          en: "The internet is like a big city. The browser is your window. You look through it and visit pages.",
        },
      },
      {
        k: "sag",
        text: {
          de: "Oben im Browser ist die Adresszeile — wie ein Navi. Kennst du die Adresse, tippst du sie ein. Kennst du sie nicht, tippst du eine Frage. Dann sucht er für dich.",
          en: "At the top of the browser is the address bar — like a navigation system. If you know the address, you type it in. If you do not know it, you type a question. Then it searches for you.",
        },
      },
      {
        k: "frage",
        text: {
          de: "Du willst zu cloud.smartragents.ai. Was machst du?",
          en: "You want to go to cloud.smartragents.ai. What do you do?",
        },
        optionen: [
          {
            t: {
              de: "Die Adresse oben eintippen und die Enter-Taste drücken",
              en: "Type the address at the top and press the Enter key",
            },
            ok: true,
          },
          {
            t: { de: "Den Computer neu starten", en: "Restart the computer" },
            ok: false,
            antwort: {
              de: "Nicht nötig! Einfach oben in die Adresszeile tippen. Dann die große Enter-Taste drücken. Das ist alles.",
              en: "No need! Just type into the address bar at the top. Then press the big Enter key. That is all.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "tabs",
    akt: 2,
    titel: { de: "Tabs: mehrere Seiten gleichzeitig", en: "Tabs: many pages at once" },
    schritte: [
      {
        k: "sag",
        text: {
          de: "Ein Tab ist ein Reiter oben im Browser — wie ein zweites Blatt Papier. Du kannst viele Seiten offen haben und zwischen ihnen wechseln.",
          en: "A tab is a little card at the top of the browser — like a second sheet of paper. You can have many pages open and switch between them.",
        },
      },
      {
        k: "auftrag",
        text: {
          de: "Probier es gleich aus. Ich öffne deinen Browser für dich.",
          en: "Try it right now. I will open your browser for you.",
        },
        knopf: { de: "AUFTRAG: Öffne den Browser", en: "TASK: Open the browser" },
        cmd: "open_url",
        arg: "cloud",
        danach: {
          de: `Drücke jetzt ${tasteDe} und T zusammen. Schon hast du ein neues Blatt. Mit dem kleinen ✕ am Reiter machst du es wieder zu.`,
          en: `Now press ${tasteEn} and T together. There — you have a new sheet. With the little ✕ on the tab you close it again.`,
        },
      },
      {
        k: "frage",
        text: {
          de: "Wofür ist das kleine ✕ am Tab?",
          en: "What is the little ✕ on the tab for?",
        },
        optionen: [
          {
            t: { de: "Es schließt nur diesen einen Tab", en: "It closes only this one tab" },
            ok: true,
          },
          {
            t: { de: "Es schließt den ganzen Browser", en: "It closes the whole browser" },
            ok: false,
            antwort: {
              de: "Keine Sorge — es schließt nur dieses eine Blatt. Die anderen Blätter bleiben offen.",
              en: "No worries — it closes only this one sheet. The other sheets stay open.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "favoriten",
    akt: 2,
    titel: { de: "Dein Merkzettel: Favoriten", en: "Your notes: favorites" },
    schritte: [
      {
        k: "sag",
        text: {
          de: "Gute Orte merkt man sich. Ein Favorit (auch Lesezeichen genannt) ist dein Merkzettel im Browser. Setzen wir jetzt den wichtigsten.",
          en: "Good places are worth remembering. A favorite (also called a bookmark) is your note in the browser. Let's set the most important one now.",
        },
      },
      {
        k: "auftrag",
        text: {
          de: "Ich öffne die Seite, auf der bald deine Helfer wohnen.",
          en: "I will open the page where your helpers will soon live.",
        },
        knopf: { de: "AUFTRAG: Öffne cloud.smartragents.ai", en: "TASK: Open cloud.smartragents.ai" },
        cmd: "open_url",
        arg: "cloud",
        danach: istMac
          ? {
              de: "Drücke jetzt cmd (⌘) und D zusammen. Ein kleines Fenster erscheint. Klicke auf „Hinzufügen“ — fertig ist dein Merkzettel.",
              en: "Now press cmd (⌘) and D together. A small window appears. Click “Add” — your note is done.",
            }
          : {
              de: "Siehst du den Stern rechts in der Adresszeile? Klicke ihn an. Oder drücke Strg und D zusammen. Dann bestätigen — fertig ist dein Merkzettel.",
              en: "Do you see the star on the right in the address bar? Click it. Or press Ctrl and D together. Then confirm — your note is done.",
            },
      },
      {
        k: "frage",
        text: istMac
          ? { de: "Hast du das Lesezeichen gesetzt?", en: "Did you set the bookmark?" }
          : { de: "Hast du den Stern angeklickt?", en: "Did you click the star?" },
        optionen: [
          { t: { de: "Ja, erledigt!", en: "Yes, done!" }, ok: true },
          istMac
            ? {
                t: { de: "Es hat noch nicht geklappt", en: "It has not worked yet" },
                ok: false,
                antwort: {
                  de: "Drücke cmd (⌘) und D zusammen. Dann erscheint ein kleines Fenster. Klicke dort auf „Hinzufügen“.",
                  en: "Press cmd (⌘) and D together. A small window appears. Click “Add” there.",
                },
              }
            : {
                t: { de: "Ich finde den Stern nicht", en: "I cannot find the star" },
                ok: false,
                antwort: {
                  de: "Der Stern ist ganz rechts IN der Adresszeile — dort, wo die Adresse steht. Du kannst auch Strg und D zusammen drücken.",
                  en: "The star is on the far right INSIDE the address bar — right where the address is. You can also press Ctrl and D together.",
                },
              },
        ],
      },
    ],
  },
  {
    id: "koennen",
    akt: 2,
    titel: { de: "Was wir noch alles können", en: "What else we can do" },
    schritte: [
      {
        k: "sag",
        text: {
          de: {
            standard:
              "Bevor du dich anmeldest, zeige ich dir, was dich erwartet. Die Cloud ist ein Ort im Internet. Dort wohnt dein Team: Helfer, die für dich SCHREIBEN. Du sagst, was du brauchst. Sie machen einen Entwurf. Du entscheidest.",
            senior:
              "Bevor du dich anmeldest, zeige ich dir, was dich erwartet. Die Cloud ist ein Ort im Internet. Dort wohnen deine Helfer. Sie SCHREIBEN für dich: den Brief an die Krankenkasse. Die Einladung zum Geburtstag. Den Gruß an die Enkel. Du sagst, was du brauchst — sie machen einen Entwurf. Du entscheidest.",
            beruf:
              "Bevor du dich anmeldest, zeige ich dir, was dich erwartet. Die Cloud ist ein Ort im Internet. Dort wohnen deine Helfer. Sie SCHREIBEN für dich: Angebote. Rechnungstexte. Antworten auf Kundenfragen. Werbetexte. Du gibst Stichpunkte — sie machen einen Entwurf. Du entscheidest.",
            jung: "Bevor du dich anmeldest, zeige ich dir, was dich erwartet. Die Cloud ist ein Ort im Internet. Dort wohnen deine Helfer. Sie SCHREIBEN für dich: die Bewerbung. Die Zusammenfassung. Die Gliederung der Hausarbeit. Du gibst Stichpunkte — sie machen einen Entwurf. Du entscheidest.",
          },
          en: {
            standard:
              "Before you sign up, let me show you what awaits you. The cloud is a place on the internet. Your team lives there: helpers who WRITE for you. You say what you need. They make a draft. You decide.",
            senior:
              "Before you sign up, let me show you what awaits you. The cloud is a place on the internet. Your helpers live there. They WRITE for you: the letter to the health insurance. The birthday invitation. The greeting to the grandchildren. You say what you need — they make a draft. You decide.",
            beruf:
              "Before you sign up, let me show you what awaits you. The cloud is a place on the internet. Your helpers live there. They WRITE for you: offers. Invoice texts. Answers to customer questions. Ad texts. You give key points — they make a draft. You decide.",
            jung: "Before you sign up, let me show you what awaits you. The cloud is a place on the internet. Your helpers live there. They WRITE for you: the job application. The summary. The outline for your paper. You give key points — they make a draft. You decide.",
          },
        },
      },
      {
        k: "sag",
        text: {
          de: {
            standard:
              "Sie können noch mehr. Sie RECHNEN für dich: Tabellen rechnen sich selbst aus — wie ein Haushaltsbuch. Sie erstellen BILDER. Sie PLANEN Termine und Projekte. Und sie LESEN dir alles VOR, wenn du lieber zuhörst.",
            senior:
              "Sie können noch mehr. Dein Haushaltsbuch rechnet sich selbst. Sie erstellen BILDER. Sie planen Termine und Wochen. Und sie lesen dir alles VOR. Zuhören statt lesen: Das ist mein Lieblings-Knopf.",
            beruf:
              "Sie können noch mehr. Sie rechnen Preislisten und Kalkulationen. Sie machen BILDER für deine Werbung. Sie schreiben Beiträge für Facebook und Co. Sie bauen mit dir eine eigene HOMEPAGE — Schritt für Schritt. Und sie lesen dir alles vor, wenn du unterwegs bist.",
            jung: "Sie können noch mehr. Tabellen für dein Budget. Lernpläne bis zur Prüfung. Karteikarten aus deinem Skript. BILDER für Projekte. Und alles vorlesen, wenn du lieber zuhörst.",
          },
          en: {
            standard:
              "They can do more. They CALCULATE for you: tables do the math on their own — like a household book. They create PICTURES. They PLAN dates and projects. And they READ everything OUT LOUD, if you prefer to listen.",
            senior:
              "They can do more. Your household book does the math on its own. They create PICTURES. They plan dates and weeks. And they read everything OUT LOUD to you. Listening instead of reading: that is my favorite button.",
            beruf:
              "They can do more. They calculate price lists and costings. They make PICTURES for your ads. They write posts for Facebook and co. They build your own HOMEPAGE with you — step by step. And they read everything out loud when you are on the go.",
            jung: "They can do more. Tables for your budget. Study plans up to the exam. Flashcards from your lecture notes. PICTURES for projects. And they read everything out loud, if you prefer to listen.",
          },
        },
      },
      {
        k: "sag",
        text: {
          de: "Und ich? Ich bleibe dein Begleiter. In der Cloud wohne ich unten in der Ecke. Ich erkläre dir dort jeden Helfer. Und ich schlage dir die ersten Aufträge vor. Wichtig bleibt: Die Helfer schlagen vor — entscheiden tust immer du. Mensch mit Maschine.",
          en: "And me? I stay your companion. In the cloud I live down in the corner. There I explain every helper to you. And I suggest your first tasks. One thing stays true: the helpers suggest — YOU always decide. Human with machine.",
        },
      },
    ],
  },
  {
    id: "verbinden",
    akt: 2,
    titel: { de: "Deine Helfer warten", en: "Your helpers are waiting" },
    schritte: [
      {
        k: "auftrag",
        text: {
          de: "Jetzt kommt der schönste Teil: dein eigenes Konto. Das Anmelden kostet nichts. Dein Guthaben siehst du in der Cloud immer oben. Melde dich an — oder erstelle ein Konto. Ich erkläre dort jeden Schritt.",
          en: "Now comes the best part: your own account. Signing up costs nothing. You always see your credit at the top in the cloud. Sign in — or create an account. I explain every step there.",
        },
        knopf: { de: "AUFTRAG: Öffne cloud.smartragents.ai", en: "TASK: Open cloud.smartragents.ai" },
        cmd: "open_url",
        arg: "cloud",
        danach: {
          de: "Nimm dir Zeit. Dein Passwort tippst nur du — ich schaue extra weg. Wenn du drin bist, treffen wir uns dort wieder: Ich bin der kleine Hase unten in der Ecke.",
          en: "Take your time. Only you type your password — I even look away. Once you are in, we meet again there: I am the little rabbit down in the corner.",
        },
      },
      {
        k: "sag",
        text: {
          de: "Das war dein Kurs! Computer, Internet, Browser, Favorit — alles DU. Ich bleibe hier auf deinem Schreibtisch. Wenn du mich brauchst: einfach anklicken.",
          en: "That was your course! Computer, internet, browser, favorite — all YOU. I stay here on your desktop. If you need me: just click me.",
        },
      },
    ],
  },
];

/* --- Kennenlern-Check (Szene 1.0, Inhaber-Vorgabe 28.07.) ------------------ */

export const CHECK_FRAGEN: LText[] = [
  {
    de: "Hast du schon öfter einen Computer benutzt?",
    en: "Have you used a computer often before?",
  },
  {
    de: "Bist du schon im Internet unterwegs?",
    en: "Are you already using the internet?",
  },
  {
    de: "Nutzt du im Internet schon mehrere Seiten gleichzeitig (Tabs)?",
    en: "Do you already use several pages at once on the internet (tabs)?",
  },
];

/** Lebenssituation → Beispiele, Tonlage und Schriftgröße des Kurses. */
export const GRUPPEN_FRAGE: LText = {
  de: "Damit ich die richtigen Beispiele wähle: Was beschreibt dich am besten?",
  en: "So I can pick the right examples: what describes you best?",
};
export const GRUPPEN_OPTIONEN: { t: LText; zg: Zielgruppe | null }[] = [
  { t: { de: "Ich bin im Ruhestand", en: "I am retired" }, zg: "senior" },
  { t: { de: "Ich arbeite oder habe eine Firma", en: "I work or have a business" }, zg: "beruf" },
  {
    t: {
      de: "Ich lerne noch — Schule, Ausbildung, Studium",
      en: "I am still learning — school, training, university",
    },
    zg: "jung",
  },
  { t: { de: "Sage ich lieber nicht", en: "I would rather not say" }, zg: null },
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

/* ===================================================================
 * Vollständigkeit der Kurstexte
 * ===================================================================
 *
 * Gezählt wird, was einer Sprache noch fehlt — nicht, ob sie „gut genug“ ist.
 * Diese Zahl steht in `npm run sprachen` und entscheidet zusammen mit den
 * Oberflächentexten, ob eine Sprache in der Auswahl auftaucht (i18n.ts).
 *
 * Der Zähler läuft über die WIRKLICHEN Daten und nicht über eine gepflegte
 * Liste. Eine Liste, die jemand nachziehen muss, ist eine Liste, die
 * irgendwann nicht mehr stimmt — dieser Fehler hat dieses Projekt an anderer
 * Stelle schon Zeit gekostet.
 */

/** Sammelt jedes LText-Objekt, das irgendwo in den Kursdaten steckt. */
function alleTexte(): LText[] {
  const gefunden: LText[] = [];
  const gesehen = new Set<unknown>();

  const gehe = (wert: unknown): void => {
    if (wert === null || typeof wert !== "object") return;
    if (gesehen.has(wert)) return; // gegen Ringe, falls je welche entstehen
    gesehen.add(wert);
    if (Array.isArray(wert)) {
      for (const x of wert) gehe(x);
      return;
    }
    /* Ein LText erkennt man daran, dass er die Quellsprache trägt und deren
       Wert ein Text oder eine Zielgruppen-Variante ist. */
    const kandidat = wert as Record<string, unknown>;
    const quelle = kandidat[QUELLSPRACHE];
    if (typeof quelle === "string" || (quelle !== null && typeof quelle === "object" && "standard" in (quelle as object))) {
      gefunden.push(wert as LText);
      return; // ein LText hat keine verschachtelten LTexte
    }
    for (const x of Object.values(kandidat)) gehe(x);
  };

  gehe(KURS);
  gehe(CHECK_FRAGEN);
  gehe(GRUPPEN_FRAGE);
  gehe(GRUPPEN_OPTIONEN);
  return gefunden;
}

/** Wie viele Kurstexte es insgesamt gibt (= was eine Sprache leisten muss). */
export function kurstexteGesamt(): number {
  return alleTexte().length;
}

/** Wie viele Kurstexte einer Sprache noch fehlen. */
export function fehlendeKurstexte(s: Sprache): number {
  if (s === QUELLSPRACHE) return 0;
  return alleTexte().filter((t) => t[s] === undefined).length;
}

/* Beim Laden bei i18n.ts anmelden, damit `verfuegbareSprachen()` beide Seiten
   kennt und niemand zwei Stellen im Blick behalten muss. */
setzeKursPruefer(fehlendeKurstexte);

/* `SPRACHEN` wird hier nur importiert, damit dieses Modul mit derselben
   Sprachliste rechnet wie die Oberfläche. Ein zweiter Ort für dieselbe Liste
   wäre genau der Fehler, den die Prüfung oben verhindern soll. */
void SPRACHEN;
