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
  | "waving"
  | "walking"
  | "sleeping"
  | "celebrating"
  | "attention";

const SLEEP_AFTER_MS = 5 * 60 * 1000; // Einschlafen nach 5 min ohne Interaktion (Anti-Clippy, Plan § 1)
const HOP_PX = 56; // logische Pixel pro Hüpfer

const CONFETTI = Array.from({ length: 10 }, (_, i) => ({
  cx: `${(i - 5) * 26 + 8}px`,
  color: i % 3 === 0 ? "#00d4ff" : i % 3 === 1 ? "#7B61FF" : "#f7f7ff",
  delay: `${(i % 5) * 60}ms`,
}));

export default function App() {
  const [state, setState] = useState<PetState>("idle");
  const [flip, setFlip] = useState(false);
  const [bubble, setBubble] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const walkAbort = useRef(false);
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* --- Einschlaf-Uhr: jede Interaktion setzt sie zurück. ------------------ */
  const armSleepTimer = useCallback(() => {
    if (sleepTimer.current) clearTimeout(sleepTimer.current);
    sleepTimer.current = setTimeout(() => {
      walkAbort.current = true;
      setBubble(false);
      setState("sleeping");
    }, SLEEP_AFTER_MS);
  }, []);

  const wake = useCallback(() => {
    armSleepTimer();
    if (stateRef.current === "sleeping") setState("idle");
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
      setBubble(false);
      setState("sleeping");
    }).then((u) => unlisten.push(u));
    return () => unlisten.forEach((u) => u());
  }, [wake]);

  /* --- Hoppeln: Fenster hüpft in Etappen über den unteren Rand. ----------- */
  const hopAcross = useCallback(async () => {
    if (stateRef.current === "walking") {
      walkAbort.current = true;
      return;
    }
    setBubble(false);
    walkAbort.current = false;
    try {
      const win = getCurrentWindow();
      const mon = await primaryMonitor();
      if (!mon) return;
      const size = await win.outerSize();
      const start = await win.outerPosition();
      const minX = mon.position.x + 8;
      const maxX = mon.position.x + mon.size.width - size.width - 8;
      // Ziel: zufälliger Punkt mit ordentlich Strecke
      let target = Math.round(minX + Math.random() * (maxX - minX));
      if (Math.abs(target - start.x) < mon.size.width / 4) {
        target = start.x < (minX + maxX) / 2 ? maxX : minX;
      }
      const dir = Math.sign(target - start.x);
      setFlip(dir > 0); // SVG schaut nach links; nach rechts → spiegeln
      setState("walking");
      const hop = Math.round(HOP_PX * mon.scaleFactor);
      let x = start.x;
      while ((target - x) * dir > 0 && !walkAbort.current) {
        const from = x;
        x += dir * Math.min(hop, Math.abs(target - x));
        // Ein Hüpfer = 360 ms, Bogen macht das CSS; Fenster bewegt sich horizontal.
        const frames = 8;
        for (let i = 1; i <= frames; i++) {
          const t = i / frames;
          const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
          await win.setPosition(new PhysicalPosition(Math.round(from + (x - from) * eased), start.y));
          await new Promise((r) => setTimeout(r, 22));
        }
        await new Promise((r) => setTimeout(r, 110));
      }
    } catch (e) {
      console.error("Hoppeln fehlgeschlagen", e);
    } finally {
      setState("idle");
      setFlip(false);
      armSleepTimer();
    }
  }, [armSleepTimer]);

  /* --- Feiern (Konfetti sparsam, reduced-motion → Sternchen). ------------- */
  const celebrate = useCallback(() => {
    setBubble(false);
    setState("celebrating");
    setTimeout(() => setState((s) => (s === "celebrating" ? "idle" : s)), 1900);
  }, []);

  /* --- Klick auf den Hasen: Sprechblase auf/zu (Pull statt Push). --------- */
  const onRabbitClick = useCallback(() => {
    wake();
    if (stateRef.current === "walking") {
      walkAbort.current = true;
      return;
    }
    setBubble((b) => {
      const next = !b;
      setState(next ? "talking" : "idle");
      return next;
    });
  }, [wake]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setBubble(false);
        setState((s) => (s === "talking" ? "idle" : s));
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  const closeBubble = () => {
    setBubble(false);
    setState("idle");
  };

  return (
    <div className={`stage nobody-wrap--${state}`}>
      {bubble && (
        <div className="bubble" role="dialog" aria-label="Niemand spricht">
          <div className="bubble-title">
            <span>Niemand</span>
            <button className="bubble-close" onClick={closeBubble} aria-label="Sprechblase schließen">
              ✕
            </button>
          </div>
          <p className="bubble-text">
            Hallo! Ich bin Niemand. Ich wohne jetzt auf deinem Bildschirm. Bald zeige ich dir deinen
            Computer — Schritt für Schritt. Du bestimmst das Tempo.
          </p>
          <div className="bubble-actions">
            <button className="bubble-btn bubble-btn--primary" onClick={hopAcross}>
              Hoppel eine Runde
            </button>
            <button className="bubble-btn" onClick={celebrate}>
              Freu dich mal
            </button>
            <button
              className="bubble-btn"
              onClick={() => {
                setBubble(false);
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

      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className={`confetti${i === 4 ? " confetti--star" : ""}`}
          style={{
            background: c.color,
            marginLeft: c.cx.startsWith("-") ? c.cx : undefined,
            left: `calc(50% + ${c.cx})`,
            animationDelay: c.delay,
            ["--cx" as string]: c.cx,
          }}
        />
      ))}

      <button
        className={`nobody nobody--${state}${flip ? " nobody--flip" : ""}`}
        onClick={onRabbitClick}
        aria-label="Niemand, der weiße Hase — anklicken zum Reden"
        title="Niemand"
      >
        <span className="nobody-ring" aria-hidden="true" />
        <NobodyRabbitSvg className="nobody-svg" title="Niemand, der weiße Hase" />
        {/* Ohren = Zieh-Griff zum Umsetzen (WCAG 2.5.7: geht auch ohne Ziehen übers Hoppeln) */}
        <span className="nobody-drag" data-tauri-drag-region aria-hidden="true" />
      </button>
    </div>
  );
}
