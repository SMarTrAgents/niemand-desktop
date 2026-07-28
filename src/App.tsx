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
import { KURS, ladeStand } from "./course";
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
  const stateRef = useRef(state);
  stateRef.current = state;
  const kursRef = useRef(kurs);
  kursRef.current = kurs;
  const walkAbort = useRef(false);
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* --- Einschlaf-Uhr: jede Interaktion setzt sie zurück. ------------------ */
  const armSleepTimer = useCallback(() => {
    if (sleepTimer.current) clearTimeout(sleepTimer.current);
    sleepTimer.current = setTimeout(() => {
      if (kursRef.current) return; // im Kurs schläft Niemand nicht ein
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
    const onAny = () => wake();
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

  /* --- Startposition: unten rechts auf dem Hauptmonitor. ------------------ */
  useEffect(() => {
    (async () => {
      try {
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
        console.error("Startposition fehlgeschlagen", e);
      }
    })();
  }, []);

  /* --- Tray-Ereignisse (Rust-Seite). -------------------------------------- */
  useEffect(() => {
    const unlisten: Array<() => void> = [];
    let tot = false; // Cleanup vor Promise-Auflösung (StrictMode/HMR) abfangen
    const merke = (u: () => void) => (tot ? u() : unlisten.push(u));
    listen("niemand://rufen", () => {
      wake();
      setState("waving");
      setTimeout(() => setState((s) => (s === "waving" ? "idle" : s)), 2600);
    }).then(merke);
    listen("niemand://schlafen", () => {
      walkAbort.current = true;
      setBubble("closed");
      setKurs(false);
      setzeFenster(FENSTER.normalB, FENSTER.normalH);
      setState("sleeping");
    }).then(merke);
    return () => {
      tot = true;
      unlisten.forEach((u) => u());
    };
  }, [wake, setzeFenster]);

  /* --- Fenster sanft zu einer Zielposition bewegen (Hüpf-Etappen). -------- */
  const hopTo = useCallback(async (targetX: number, targetY: number, scale: number) => {
    const win = getCurrentWindow();
    const start = await win.outerPosition();
    const dirX = Math.sign(targetX - start.x) || 1;
    setFlip(dirX > 0);
    setState("walking");
    const hop = Math.round(HOP_PX * scale);
    let x = start.x;
    let y = start.y;
    const totalHops = Math.max(1, Math.ceil(Math.abs(targetX - start.x) / hop));
    const yStep = (targetY - start.y) / totalHops;
    while ((Math.abs(targetX - x) > 2 || Math.abs(targetY - y) > 2) && !walkAbort.current) {
      const fromX = x;
      const fromY = y;
      x += dirX * Math.min(hop, Math.abs(targetX - x));
      if (Math.abs(targetX - x) < 2) x = targetX;
      y = Math.abs(targetY - (y + yStep)) < Math.abs(yStep) ? targetY : y + yStep;
      const frames = 8;
      for (let i = 1; i <= frames; i++) {
        const t = i / frames;
        const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        await win.setPosition(
          new PhysicalPosition(Math.round(fromX + (x - fromX) * eased), Math.round(fromY + (y - fromY) * eased)),
        );
        await new Promise((r) => setTimeout(r, 22));
      }
      await new Promise((r) => setTimeout(r, 110));
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
      const win = getCurrentWindow();
      const mon = await primaryMonitor();
      if (!mon) return;
      const size = await win.outerSize();
      const pos = await win.outerPosition();
      const minX = mon.position.x + 8;
      const maxX = mon.position.x + mon.size.width - size.width - 8;
      let target = Math.round(minX + Math.random() * (maxX - minX));
      if (Math.abs(target - pos.x) < mon.size.width / 4) {
        target = pos.x < (minX + maxX) / 2 ? maxX : minX;
      }
      const groundY = mon.position.y + mon.size.height - size.height - 72;
      await hopTo(target, groundY, mon.scaleFactor);
    } catch (e) {
      console.error("Hoppeln fehlgeschlagen", e);
    } finally {
      setState("idle");
      setFlip(false);
      armSleepTimer();
    }
  }, [armSleepTimer, hopTo]);

  /* --- Zeigen: in die obere rechte Ecke hoppeln und hinzeigen. ------------ */
  const showSettings = useCallback(async () => {
    walkAbort.current = false;
    try {
      const win = getCurrentWindow();
      const mon = await primaryMonitor();
      if (!mon) return;
      const size = await win.outerSize();
      const targetX = mon.position.x + mon.size.width - size.width - 16;
      const targetY = mon.position.y + Math.round(24 * mon.scaleFactor);
      setBubble("closed");
      await hopTo(targetX, targetY, mon.scaleFactor);
      setFlip(true); // Arm zeigt nach oben rechts (SVG gespiegelt)
      setState("pointing");
      setBubble("zeigen");
    } catch (e) {
      console.error("Zeigen fehlgeschlagen", e);
      setState("idle");
    }
  }, [hopTo]);

  /* --- Kurze Vorführungen: Nachdenken / Rechnen / Feiern. ----------------- */
  const playDemo = useCallback(
    (demo: Extract<PetState, "thinking" | "calc" | "celebrating">) => {
      setBubble("closed");
      setState(demo);
      if (demoTimer.current) clearTimeout(demoTimer.current);
      demoTimer.current = setTimeout(
        () => setState((s) => (s === demo ? "idle" : s)),
        demo === "celebrating" ? 1900 : DEMO_MS,
      );
    },
    [],
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
    if (kursRef.current) {
      setState("waving");
      setTimeout(() => setState((s) => (s === "waving" ? "talking" : s)), 1800);
      return;
    }
    if (stateRef.current === "walking") {
      walkAbort.current = true;
      return;
    }
    if (stateRef.current === "sleeping" || stateRef.current === "heart") return;
    setBubble((b) => {
      const next = b === "closed" ? "menu" : "closed";
      setState(next === "menu" ? "talking" : "idle");
      if (next === "menu") setFlip(false);
      return next;
    });
  }, [wake]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (kursRef.current) return; // im Kurs schließt die Kurskarte selbst
        setBubble("closed");
        setState((s) => (s === "talking" || s === "pointing" ? "idle" : s));
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  const closeBubble = () => {
    setBubble("closed");
    setState((s) => (s === "talking" || s === "pointing" ? "idle" : s));
    setFlip(false);
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
      ? "🥕 Computerkurs starten"
      : kursFortschritt >= KURS.length
        ? "🥕 Meine Lektionen"
        : "🥕 Kurs fortsetzen";

  return (
    <div className={`stage nobody-wrap--${state}${kurs ? " stage--kurs" : ""}`}>
      {kurs && <Course onSignal={onKursSignal} onClose={kursSchliessen} />}

      {!kurs && bubble === "menu" && (
        <div className="bubble" role="dialog" aria-label="Niemand spricht">
          <div className="bubble-title">
            <span>Niemand</span>
            <button className="bubble-close" onClick={closeBubble} aria-label="Sprechblase schließen">
              ✕
            </button>
          </div>
          <p className="bubble-text">Hallo! Ich bin Niemand. Was wollen wir machen?</p>
          <div className="bubble-actions">
            <button className="bubble-btn bubble-btn--primary" onClick={kursOeffnen}>
              {kursKnopf}
            </button>
          </div>
          <div className="bubble-grid" style={{ marginTop: 8 }}>
            <button className="bubble-btn" onClick={hopAcross}>
              🐇 Hoppeln
            </button>
            <button className="bubble-btn" onClick={() => playDemo("thinking")}>
              💭 Nachdenken
            </button>
            <button className="bubble-btn" onClick={() => playDemo("calc")}>
              🔢 Rechnen
            </button>
            <button className="bubble-btn" onClick={() => playDemo("celebrating")}>
              🎉 Freuen
            </button>
          </div>
          <div className="bubble-actions">
            <button className="bubble-btn" onClick={showSettings}>
              Zeig mir meine Einstellungen
            </button>
            <button
              className="bubble-btn"
              onClick={() => {
                setBubble("closed");
                setState("sleeping");
              }}
            >
              Leg dich schlafen
            </button>
            <button className="bubble-btn" onClick={() => invoke("quit_app")}>
              Beenden
            </button>
          </div>
        </div>
      )}

      {!kurs && bubble === "zeigen" && (
        <div className="bubble" role="dialog" aria-label="Niemand zeigt etwas">
          <div className="bubble-title">
            <span>Niemand</span>
            <button className="bubble-close" onClick={closeBubble} aria-label="Sprechblase schließen">
              ✕
            </button>
          </div>
          <p className="bubble-text">
            Schau — da oben! Da wohnen deine Einstellungen. Auch der Ton: lauter und leiser. Soll ich
            sie dir öffnen?
          </p>
          <div className="bubble-actions">
            <button className="bubble-btn bubble-btn--primary" onClick={openSound}>
              AUFTRAG: Öffne die Ton-Einstellungen
            </button>
            <button className="bubble-btn" onClick={closeBubble}>
              Später
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
        aria-label="Niemand, der weiße Hase — anklicken zum Reden"
        title="Niemand"
      >
        <span className="nobody-ring" aria-hidden="true" />
        <span className="nobody-arrow nobody-arrow--up" aria-hidden="true">
          ➤
        </span>
        <NobodyRabbitSvg className="nobody-svg" title="Niemand, der weiße Hase" />
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
