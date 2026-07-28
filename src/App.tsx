import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, primaryMonitor, PhysicalPosition } from "@tauri-apps/api/window";
import NobodyRabbitSvg from "./NobodyRabbit";
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

const CONFETTI = Array.from({ length: 10 }, (_, i) => ({
  cx: `${(i - 5) * 26 + 8}px`,
  color: i % 3 === 0 ? "#00d4ff" : i % 3 === 1 ? "#7B61FF" : "#f7f7ff",
  delay: `${(i % 5) * 60}ms`,
}));

export default function App() {
  const [state, setState] = useState<PetState>("idle");
  const [flip, setFlip] = useState(false);
  const [bubble, setBubble] = useState<BubbleView>("closed");
  const stateRef = useRef(state);
  stateRef.current = state;
  const walkAbort = useRef(false);
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* --- Einschlaf-Uhr: jede Interaktion setzt sie zurück. ------------------ */
  const armSleepTimer = useCallback(() => {
    if (sleepTimer.current) clearTimeout(sleepTimer.current);
    sleepTimer.current = setTimeout(() => {
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
    listen("niemand://rufen", () => {
      wake();
      setState("waving");
      setTimeout(() => setState((s) => (s === "waving" ? "idle" : s)), 2600);
    }).then((u) => unlisten.push(u));
    listen("niemand://schlafen", () => {
      walkAbort.current = true;
      setBubble("closed");
      setState("sleeping");
    }).then((u) => unlisten.push(u));
    return () => unlisten.forEach((u) => u());
  }, [wake]);

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

  /* --- Getragen werden: große Augen + Baumeln, solange gezogen wird. ------ */
  const onCarryStart = useCallback(() => {
    if (stateRef.current === "walking") walkAbort.current = true;
    setState("carried");
    if (demoTimer.current) clearTimeout(demoTimer.current);
    demoTimer.current = setTimeout(() => setState((s) => (s === "carried" ? "idle" : s)), 2600);
  }, []);

  /* --- Klick auf den Hasen: Sprechblase auf/zu (Pull statt Push). --------- */
  const onRabbitClick = useCallback(() => {
    wake();
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

  return (
    <div className={`stage nobody-wrap--${state}`}>
      {bubble === "menu" && (
        <div className="bubble" role="dialog" aria-label="Niemand spricht">
          <div className="bubble-title">
            <span>Niemand</span>
            <button className="bubble-close" onClick={closeBubble} aria-label="Sprechblase schließen">
              ✕
            </button>
          </div>
          <p className="bubble-text">Hallo! Ich bin Niemand. Was wollen wir machen?</p>
          <div className="bubble-grid">
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
            <button className="bubble-btn bubble-btn--primary" onClick={showSettings}>
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

      {bubble === "zeigen" && (
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
