import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  MAX_EINTRAEGE,
  MAX_TEXT,
  TODO_EVENT,
  TodoItem,
  kuerze,
  ladeAufgaben,
  neueId,
  schluessel,
  speichereAufgaben,
  syncEinmal,
} from "./todo";
import { Sprache, UI } from "./i18n";

/** Rückmeldungen an den Hasen — Gefühle gehören dem Tier, nicht der Karte. */
export type TodoSignal = "freude" | "feiern" | "reden";

interface Props {
  sprache: Sprache;
  onSignal: (s: TodoSignal) => void;
  onClose: () => void;
}

type CloudLage = "unbekannt" | "getrennt" | "verbunden" | "offline";

const LOESCH_ARM_MS = 5000; // Mülltonne fällt ohne dritten Klick zurück auf ✔
const SYNC_TAKT_MS = 60_000;
const PUSH_VERZOEGERUNG_MS = 1200;

export default function Todo({ sprache, onSignal, onClose }: Props) {
  const ui = UI[sprache];
  const [items, setItems] = useState<TodoItem[]>(() => ladeAufgaben().items);
  const [eingabe, setEingabe] = useState("");
  /* 3-Klick-Weg: Klick 1 = grüner Haken, Klick 2 = Mülltonne (scharf),
     Klick 3 = weg. `arm` merkt sich, welcher Eintrag gerade scharf ist. */
  const [arm, setArm] = useState<string | null>(null);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lage, setLage] = useState<CloudLage>("unbekannt");
  const [email, setEmail] = useState<string | null>(null);
  const [loginOffen, setLoginOffen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPasswort, setLoginPasswort] = useState("");
  const [loginTotp, setLoginTotp] = useState("");
  const [totpNoetig, setTotpNoetig] = useState(false);
  const [loginMeldung, setLoginMeldung] = useState<string | null>(null);
  const [loginLaeuft, setLoginLaeuft] = useState(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lebt = useRef(true);
  const statusRefs = useRef(new Map<string, HTMLButtonElement>());
  const eingabeRef = useRef<HTMLInputElement | null>(null);

  /* Escape gestuft: volles Feld leeren, leeres Feld verlassen — und das
     Ereignis stoppen, damit App.tsx nicht gleich den ganzen Zettel schließt
     (sonst wäre die halbe Eingabe eines Seniors einfach weg). */
  const feldEscape = (e: React.KeyboardEvent<HTMLInputElement>, leeren: () => void) => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    if (e.currentTarget.value) leeren();
    else e.currentTarget.blur();
  };

  const entschaerfen = useCallback(() => {
    if (armTimer.current) clearTimeout(armTimer.current);
    armTimer.current = null;
    setArm(null);
  }, []);

  /* --- Sync: beim Öffnen, im Takt, nach Änderungen (verzögert). ----------- */
  const planePushRef = useRef<() => void>(() => {});

  const syncJetzt = useCallback(async () => {
    const e = await syncEinmal();
    if (!lebt.current) return;
    if (e.status === "ok") {
      setLage("verbunden");
    } else if (e.status === "abgemeldet") {
      setLage("getrennt");
      setEmail(null);
    } else if (e.status === "offline") {
      setLage("offline");
    } else if (e.status === "laeuft") {
      // Ein anderer Lauf hielt den Mutex — unsere Änderung ist noch nicht
      // sicher oben: nach der Verzögerung erneut anstoßen.
      planePushRef.current();
    }
  }, []);

  const planePush = useCallback(() => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      pushTimer.current = null;
      void syncJetzt();
    }, PUSH_VERZOEGERUNG_MS);
  }, [syncJetzt]);
  planePushRef.current = planePush;

  /* lage für den Intervall-Callback: Refs sind stabil, der Mount-Closure
     würde sonst für immer den Startwert sehen. */
  const lageRef = useRef(lage);
  lageRef.current = lage;

  useEffect(() => {
    lebt.current = true;
    void (async () => {
      try {
        const s = await invoke<{ angemeldet: boolean; email: string | null }>("cloud_status");
        if (!lebt.current) return;
        if (s.angemeldet) {
          setEmail(s.email);
          setLage("verbunden");
          void syncJetzt();
        } else {
          setLage("getrennt");
        }
      } catch {
        setLage("getrennt");
      }
    })();
    const takt = setInterval(() => {
      const l = lageRef.current;
      if (lebt.current && (l === "verbunden" || l === "offline")) void syncJetzt();
    }, SYNC_TAKT_MS);
    const neuLaden = () => setItems(ladeAufgaben().items);
    window.addEventListener(TODO_EVENT, neuLaden);
    return () => {
      lebt.current = false;
      clearInterval(takt);
      window.removeEventListener(TODO_EVENT, neuLaden);
      if (armTimer.current) clearTimeout(armTimer.current);
      if (pushTimer.current) {
        // Zettel zu, aber ein Push stand noch aus → sofort abschicken,
        // sonst wartet die Änderung bis zum nächsten 5-Minuten-Puls.
        clearTimeout(pushTimer.current);
        pushTimer.current = null;
        void syncEinmal();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speichern = useCallback(
    (neu: TodoItem[]) => {
      setItems(neu);
      const stand = ladeAufgaben();
      speichereAufgaben({ items: neu, basis: stand.basis });
      planePush();
    },
    [planePush],
  );

  /* --- Aufschreiben. ------------------------------------------------------ */
  const hinzufuegen = useCallback(() => {
    const text = kuerze(eingabe.trim().replace(/\s+/g, " "));
    if (!text) return;
    if (items.length >= MAX_EINTRAEGE) return;
    if (items.some((i) => schluessel(i.text) === schluessel(text))) {
      setEingabe("");
      return; // steht schon drauf — still lassen, kein Fehlerkasten
    }
    speichern([...items, { id: neueId(), text, done: false, quelle: "ich", angelegt: Date.now() }]);
    setEingabe("");
    onSignal("reden");
  }, [eingabe, items, speichern, onSignal]);

  /* --- Der 3-Klick-Weg auf dem Status-Knopf. ------------------------------ */
  const statusKlick = useCallback(
    (item: TodoItem) => {
      if (!item.done) {
        // Klick 1: abhaken — grüner Haken, der Hase freut sich.
        const neu = items.map((i) => (i.id === item.id ? { ...i, done: true } : i));
        speichern(neu);
        entschaerfen();
        onSignal(neu.every((i) => i.done) ? "feiern" : "freude");
        return;
      }
      if (arm !== item.id) {
        // Klick 2: Mülltonne zeigen (scharf) — fällt nach 5 s von selbst zurück.
        if (armTimer.current) clearTimeout(armTimer.current);
        setArm(item.id);
        armTimer.current = setTimeout(() => setArm(null), LOESCH_ARM_MS);
        return;
      }
      // Klick 3: endgültig weg. Fokus weiterreichen — sonst fällt er auf den
      // Fensterhintergrund und Tastaturnutzer stehen im Nichts.
      entschaerfen();
      const rest = items.filter((i) => i.id !== item.id);
      const idx = items.findIndex((i) => i.id === item.id);
      speichern(rest);
      const nachbar = rest[Math.min(idx, rest.length - 1)];
      requestAnimationFrame(() => {
        if (nachbar) statusRefs.current.get(nachbar.id)?.focus();
        else eingabeRef.current?.focus();
      });
    },
    [items, arm, speichern, entschaerfen, onSignal],
  );

  /* Klick auf den TEXT eines erledigten Eintrags macht ihn wieder auf —
     der sanfte Rückweg, falls der Haken ein Versehen war. */
  const textKlick = useCallback(
    (item: TodoItem) => {
      if (arm === item.id) {
        entschaerfen(); // scharfe Mülltonne? Textklick = Rückzieher.
        return;
      }
      if (item.done) {
        speichern(items.map((i) => (i.id === item.id ? { ...i, done: false } : i)));
      }
    },
    [items, arm, speichern, entschaerfen],
  );

  /* --- Anmeldung. --------------------------------------------------------- */
  const anmelden = useCallback(async () => {
    if (loginLaeuft) return;
    setLoginLaeuft(true);
    setLoginMeldung(null);
    try {
      const a = await invoke<{ ok: boolean; totp_noetig: boolean; code: string | null }>(
        "cloud_login",
        { email: loginEmail, passwort: loginPasswort, totp: loginTotp || null },
      );
      if (!lebt.current) return;
      if (a.ok) {
        setEmail(loginEmail.trim());
        setLage("verbunden");
        setLoginOffen(false);
        setLoginPasswort("");
        setLoginTotp("");
        setTotpNoetig(false);
        onSignal("feiern");
        void syncJetzt();
        return;
      }
      setTotpNoetig(a.totp_noetig);
      if (a.code) setLoginMeldung(ui.loginFehler(a.code));
    } catch {
      if (lebt.current) setLoginMeldung(ui.loginFehler("offline"));
    } finally {
      if (lebt.current) setLoginLaeuft(false);
    }
  }, [loginLaeuft, loginEmail, loginPasswort, loginTotp, onSignal, syncJetzt, ui]);

  const abmelden = useCallback(async () => {
    try {
      await invoke("cloud_logout");
    } catch {
      /* Sitzung ist lokal — schlimmstenfalls bleibt die Datei, nächster Pull räumt auf */
    }
    setEmail(null);
    setLage("getrennt");
  }, []);

  const offen = items.filter((i) => !i.done).length;
  const erledigt = items.length - offen;

  return (
    <div className="todo" role="dialog" aria-label={ui.ariaAufgaben}>
      <div className="course-head">
        <span>📝 {ui.aufgabenTitel}</span>
        <button className="bubble-close" onClick={onClose} aria-label={ui.zettelSchliessen}>
          ✕
        </button>
      </div>

      {/* Cloud-Zeile: verbinden / verbunden / gerade offline */}
      {lage === "verbunden" && email ? (
        <div className="todo-cloud todo-cloud--an">
          <span className="todo-cloud-text">{ui.cloudVerbunden(email)}</span>
          <button className="todo-cloud-knopf" onClick={abmelden}>
            {ui.cloudAbmelden}
          </button>
        </div>
      ) : lage === "offline" ? (
        <div className="todo-cloud">
          <span className="todo-cloud-text">{ui.cloudOffline}</span>
        </div>
      ) : loginOffen ? null : (
        <div className="todo-cloud">
          <span className="todo-cloud-text">{ui.cloudGetrennt}</span>
          <button className="todo-cloud-knopf" onClick={() => setLoginOffen(true)}>
            {ui.cloudVerbindenKnopf}
          </button>
        </div>
      )}

      {loginOffen ? (
        /* Anmelde-Karte: dieselben Zugangsdaten wie in der Cloud. Felder
           scrollen innen, die Knopfreihe bleibt IMMER sichtbar (Hausregel). */
        <div className="todo-login">
          <div className="todo-login-scroll">
            <p className="todo-login-titel">{ui.anmeldenTitel}</p>
            {!totpNoetig && <p className="todo-login-text">{ui.anmeldenErklaerung}</p>}
            <label className="todo-feld">
              <span>{ui.emailFeld}</span>
              <input
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                onKeyDown={(e) => feldEscape(e, () => setLoginEmail(""))}
              />
            </label>
            <label className="todo-feld">
              <span>{ui.passwortFeld}</span>
              <input
                type="password"
                autoComplete="current-password"
                value={loginPasswort}
                onChange={(e) => setLoginPasswort(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !totpNoetig) void anmelden();
                  else feldEscape(e, () => setLoginPasswort(""));
                }}
              />
            </label>
            {totpNoetig && (
              <label className="todo-feld">
                <span>{ui.totpFeld}</span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={loginTotp}
                  onChange={(e) => setLoginTotp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void anmelden();
                    else feldEscape(e, () => setLoginTotp(""));
                  }}
                />
              </label>
            )}
            {loginMeldung && <p className="todo-login-meldung">{loginMeldung}</p>}
          </div>
          <div className="bubble-grid" style={{ marginTop: 10, marginBottom: 0 }}>
            <button
              className="bubble-btn bubble-btn--primary"
              onClick={() => void anmelden()}
              disabled={loginLaeuft || !loginEmail.trim() || !loginPasswort}
            >
              {ui.anmeldenKnopf}
            </button>
            <button
              className="bubble-btn"
              onClick={() => {
                setLoginOffen(false);
                setLoginMeldung(null);
                setTotpNoetig(false);
              }}
            >
              {ui.spaeter}
            </button>
          </div>
        </div>
      ) : (
        <>
          {items.length > 0 && (
            <p className="todo-zaehler">{ui.aufgabenZaehler(offen, erledigt)}</p>
          )}

          {items.length === 0 ? (
            <p className="course-text">{ui.aufgabenLeer}</p>
          ) : (
            <div className="todo-liste">
              {items.map((item) => {
                const scharf = arm === item.id;
                const statusHint = !item.done
                  ? ui.abhakenHint
                  : scharf
                    ? ui.endgueltigLoeschenHint
                    : ui.loeschenScharfHint;
                const marke = item.quelle === "cloud" && (
                  <span className="todo-marke">☁️ {ui.vonCloudMarke}</span>
                );
                return (
                  <div
                    key={item.id}
                    className={`todo-item${item.done ? " todo-item--erledigt" : ""}${
                      scharf ? " todo-item--scharf" : ""
                    }`}
                  >
                    <button
                      ref={(el) => {
                        if (el) statusRefs.current.set(item.id, el);
                        else statusRefs.current.delete(item.id);
                      }}
                      className={`todo-status${
                        !item.done ? "" : scharf ? " todo-status--muell" : " todo-status--haken"
                      }`}
                      onClick={() => statusKlick(item)}
                      aria-label={`${statusHint}: ${item.text}`}
                      title={statusHint}
                    >
                      <span aria-hidden="true">{!item.done ? "○" : scharf ? "🗑" : "✔"}</span>
                    </button>
                    {item.done ? (
                      /* Nur erledigte Texte sind Knöpfe (Rückweg) — offene als
                         passive Fläche, sonst steht ein toter Button im Tab-Weg. */
                      <button
                        className="todo-text"
                        onClick={() => textKlick(item)}
                        aria-label={scharf ? item.text : `${ui.wiederAufmachenHint}: ${item.text}`}
                        title={scharf ? undefined : ui.wiederAufmachenHint}
                      >
                        {item.text}
                        {marke}
                      </button>
                    ) : (
                      <span className="todo-text todo-text--passiv">
                        {item.text}
                        {marke}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Aufschreiben — großes Feld, Enter oder Knopf. */}
          <div className="todo-fuss">
            <input
              ref={eingabeRef}
              className="todo-eingabe"
              value={eingabe}
              placeholder={ui.aufgabenEingabe}
              maxLength={MAX_TEXT}
              onChange={(e) => setEingabe(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") hinzufuegen();
                else feldEscape(e, () => setEingabe(""));
              }}
            />
            <button
              className="bubble-btn bubble-btn--primary todo-plus"
              onClick={hinzufuegen}
              disabled={!eingabe.trim()}
            >
              ➕ {ui.aufschreiben}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
