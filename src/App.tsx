import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  getCurrentWindow,
  primaryMonitor,
  PhysicalPosition,
  PhysicalSize,
} from "@tauri-apps/api/window";
import NobodyRabbitSvg from "./NobodyRabbit";
import Course, { PetSignal } from "./Course";
import Todo, { TodoSignal } from "./Todo";
import { KURS, ladeStand } from "./kurs";
import { TODO_EVENT, ladeAufgaben, syncEinmal } from "./aufgaben";
import {
  Sprache,
  UI,
  ladeSprache,
  speichereSprache,
  verfuegbareSprachen,
  QUELLSPRACHE,
} from "./i18n";
import "./pet.css";

/** Zustände des Tierchens (Superset des Cloud-Widgets, Plan § 3). */
type PetState =
  | "idle"
  | "talking"
  | "thinking"
  | "calc"
  | "waving"
  | "walking"
  | "pointing"
  | "sleeping"
  | "celebrating"
  | "carried"
  | "heart"
  | "attention";

type BubbleView = "closed" | "menu" | "zeigen";

const SLEEP_AFTER_MS = 5 * 60 * 1000; // Einschlafen nach 5 min ohne Interaktion (Anti-Clippy, Plan § 1)
const HOP_PX = 56; // logische Pixel pro Hüpfer
const DEMO_MS = 4200; // Dauer der Nachdenk-/Rechen-Vorführung
const FENSTER = { normalB: 320, normalH: 520, kursB: 400, kursH: 640 };

const CONFETTI = Array.from({ length: 10 }, (_, i) => ({
  cx: `${(i - 5) * 26 + 8}px`,
  color: i % 3 === 0 ? "#00d4ff" : i % 3 === 1 ? "#7B61FF" : "#f7f7ff",
  delay: `${(i % 5) * 60}ms`,
}));

export default function App() {
  const [state, setState] = useState<PetState>("idle");
  const [flip, setFlip] = useState(false);
  const [bubble, setBubble] = useState<BubbleView>("closed");
  const [kurs, setKurs] = useState(false);
  const [todo, setTodo] = useState(false);
  /* Zettel-Änderungen (auch aus dem Hintergrund-Sync) → Menü-Zähler frisch. */
  const [, setTodoTick] = useState(0);
  const [sprache, setSprache] = useState<Sprache>(() => ladeSprache());
  const ui = UI[sprache];
  /*
   * Umschalt-Knopf: reiht die verfügbaren Sprachen durch und bleibt damit
   * richtig, egal wie viele es einmal sind. Vorher stand hier fest
   * `de → en → de`; eine dritte Sprache wäre unerreichbar gewesen, obwohl sie
   * in der Liste steht.
   *
   * `verfuegbareSprachen()` gibt nur zurück, was VOLLSTÄNDIG übersetzt ist —
   * eine halbe Sprache erscheint hier also nie, auch wenn ihre Texte schon im
   * Quelltext liegen und wachsen.
   */
  const sprachWechsel = () => {
    const auswahl = verfuegbareSprachen();
    const jetzt = auswahl.indexOf(sprache);
    const neu: Sprache = auswahl[(jetzt + 1) % auswahl.length] ?? QUELLSPRACHE;
    setSprache(neu);
    speichereSprache(neu);
  };
  const stateRef = useRef(state);
  stateRef.current = state;
  const kursRef = useRef(kurs);
  kursRef.current = kurs;
  const todoRef = useRef(todo);
  todoRef.current = todo;
  const bubbleRef = useRef(bubble);
  bubbleRef.current = bubble;
  const walkAbort = useRef(false);
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* --- Einschlaf-Uhr: jede Interaktion setzt sie zurück. ------------------ */
  const armSleepTimer = useCallback(() => {
    if (sleepTimer.current) clearTimeout(sleepTimer.current);
    sleepTimer.current = setTimeout(() => {
      if (kursRef.current || todoRef.current) return; // bei offener Karte kein Einschlafen
      walkAbort.current = true;
      setBubble("closed");
      setState("sleeping");
    }, SLEEP_AFTER_MS);
  }, []);

  /* Aufwecken: aus dem Schlaf gibt es ein kurzes Herzchen (er freut sich). */
  const wake = useCallback(() => {
    armSleepTimer();
    if (stateRef.current === "sleeping") {
      setState("heart");
      if (demoTimer.current) clearTimeout(demoTimer.current);
      demoTimer.current = setTimeout(() => setState((s) => (s === "heart" ? "idle" : s)), 1500);
    }
  }, [armSleepTimer]);

  useEffect(() => {
    armSleepTimer();
    const onAny = () => {
      // Der Mensch gewinnt IMMER sofort gegen die Hoppel-Schleife —
      // jeder Klick/Tastendruck bricht den Lauf ab (Inhaber-Befund 28.07.:
      // „lässt sich nach Hoppeln nicht mehr verschieben“).
      walkAbort.current = true;
      wake();
    };
    window.addEventListener("pointerdown", onAny);
    window.addEventListener("keydown", onAny);
    return () => {
      window.removeEventListener("pointerdown", onAny);
      window.removeEventListener("keydown", onAny);
    };
  }, [armSleepTimer, wake]);

  /* --- Fenstergröße (Kurs braucht mehr Platz; Position bleibt auf dem Schirm). */
  const setzeFenster = useCallback(async (breite: number, hoehe: number) => {
    try {
      const win = getCurrentWindow();
      const mon = await primaryMonitor();
      const sf = mon?.scaleFactor ?? 1;
      const w = Math.round(breite * sf);
      const h = Math.round(hoehe * sf);
      await win.setSize(new PhysicalSize(w, h));
      if (mon) {
        // Klammerung mit der ANGEFORDERTEN Größe rechnen — outerSize() ist
        // direkt nach setSize() noch alt (WM bestätigt asynchron).
        const pos = await win.outerPosition();
        const maxX = mon.position.x + mon.size.width - w - 8;
        const maxY = mon.position.y + mon.size.height - h - 8;
        await win.setPosition(
          new PhysicalPosition(
            Math.min(Math.max(pos.x, mon.position.x + 8), maxX),
            Math.min(Math.max(pos.y, mon.position.y + 8), maxY),
          ),
        );
      }
    } catch (e) {
      console.error("Fenstergröße fehlgeschlagen", e);
    }
  }, []);

  /* --- Unten rechts parken (Start + Tray „In die Ecke setzen“). ----------- */
  const parkeUntenRechts = useCallback(async () => {
    try {
      walkAbort.current = true;
      const win = getCurrentWindow();
      const mon = await primaryMonitor();
      if (!mon) return;
      const size = await win.outerSize();
      await win.setPosition(
        new PhysicalPosition(
          mon.position.x + mon.size.width - size.width - 24,
          mon.position.y + mon.size.height - size.height - 72,
        ),
      );
    } catch (e) {
      console.error("Parken fehlgeschlagen", e);
    }
  }, []);

  useEffect(() => {
    parkeUntenRechts();
  }, [parkeUntenRechts]);

  /* --- Tray-Ereignisse (Rust-Seite). -------------------------------------- */
  useEffect(() => {
    const unlisten: Array<() => void> = [];
    let tot = false; // Cleanup vor Promise-Auflösung (StrictMode/HMR) abfangen
    const merke = (u: () => void) => (tot ? u() : unlisten.push(u));
    listen("niemand://rufen", () => {
      wake();
      setState("waving");
      setTimeout(
        () =>
          setState((s) =>
            s === "waving"
              ? kursRef.current || todoRef.current || bubbleRef.current === "menu"
                ? "talking"
                : "idle"
              : s,
          ),
        2600,
      );
    }).then(merke);
    listen("niemand://schlafen", () => {
      walkAbort.current = true;
      setBubble("closed");
      setKurs(false);
      setTodo(false);
      setzeFenster(FENSTER.normalB, FENSTER.normalH);
      setState("sleeping");
    }).then(merke);
    listen("niemand://ecke", () => {
      setState((s) => (s === "walking" ? "idle" : s));
      parkeUntenRechts();
    }).then(merke);
    return () => {
      tot = true;
      unlisten.forEach((u) => u());
    };
  }, [wake, setzeFenster, parkeUntenRechts]);

  /* --- Fenster sanft zu einer Zielposition bewegen (Hüpf-Etappen). -------- */
  const hopTo = useCallback(async (targetX: number, targetY: number, scale: number) => {
    const win = getCurrentWindow();
    const start = await win.outerPosition();
    const dirX = Math.sign(targetX - start.x) || 1;
    setFlip(dirX > 0);
    setState("walking");
    const hop = Math.max(8, Math.round(HOP_PX * scale));
    let x = start.x;
    let y = start.y;
    const totalHops = Math.max(1, Math.ceil(Math.abs(targetX - start.x) / hop));
    const yStep = (targetY - start.y) / totalHops;
    // Harte Zeitbremse: egal was passiert, nach 10 s ist der Lauf vorbei
    // (Inhaber-Befund: zäher IPC darf den Hasen nie „festnageln“).
    const ende = Date.now() + 10_000;
    while (
      (Math.abs(targetX - x) > 2 || Math.abs(targetY - y) > 2) &&
      !walkAbort.current &&
      Date.now() < ende
    ) {
      const fromX = x;
      const fromY = y;
      x += dirX * Math.min(hop, Math.abs(targetX - x));
      if (Math.abs(targetX - x) < 2) x = targetX;
      y = Math.abs(targetY - (y + yStep)) < Math.abs(yStep) ? targetY : y + yStep;
      const frames = 5;
      for (let i = 1; i <= frames; i++) {
        if (walkAbort.current) return;
        const t = i / frames;
        const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        await win.setPosition(
          new PhysicalPosition(Math.round(fromX + (x - fromX) * eased), Math.round(fromY + (y - fromY) * eased)),
        );
        await new Promise((r) => setTimeout(r, 16));
      }
      await new Promise((r) => setTimeout(r, 70));
    }
  }, []);

  /* --- Hoppeln: freie Runde am unteren Rand. ------------------------------ */
  const hopAcross = useCallback(async () => {
    if (stateRef.current === "walking") {
      walkAbort.current = true;
      return;
    }
    setBubble("closed");
    walkAbort.current = false;
    try {
      // Kam der Klick aus dem (großen) Menü: erst Fenster wieder klein.
      // Danach NICHT messen, sondern mit den angeforderten Maßen rechnen —
      // outerSize() liefert direkt nach setSize() noch die alte Größe
      // (WM bestätigt asynchron), der Hase schwebte sonst über dem Boden.
      await setzeFenster(FENSTER.normalB, FENSTER.normalH);
      const win = getCurrentWindow();
      const mon = await primaryMonitor();
      if (!mon) return;
      const sf = mon.scaleFactor;
      const breite = Math.round(FENSTER.normalB * sf);
      const hoehe = Math.round(FENSTER.normalH * sf);
      const pos = await win.outerPosition();
      const minX = mon.position.x + 8;
      const maxX = mon.position.x + mon.size.width - breite - 8;
      let target = Math.round(minX + Math.random() * (maxX - minX));
      if (Math.abs(target - pos.x) < mon.size.width / 4) {
        target = pos.x < (minX + maxX) / 2 ? maxX : minX;
      }
      const groundY = mon.position.y + mon.size.height - hoehe - 72;
      await hopTo(target, groundY, sf);
    } catch (e) {
      console.error("Hoppeln fehlgeschlagen", e);
    } finally {
      setState("idle");
      setFlip(false);
      armSleepTimer();
    }
  }, [armSleepTimer, hopTo, setzeFenster]);

  /* --- Zeigen: in die obere rechte Ecke hoppeln und hinzeigen. ------------ */
  const showSettings = useCallback(async () => {
    walkAbort.current = false;
    try {
      // Zeigen braucht nur die kleine Sprechblase → Fenster zurück auf normal.
      // Ziel mit den ANGEFORDERTEN Maßen rechnen (outerSize wäre noch alt).
      await setzeFenster(FENSTER.normalB, FENSTER.normalH);
      const mon = await primaryMonitor();
      if (!mon) return;
      const breite = Math.round(FENSTER.normalB * mon.scaleFactor);
      const targetX = mon.position.x + mon.size.width - breite - 16;
      const targetY = mon.position.y + Math.round(24 * mon.scaleFactor);
      setBubble("closed");
      await hopTo(targetX, targetY, mon.scaleFactor);
      if (walkAbort.current) {
        // Mensch hat den Lauf abgebrochen (Klick/Escape) — dann nicht
        // ungefragt wieder eine Blase aufmachen.
        setState("idle");
        return;
      }
      setFlip(true); // Arm zeigt nach oben rechts (SVG gespiegelt)
      setState("pointing");
      setBubble("zeigen");
    } catch (e) {
      console.error("Zeigen fehlgeschlagen", e);
      setState("idle");
    }
  }, [hopTo, setzeFenster]);

  /* --- Kurze Vorführungen: Nachdenken / Rechnen / Feiern. ----------------- */
  const playDemo = useCallback(
    (demo: Extract<PetState, "thinking" | "calc" | "celebrating">) => {
      setBubble("closed");
      // Vorführung läuft ohne Menü — großes Fenster wieder abgeben.
      if (!kursRef.current && !todoRef.current) {
        setzeFenster(FENSTER.normalB, FENSTER.normalH);
      }
      setState(demo);
      if (demoTimer.current) clearTimeout(demoTimer.current);
      demoTimer.current = setTimeout(
        () => setState((s) => (s === demo ? "idle" : s)),
        demo === "celebrating" ? 1900 : DEMO_MS,
      );
    },
    [setzeFenster],
  );

  /* --- Kurs öffnen/schließen (Fenster wächst mit — Textfeld-Regel!). ------ */
  const kursOeffnen = useCallback(async () => {
    setBubble("closed");
    setState("talking");
    setKurs(true);
    await setzeFenster(FENSTER.kursB, FENSTER.kursH);
  }, [setzeFenster]);

  const kursSchliessen = useCallback(async () => {
    setKurs(false);
    setState("idle");
    await setzeFenster(FENSTER.normalB, FENSTER.normalH);
  }, [setzeFenster]);

  /* --- Aufgabenzettel öffnen/schließen (gleiches Fenster-Spiel wie Kurs). -- */
  const todoOeffnen = useCallback(async () => {
    setBubble("closed");
    setState("talking");
    setTodo(true);
    await setzeFenster(FENSTER.kursB, FENSTER.kursH);
  }, [setzeFenster]);

  const todoSchliessen = useCallback(async () => {
    setTodo(false);
    setState("idle");
    await setzeFenster(FENSTER.normalB, FENSTER.normalH);
  }, [setzeFenster]);

  /* Gefühls-Signale vom Zettel: Abhaken freut, alles geschafft wird gefeiert. */
  const onTodoSignal = useCallback((s: TodoSignal) => {
    if (!todoRef.current) return;
    if (demoTimer.current) clearTimeout(demoTimer.current);
    if (s === "freude") {
      setState("heart");
      demoTimer.current = setTimeout(() => setState((x) => (x === "heart" ? "talking" : x)), 1600);
    } else if (s === "feiern") {
      setState("celebrating");
      demoTimer.current = setTimeout(() => setState((x) => (x === "celebrating" ? "talking" : x)), 2200);
    } else {
      setState("talking");
    }
  }, []);

  /* --- Leiser Hintergrund-Puls: haben die Agenten neue Aufgaben notiert? ---
     Alle 5 Minuten (nur mit Cloud-Sitzung). Neue Cloud-Einträge → Niemand
     pulst kurz mit dem Aufmerksamkeits-Ring, weckt aber niemanden auf. */
  useEffect(() => {
    let tot = false;
    const puls = async () => {
      if (tot || todoRef.current) return;
      try {
        const s = await invoke<{ angemeldet: boolean }>("cloud_status");
        if (tot || !s.angemeldet) return;
        const e = await syncEinmal();
        if (
          !tot &&
          e.status === "ok" &&
          e.neuVonCloud > 0 &&
          !kursRef.current &&
          !todoRef.current &&
          stateRef.current !== "sleeping"
        ) {
          if (demoTimer.current) clearTimeout(demoTimer.current);
          setState("attention");
          demoTimer.current = setTimeout(
            () => setState((x) => (x === "attention" ? "idle" : x)),
            6000,
          );
        }
      } catch {
        /* Cloud gerade nicht erreichbar — nächster Puls versucht es wieder */
      }
    };
    const anlauf = setTimeout(puls, 15_000);
    const takt = setInterval(puls, 5 * 60_000);
    const tick = () => setTodoTick((t) => t + 1);
    window.addEventListener(TODO_EVENT, tick);
    return () => {
      tot = true;
      clearTimeout(anlauf);
      clearInterval(takt);
      window.removeEventListener(TODO_EVENT, tick);
    };
  }, []);

  /* Gefühls-Signale aus dem Kurs → Tierchen-Zustände. */
  const onKursSignal = useCallback((s: PetSignal) => {
    if (!kursRef.current) return; // Nachzügler-Signal nach Kurs-Schließen verwerfen
    if (demoTimer.current) clearTimeout(demoTimer.current);
    if (s === "denken") setState("thinking");
    else if (s === "zeigen") {
      setState("waving");
      demoTimer.current = setTimeout(() => setState((x) => (x === "waving" ? "talking" : x)), 2200);
    } else if (s === "freude") {
      setState("heart");
      demoTimer.current = setTimeout(() => setState((x) => (x === "heart" ? "talking" : x)), 1600);
    } else if (s === "feiern") {
      setState("celebrating"); // Akt-Finale: hier darf Konfetti (Plan § 1)
      demoTimer.current = setTimeout(() => setState((x) => (x === "celebrating" ? "talking" : x)), 2200);
    } else setState("talking");
  }, []);

  /* --- Getragen werden: große Augen + Baumeln, solange gezogen wird. ------ */
  const onCarryStart = useCallback(() => {
    if (stateRef.current === "walking") walkAbort.current = true;
    if (kursRef.current) return;
    setState("carried");
    if (demoTimer.current) clearTimeout(demoTimer.current);
    demoTimer.current = setTimeout(() => setState((s) => (s === "carried" ? "idle" : s)), 2600);
  }, []);

  /* --- Klick auf den Hasen: Sprechblase auf/zu (Pull statt Push). --------- */
  const onRabbitClick = useCallback(() => {
    wake();
    if (kursRef.current || todoRef.current) {
      setState("waving");
      setTimeout(() => setState((s) => (s === "waving" ? "talking" : s)), 1800);
      return;
    }
    if (stateRef.current === "walking") {
      walkAbort.current = true;
      return;
    }
    if (stateRef.current === "sleeping" || stateRef.current === "heart") return;
    const next = bubbleRef.current === "closed" ? "menu" : "closed";
    setBubble(next);
    setState(next === "menu" ? "talking" : "idle");
    if (next === "menu") setFlip(false);
    // Menü bekommt das große Fenster (Platz für alle Knöpfe — Inhaber-Befund
    // 29.07.: Kunststück-Knöpfe waren abgeschnitten); zu → wieder klein.
    setzeFenster(
      next === "menu" ? FENSTER.kursB : FENSTER.normalB,
      next === "menu" ? FENSTER.kursH : FENSTER.normalH,
    );
  }, [wake, setzeFenster]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (kursRef.current) return; // im Kurs schließt die Kurskarte selbst
        if (todoRef.current) {
          todoSchliessen();
          return;
        }
        setBubble("closed");
        setState((s) => (s === "talking" || s === "pointing" ? "idle" : s));
        setzeFenster(FENSTER.normalB, FENSTER.normalH);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [todoSchliessen, setzeFenster]);

  const closeBubble = () => {
    setBubble("closed");
    setState((s) => (s === "talking" || s === "pointing" ? "idle" : s));
    setFlip(false);
    if (!kursRef.current && !todoRef.current) {
      setzeFenster(FENSTER.normalB, FENSTER.normalH);
    }
  };

  /* AUFTRAG-Karte: Einstellungen öffnen — läuft NUR auf Nutzer-Klick. */
  const openSound = async () => {
    try {
      await invoke("open_settings", { panel: "sound" });
      playDemo("celebrating");
    } catch (e) {
      console.error("open_settings fehlgeschlagen", e);
    }
  };

  const stand = ladeStand();
  const kursFortschritt = KURS.filter((s) => stand.erledigt[s.id]).length;
  const kursKnopf =
    stand.level === null
      ? ui.kursStarten
      : kursFortschritt >= KURS.length
        ? ui.meineLektionen
        : ui.kursFortsetzen;

  /* 🔢: süßer Gag MIT Nutzen — Rechen-Pose plus echter OS-Taschenrechner. */
  const rechnenKlick = () => {
    playDemo("calc");
    invoke("open_tool", { tool: "calculator" }).catch((e) =>
      console.error("open_tool fehlgeschlagen", e),
    );
  };

  // Menü, Kurs und Aufgabenzettel lassen den Hasen klein zur Seite hoppeln —
  // beim „Zeigen“ (Ecke, Arm hoch) bleibt er groß, die kleine Blase reicht dort.
  const menueOffen = !kurs && !todo && bubble === "menu";
  const offeneAufgaben = menueOffen
    ? ladeAufgaben().items.filter((i) => !i.done).length
    : 0;

  return (
    <div
      className={`stage nobody-wrap--${state}${kurs || todo ? " stage--kurs" : ""}${
        menueOffen ? " stage--menu" : ""
      }`}
    >
      {kurs && <Course sprache={sprache} onSignal={onKursSignal} onClose={kursSchliessen} />}
      {!kurs && todo && <Todo sprache={sprache} onSignal={onTodoSignal} onClose={todoSchliessen} />}

      {menueOffen && (
        <div className="bubble bubble--panel" role="dialog" aria-label={ui.ariaSpricht}>
          <div className="bubble-title">
            <span>{ui.name}</span>
            <button className="bubble-close" onClick={closeBubble} aria-label={ui.blaseSchliessen}>
              ✕
            </button>
          </div>
          {/* Alles unterhalb des Titels scrollt zur Not GEMEINSAM — kein Knopf
              wird je gestaucht oder abgeschnitten (Inhaber-Befund 29.07.). */}
          <div className="menu-scroll">
            <p className="bubble-text bubble-text--gruss">{ui.gruss}</p>
            <div className="bubble-actions">
              <button className="bubble-btn bubble-btn--primary" onClick={kursOeffnen}>
                {kursKnopf}
              </button>
              <button className="bubble-btn bubble-btn--primary" onClick={todoOeffnen}>
                {offeneAufgaben > 0 ? ui.aufgabenKnopfMit(offeneAufgaben) : ui.aufgabenKnopf}
              </button>
              <button className="bubble-btn" onClick={showSettings}>
                {ui.einstellungenZeigen}
              </button>
            </div>
            <div className="gag-block">
              <span className="gag-label">{ui.kunststuecke}</span>
              <div className="gag-grid">
                <button className="gag-btn" onClick={hopAcross} aria-label={ui.hoppelnHint} title={ui.hoppelnHint}>
                  🐇
                </button>
                <button
                  className="gag-btn"
                  onClick={() => playDemo("thinking")}
                  aria-label={ui.nachdenkenHint}
                  title={ui.nachdenkenHint}
                >
                  💭
                </button>
                <button className="gag-btn" onClick={rechnenKlick} aria-label={ui.rechnenHint} title={ui.rechnenHint}>
                  🔢
                </button>
                <button
                  className="gag-btn"
                  onClick={() => playDemo("celebrating")}
                  aria-label={ui.freuenHint}
                  title={ui.freuenHint}
                >
                  🎉
                </button>
              </div>
            </div>
            <div className="bubble-grid">
              <button
                className="bubble-btn"
                onClick={() => {
                  setBubble("closed");
                  setzeFenster(FENSTER.normalB, FENSTER.normalH);
                  setState("sleeping");
                }}
              >
                {ui.schlafen}
              </button>
              <button className="bubble-btn" onClick={sprachWechsel}>
                {ui.sprachWechsel}
              </button>
            </div>
            <div className="bubble-actions">
              <button className="bubble-btn" onClick={() => invoke("quit_app")}>
                {ui.beenden}
              </button>
            </div>
          </div>
        </div>
      )}

      {!kurs && bubble === "zeigen" && (
        <div className="bubble" role="dialog" aria-label={ui.ariaZeigt}>
          <div className="bubble-title">
            <span>{ui.name}</span>
            <button className="bubble-close" onClick={closeBubble} aria-label={ui.blaseSchliessen}>
              ✕
            </button>
          </div>
          <p className="bubble-text">{ui.zeigenText}</p>
          <div className="bubble-actions">
            <button className="bubble-btn bubble-btn--primary" onClick={openSound}>
              {ui.auftragTon}
            </button>
            <button className="bubble-btn" onClick={closeBubble}>
              {ui.spaeter}
            </button>
          </div>
        </div>
      )}

      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className={`confetti${i === 4 ? " confetti--star" : ""}`}
          style={{
            background: c.color,
            left: `calc(50% + ${c.cx})`,
            animationDelay: c.delay,
            ["--cx" as string]: c.cx,
          }}
        />
      ))}

      <button
        className={`nobody nobody--${state}${flip ? " nobody--flip" : ""}${
          state === "pointing" ? " nobody--point-up" : ""
        }`}
        onClick={onRabbitClick}
        aria-label={ui.hasenAria}
        title={ui.name}
      >
        <span className="nobody-ring" aria-hidden="true" />
        <span className="nobody-arrow nobody-arrow--up" aria-hidden="true">
          ➤
        </span>
        <NobodyRabbitSvg className="nobody-svg" title={ui.hasenTitel} />
        {/* Ohren = Zieh-Griff zum Umsetzen (WCAG 2.5.7: geht auch ohne Ziehen übers Hoppeln) */}
        <span
          className="nobody-drag"
          data-tauri-drag-region
          aria-hidden="true"
          onPointerDown={onCarryStart}
        />
      </button>
    </div>
  );
}
