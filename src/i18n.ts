/**
 * Zweisprachigkeit (DE/EN) ab 0.5.0 — Niemand spricht Deutsch und einfaches
 * Englisch. Hier wohnen ALLE festen Oberflächentexte aus App.tsx und
 * Course.tsx; die Kurstexte selbst liegen zweisprachig in course.ts (LText).
 *
 * Sprachwahl: gespeicherte Wahl (localStorage) vor Systemsprache.
 * Ton auf Englisch wie auf Deutsch: kurze Sätze, ein Gedanke pro Satz, warm,
 * nie „wrong/error“ — stattdessen „Almost!“ / „No worries“.
 * Feste Produktkonvention: „AUFTRAG: …“ heißt auf Englisch „TASK: …“.
 */

export type Sprache = "de" | "en";

const SPRACHE_KEY = "niemand.sprache";

export function ladeSprache(): Sprache {
  try {
    const raw = localStorage.getItem(SPRACHE_KEY);
    if (raw === "de" || raw === "en") return raw;
  } catch {
    /* kein Speicher verfügbar → Systemsprache entscheidet */
  }
  return navigator.language.startsWith("de") ? "de" : "en";
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

export const UI: Record<Sprache, UiTexte> = {
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
    einstellungenZeigen: "Zeig mir meine Einstellungen",
    schlafen: "Leg dich schlafen",
    beenden: "Beenden",
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
    einstellungenZeigen: "Show me my settings",
    schlafen: "Go to sleep",
    beenden: "Quit",
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
