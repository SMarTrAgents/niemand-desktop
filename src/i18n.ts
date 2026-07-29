/**
 * Mehrsprachigkeit — Niemand spricht Deutsch und einfaches Englisch, und ab
 * 0.7.0 jede Sprache, die jemand beisteuert. Hier wohnen ALLE festen
 * Oberflächentexte aus App.tsx und Course.tsx; die Kurstexte selbst liegen
 * mehrsprachig in kurs.ts (LText).
 *
 * Sprachwahl: gespeicherte Wahl (localStorage) vor Systemsprache.
 * Ton in jeder Sprache wie auf Deutsch: kurze Sätze, ein Gedanke pro Satz,
 * warm, nie „falsch/Fehler“ — stattdessen „Fast!“ / „Kein Problem“.
 * Feste Produktkonvention: „AUFTRAG: …“ heißt auf Englisch „TASK: …“.
 *
 * ===================================================================
 * FÜR ÜBERSETZER — das Wichtigste in fünf Zeilen
 * ===================================================================
 * 1. Trag deinen Sprachcode unten in SPRACHEN ein.
 * 2. Schreib deine Texte neben die deutschen. Du musst NICHT alles auf
 *    einmal machen — was fehlt, fällt auf Deutsch zurück.
 * 3. Schick den Stand als Pull Request. Auch halbfertig. Wirklich.
 * 4. `npm run sprachen` sagt dir, wie weit du bist und was noch fehlt.
 * 5. Deine Sprache erscheint in der Auswahl erst, wenn sie VOLLSTÄNDIG ist —
 *    bis dahin sieht niemand ein halb übersetztes Programm.
 *
 * Punkt 5 ist eine Entscheidung für die Menschen, für die das hier gebaut
 * ist: Wer zum ersten Mal am Computer sitzt, kommt mit einem Programm, das
 * mitten im Satz die Sprache wechselt, nicht zurecht. Deshalb sammeln wir
 * lieber, bis eine Sprache trägt.
 * ===================================================================
 */

/**
 * Die Sprachen, die es gibt. Deutsch ist die Quellsprache: Es ist die einzige,
 * die vollständig sein MUSS, und der Rückfall für alles, was anderswo fehlt.
 *
 * Eine neue Sprache trägt sich hier ein — eine Zeile, mehr nicht.
 */
export const SPRACHEN = ["de", "en"] as const;

export type Sprache = (typeof SPRACHEN)[number];

/**
 * Die Quellsprache. Sie ist nie unvollständig und immer der letzte Rückfall.
 *
 * Bewusst als Literal (`as const`) und nicht als `Sprache` typisiert: Nur so
 * weiß TypeScript beim Zugriff `lt[QUELLSPRACHE]`, dass dort wirklich etwas
 * steht — bei der breiteren Typisierung wäre jeder Rückfall wieder
 * `undefined`-verdächtig, und der Rückfall ist genau die Stelle, die halten
 * muss.
 */
export const QUELLSPRACHE = "de" as const;
export type Quellsprache = typeof QUELLSPRACHE;

/**
 * Wie eine Sprache heißt — in ihrer eigenen Sprache, denn die Auswahl liest
 * jemand, der die anderen nicht kann.
 */
export const SPRACHNAMEN: Record<Sprache, string> = {
  de: "Deutsch",
  en: "English",
};

const SPRACHE_KEY = "niemand.sprache";

function istSprache(wert: unknown): wert is Sprache {
  return typeof wert === "string" && (SPRACHEN as readonly string[]).includes(wert);
}

export function ladeSprache(): Sprache {
  try {
    const raw = localStorage.getItem(SPRACHE_KEY);
    /* Eine gespeicherte Wahl gilt nur, solange die Sprache noch vollständig
       ist. Wird eine Sprache je zurückgebaut, landet der Mensch nicht in einem
       halben Programm, sondern sanft in seiner Systemsprache. */
    if (istSprache(raw) && verfuegbareSprachen().includes(raw)) return raw;
  } catch {
    /* kein Speicher verfügbar → Systemsprache entscheidet */
  }
  const system = (navigator.language || "").slice(0, 2).toLowerCase();
  const verfuegbar = verfuegbareSprachen();
  if (istSprache(system) && verfuegbar.includes(system)) return system;
  return verfuegbar.includes("en") ? "en" : QUELLSPRACHE;
}

export function speichereSprache(s: Sprache): void {
  try {
    localStorage.setItem(SPRACHE_KEY, s);
  } catch {
    /* kein Speicher — dann gilt die Wahl nur für diese Sitzung */
  }
}

/** Alle festen Oberflächentexte einer Sprache. */
export interface UiTexte {
  /* --- App.tsx: Sprechblasen ------------------------------------------- */
  name: string;
  ariaSpricht: string;
  ariaZeigt: string;
  blaseSchliessen: string;
  gruss: string;
  kursStarten: string;
  kursFortsetzen: string;
  meineLektionen: string;
  /** Gag-Reihe: Knöpfe sind nur Zeichen — die Hints tragen die Wörter (aria/title). */
  kunststuecke: string;
  hoppelnHint: string;
  nachdenkenHint: string;
  rechnenHint: string;
  freuenHint: string;
  einstellungenZeigen: string;
  schlafen: string;
  beenden: string;
  /* --- Aufgabenzettel (v0.6.0) ------------------------------------------ */
  aufgabenKnopf: string;
  aufgabenKnopfMit: (offen: number) => string;
  aufgabenTitel: string;
  zettelSchliessen: string;
  ariaAufgaben: string;
  aufgabenLeer: string;
  aufgabenZaehler: (offen: number, erledigt: number) => string;
  aufgabenEingabe: string;
  aufschreiben: string;
  abhakenHint: string;
  loeschenScharfHint: string;
  endgueltigLoeschenHint: string;
  wiederAufmachenHint: string;
  vonCloudMarke: string;
  cloudVerbindenKnopf: string;
  cloudVerbunden: (email: string) => string;
  cloudGetrennt: string;
  cloudOffline: string;
  cloudAbmelden: string;
  anmeldenTitel: string;
  anmeldenErklaerung: string;
  emailFeld: string;
  passwortFeld: string;
  totpFeld: string;
  anmeldenKnopf: string;
  loginFehler: (code: string) => string;
  /** Umschalt-Knopf zeigt immer die JEWEILS ANDERE Sprache. */
  sprachWechsel: string;
  zeigenText: string;
  auftragTon: string;
  spaeter: string;
  hasenAria: string;
  hasenTitel: string;
  /* --- Course.tsx: Kurs-Chrome ----------------------------------------- */
  ariaKennenlernen: string;
  kennenlernenTitel: string;
  kursSchliessen: string;
  kennenlernenText: string;
  ja: string;
  neinNochNicht: string;
  nochEineFrage: string;
  ariaLektionen: string;
  deinKurs: string;
  lektionenGeschafft: (fertig: number, alle: number) => string;
  allesGeschafft: string;
  weiter: string;
  akt: string;
  zurueckZurListe: string;
  kennIchSchon: string;
  zurLektionsliste: string;
  spaeterWeitermachen: string;
  schaueNach: string;
  quizAusweich: string;
}

/**
 * Die Oberflächentexte, so wie sie eingetragen sind.
 *
 * Deutsch ist vollständig — das erzwingt der Typ. Jede andere Sprache darf
 * Lücken haben: `Partial`. Genau das macht eine halbe Übersetzung mergefähig,
 * und genau daran ist der alte Aufbau gescheitert (`Record<Sprache, UiTexte>`
 * verlangte von jeder neuen Sprache alles auf einmal — 295 Zeilen hier plus
 * 644 in kurs.ts, bevor überhaupt etwas kompilierte).
 */
export const UI_ROH: { de: UiTexte } & Partial<Record<Sprache, Partial<UiTexte>>> = {
  de: {
    name: "Niemand",
    ariaSpricht: "Niemand spricht",
    ariaZeigt: "Niemand zeigt etwas",
    blaseSchliessen: "Sprechblase schließen",
    gruss: "Hallo! Ich bin Niemand. Was wollen wir machen?",
    kursStarten: "🥕 Computerkurs starten",
    kursFortsetzen: "🥕 Kurs fortsetzen",
    meineLektionen: "🥕 Meine Lektionen",
    kunststuecke: "Kunststücke:",
    hoppelnHint: "Hoppeln",
    nachdenkenHint: "Nachdenken",
    rechnenHint: "Rechnen — öffnet den Taschenrechner",
    freuenHint: "Freuen",
    einstellungenZeigen: "Meine Einstellungen",
    schlafen: "Schlafen",
    beenden: "Beenden",
    aufgabenKnopf: "📝 Mein Aufgabenzettel",
    aufgabenKnopfMit: (offen) => `📝 Mein Aufgabenzettel (${offen})`,
    aufgabenTitel: "Dein Aufgabenzettel",
    zettelSchliessen: "Zettel schließen",
    ariaAufgaben: "Dein Aufgabenzettel",
    aufgabenLeer:
      "Dein Zettel ist noch leer. Schreib unten etwas auf — oder lass deine Agenten planen.",
    aufgabenZaehler: (offen, erledigt) => `${offen} offen · ${erledigt} erledigt`,
    aufgabenEingabe: "Was steht an?",
    aufschreiben: "Aufschreiben",
    abhakenHint: "Als erledigt abhaken",
    loeschenScharfHint: "Erledigt — noch einmal tippen zum Löschen",
    endgueltigLoeschenHint: "Löschen — jetzt tippen und der Eintrag ist weg",
    wiederAufmachenHint: "Wieder aufmachen",
    vonCloudMarke: "von deinen Agenten",
    cloudVerbindenKnopf: "☁️ Mit deiner Cloud verbinden",
    cloudVerbunden: (email) => `☁️ Verbunden als ${email} — Agenten können mitschreiben`,
    cloudGetrennt: "Dein Zettel gilt hier auf diesem Computer.",
    cloudOffline: "Gerade keine Verbindung — dein Zettel bleibt hier sicher gespeichert.",
    cloudAbmelden: "Verbindung trennen",
    anmeldenTitel: "Mit deiner Cloud verbinden",
    anmeldenErklaerung:
      "Melde dich mit deinem SMarTrAgents-Konto an. Dann landet dein Zettel auch in deinen Notizen, und deine Agenten können Aufgaben für dich eintragen.",
    emailFeld: "E-Mail-Adresse",
    passwortFeld: "Passwort",
    totpFeld: "Code aus deiner Authenticator-App",
    anmeldenKnopf: "Anmelden",
    loginFehler: (code) => {
      switch (code) {
        case "zugangsdaten":
          return "Das hat noch nicht gepasst — prüfe E-Mail und Passwort.";
        case "code_falsch":
          return "Der Code hat nicht gepasst — probier den nächsten aus der App.";
        case "email_bestaetigen":
          return "Bitte bestätige zuerst deine E-Mail-Adresse (schau in dein Postfach).";
        case "mfa_einrichten":
          return "Bitte richte einmal in der Cloud deinen zweiten Faktor ein — danach klappt es auch hier.";
        case "passkey":
          return "Dein Konto nutzt einen Passkey. Melde dich einmal in der Cloud an und richte dort zusätzlich eine Authenticator-App ein.";
        case "warten":
          return "Kurz durchatmen — zu viele Versuche. Probier es gleich noch einmal.";
        case "offline":
          return "Gerade keine Verbindung — schau kurz nach deinem Internet und probier es dann noch einmal.";
        default:
          return "Das hat gerade nicht geklappt. Probier es gleich noch einmal.";
      }
    },
    sprachWechsel: "🌐 English",
    zeigenText:
      "Schau — da oben! Da wohnen deine Einstellungen. Auch der Ton: lauter und leiser. Soll ich sie dir öffnen?",
    auftragTon: "AUFTRAG: Öffne die Ton-Einstellungen",
    spaeter: "Später",
    hasenAria: "Niemand, der weiße Hase — anklicken zum Reden",
    hasenTitel: "Niemand, der weiße Hase",
    ariaKennenlernen: "Kennenlernen",
    kennenlernenTitel: "Erst mal kennenlernen",
    kursSchliessen: "Kurs schließen",
    kennenlernenText:
      "Ein paar kurze Fragen — es gibt keine falschen Antworten. So weiß ich, wo wir anfangen.",
    ja: "Ja",
    neinNochNicht: "Nein, noch nicht",
    nochEineFrage: "Noch eine Frage",
    ariaLektionen: "Deine Lektionen",
    deinKurs: "Dein Kurs",
    lektionenGeschafft: (fertig, alle) => `${fertig} von ${alle} Lektionen geschafft`,
    allesGeschafft:
      "Alles geschafft — dein ganzer Kurs! Jede Lektion kannst du jederzeit noch einmal machen.",
    weiter: "Weiter",
    akt: "Akt",
    zurueckZurListe: "Zurück zur Lektionsliste",
    kennIchSchon: "Kenn ich schon",
    zurLektionsliste: "Zur Lektionsliste",
    spaeterWeitermachen: "Später weitermachen",
    schaueNach: "Ich schaue kurz nach …",
    quizAusweich: "Lass es uns anders probieren.",
  },
  en: {
    name: "Nobody",
    ariaSpricht: "Nobody is talking",
    ariaZeigt: "Nobody is pointing at something",
    blaseSchliessen: "Close the speech bubble",
    gruss: "Hi! I'm Nobody — yes, really, that's my name. What shall we do?",
    kursStarten: "🥕 Start the computer course",
    kursFortsetzen: "🥕 Continue the course",
    meineLektionen: "🥕 My lessons",
    kunststuecke: "Tricks:",
    hoppelnHint: "Hop around",
    nachdenkenHint: "Think",
    rechnenHint: "Calculate — opens the calculator",
    freuenHint: "Celebrate",
    einstellungenZeigen: "My settings",
    schlafen: "Sleep",
    beenden: "Quit",
    aufgabenKnopf: "📝 My to-do list",
    aufgabenKnopfMit: (offen) => `📝 My to-do list (${offen})`,
    aufgabenTitel: "Your to-do list",
    zettelSchliessen: "Close the list",
    ariaAufgaben: "Your to-do list",
    aufgabenLeer: "Your list is still empty. Write something below — or let your agents plan for you.",
    aufgabenZaehler: (offen, erledigt) => `${offen} open · ${erledigt} done`,
    aufgabenEingabe: "What needs doing?",
    aufschreiben: "Write it down",
    abhakenHint: "Mark as done",
    loeschenScharfHint: "Done — tap once more to delete",
    endgueltigLoeschenHint: "Delete — tap now and it is gone",
    wiederAufmachenHint: "Open it again",
    vonCloudMarke: "from your agents",
    cloudVerbindenKnopf: "☁️ Connect to your cloud",
    cloudVerbunden: (email) => `☁️ Connected as ${email} — your agents can write here too`,
    cloudGetrennt: "Your list lives here on this computer.",
    cloudOffline: "No connection right now — your list stays safe right here.",
    cloudAbmelden: "Disconnect",
    anmeldenTitel: "Connect to your cloud",
    anmeldenErklaerung:
      "Sign in with your SMarTrAgents account. Your list then also appears in your notes, and your agents can add tasks for you.",
    emailFeld: "Email address",
    passwortFeld: "Password",
    totpFeld: "Code from your authenticator app",
    anmeldenKnopf: "Sign in",
    loginFehler: (code) => {
      switch (code) {
        case "zugangsdaten":
          return "That didn't match yet — check your email and password.";
        case "code_falsch":
          return "That code didn't match — try the next one from your app.";
        case "email_bestaetigen":
          return "Please confirm your email address first (check your inbox).";
        case "mfa_einrichten":
          return "Please set up your second factor once in the cloud — then it works here too.";
        case "passkey":
          return "Your account uses a passkey. Sign in to the cloud once and add an authenticator app there.";
        case "warten":
          return "Take a breath — too many tries. Give it another go in a moment.";
        case "offline":
          return "No connection right now — check your internet, then give it another go.";
        default:
          return "That didn't work just now. Please try again in a moment.";
      }
    },
    sprachWechsel: "🌐 Deutsch",
    zeigenText:
      "Look — up there! That is where your settings live. The sound too: louder and quieter. Shall I open them for you?",
    auftragTon: "TASK: Open the sound settings",
    spaeter: "Later",
    hasenAria: "Nobody, the white rabbit — click to talk",
    hasenTitel: "Nobody, the white rabbit",
    ariaKennenlernen: "Getting to know you",
    kennenlernenTitel: "Getting to know you first",
    kursSchliessen: "Close the course",
    kennenlernenText:
      "A few short questions — every answer is fine. This tells me where we start.",
    ja: "Yes",
    neinNochNicht: "No, not yet",
    nochEineFrage: "One more question",
    ariaLektionen: "Your lessons",
    deinKurs: "Your course",
    lektionenGeschafft: (fertig, alle) => `${fertig} of ${alle} lessons done`,
    allesGeschafft: "All done — your whole course! You can do every lesson again any time.",
    weiter: "Next",
    akt: "Act",
    zurueckZurListe: "Back to the lesson list",
    kennIchSchon: "I know this already",
    zurLektionsliste: "To the lesson list",
    spaeterWeitermachen: "Continue later",
    schaueNach: "Let me take a quick look …",
    quizAusweich: "Let's try it another way.",
  },
};

/* ===================================================================
 * Vollständigkeit — und was die Auswahl davon zu sehen bekommt
 * ===================================================================
 *
 * Der Entscheid (29.07.2026): Eine Sprache erscheint in der Auswahl erst,
 * wenn sie GANZ da ist. Halbe Übersetzungen werden trotzdem angenommen und
 * gemergt — sie sammeln sich, bis eine Sprache trägt. So ist jeder Beitrag
 * klein genug, um an einem Abend zu entstehen, und niemand sieht ein
 * Programm, das mitten im Satz die Sprache wechselt.
 */

/** Die Schlüssel, die eine vollständige Oberfläche braucht. */
export const UI_SCHLUESSEL = Object.keys(UI_ROH.de) as (keyof UiTexte)[];

/** Was einer Sprache an Oberflächentexten noch fehlt. */
export function fehlendeUiSchluessel(s: Sprache): (keyof UiTexte)[] {
  if (s === QUELLSPRACHE) return [];
  const vorhanden = UI_ROH[s] ?? {};
  return UI_SCHLUESSEL.filter((k) => vorhanden[k] === undefined);
}

/**
 * Die benutzbaren Oberflächentexte: Fehlendes fällt auf die Quellsprache
 * zurück. Der Rückfall ist eine Sicherung, kein Betriebszustand — eine
 * unvollständige Sprache steht ja gar nicht zur Wahl. Er verhindert nur, dass
 * ein vergessener Schlüssel das Programm zerlegt.
 */
export const UI: Record<Sprache, UiTexte> = Object.fromEntries(
  SPRACHEN.map((s) => [s, { ...UI_ROH.de, ...(UI_ROH[s] ?? {}) }])
) as Record<Sprache, UiTexte>;

/* Die Kurstexte prüft kurs.ts selbst — hier wird die Prüfung nur eingehängt,
   damit `verfuegbareSprachen()` beides zusammen beantworten kann und niemand
   zwei Stellen im Blick behalten muss. */
type KursPruefer = (s: Sprache) => number;
let fehlendeKurstexte: KursPruefer = () => 0;

/** kurs.ts meldet sich hier an. Wird beim Laden des Moduls aufgerufen. */
export function setzeKursPruefer(fn: KursPruefer): void {
  fehlendeKurstexte = fn;
}

export interface Sprachstand {
  sprache: Sprache;
  name: string;
  fehlendUi: number;
  fehlendKurs: number;
  gesamtUi: number;
  vollstaendig: boolean;
  /** 0–100, gerundet. Nur zum Anzeigen. */
  prozent: number;
}

export function sprachstand(s: Sprache): Sprachstand {
  const fehlendUi = fehlendeUiSchluessel(s).length;
  const fehlendKurs = s === QUELLSPRACHE ? 0 : fehlendeKurstexte(s);
  const gesamtUi = UI_SCHLUESSEL.length;
  const fehlt = fehlendUi + fehlendKurs;
  /* Der Nenner ist nur für die Anzeige da: Oberfläche plus das, was der
     Kursprüfer als Gesamtzahl kennt. Er wird nie null, weil UI_SCHLUESSEL
     immer gefüllt ist. */
  const gesamt = gesamtUi + fehlendKurs + (s === QUELLSPRACHE ? 0 : 0);
  return {
    sprache: s,
    name: SPRACHNAMEN[s] ?? s,
    fehlendUi,
    fehlendKurs,
    gesamtUi,
    vollstaendig: fehlt === 0,
    prozent: fehlt === 0 ? 100 : Math.max(0, Math.round(((gesamt - fehlt) / gesamt) * 100)),
  };
}

/**
 * Die Sprachen, die der Mensch wirklich wählen kann.
 *
 * Die Quellsprache ist immer dabei — sie kann per Typ nicht unvollständig
 * sein. Alles andere muss sich seinen Platz verdienen.
 */
export function verfuegbareSprachen(): Sprache[] {
  return SPRACHEN.filter((s) => s === QUELLSPRACHE || sprachstand(s).vollstaendig);
}
