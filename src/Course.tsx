import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  CHECK_FRAGEN,
  GRUPPEN_FRAGE,
  GRUPPEN_OPTIONEN,
  KURS,
  KursStand,
  LText,
  Schritt,
  Szene,
  ladeStand,
  levelAusAntworten,
  speichereStand,
  textFuer,
  vorabErledigt,
} from "./kurs";
import { Sprache, UI } from "./i18n";

/** Rückmeldungen an den Hasen (Gefühle gehören dem Tier, nicht der Karte). */
export type PetSignal = "denken" | "freude" | "zeigen" | "feiern" | "ruhe";

interface Props {
  sprache: Sprache;
  onSignal: (s: PetSignal) => void;
  onClose: () => void;
}

type View =
  | { art: "check"; phase: "wissen" | "gruppe" }
  | { art: "liste" }
  | { art: "szene"; szene: Szene; schritt: number };

export default function Course({ sprache, onSignal, onClose }: Props) {
  const [stand, setStand] = useState<KursStand>(() => ladeStand());
  const [view, setView] = useState<View>(() => {
    const s = ladeStand();
    if (s.level === null) return { art: "check", phase: "wissen" };
    if (s.zielgruppe === undefined) return { art: "check", phase: "gruppe" };
    return { art: "liste" };
  });
  const [checkNr, setCheckNr] = useState(0);
  const jaCount = useRef(0);
  const [quizHinweis, setQuizHinweis] = useState<string | null>(null);
  const [pruefLage, setPruefLage] = useState<"prueft" | "warten" | "erfolg" | "schon">("prueft");
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const zg = stand.zielgruppe ?? null;
  const t = useCallback((x: LText) => textFuer(x, sprache, zg), [sprache, zg]);
  const ui = UI[sprache];

  const speichern = useCallback((s: KursStand) => {
    setStand(s);
    speichereStand(s);
  }, []);

  /* Escape gestuft: aus einer Szene zurück zur Liste, aus Liste/Kennenlernen
     ganz schließen. (App.tsx überlässt Escape im Kurs bewusst der Kurskarte.) */
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (view.art === "szene") setView({ art: "liste" });
      else onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [view, onClose]);

  /* --- Prüf-Schritte: still nachsehen, Erfolg erkennen. ------------------- */
  const stoppePoll = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const pruefe = useCallback(async (check: "online" | "drucker"): Promise<"ok" | "nein" | "fehlt"> => {
    try {
      if (check === "online") return (await invoke<boolean>("check_online")) ? "ok" : "nein";
      const drucker = await invoke<string[]>("check_printer");
      return drucker.length > 0 ? "ok" : "nein";
    } catch (e) {
      // „werkzeug-fehlt“ = dieses System kann den Schritt nie bestehen
      // (z. B. kein lpstat) → Kurs überspringt statt endlos zu warten.
      return String(e).includes("werkzeug-fehlt") ? "fehlt" : "nein";
    }
  }, []);

  const schritt: Schritt | null =
    view.art === "szene" ? (view.szene.schritte[view.schritt] ?? null) : null;

  useEffect(() => {
    stoppePoll();
    setQuizHinweis(null);
    if (!schritt || schritt.k !== "pruef") return;
    let aktiv = true;
    setPruefLage("prueft");
    onSignal("denken");
    // Timeout-KETTE statt Interval: der nächste Check startet erst, wenn der
    // vorherige fertig ist — keine Stapel-Checks, kein Signal nach Schließen.
    const tick = async (erster: boolean) => {
      const lage = await pruefe(schritt.check);
      if (!aktiv) return;
      if (lage === "ok") {
        setPruefLage(erster ? "schon" : "erfolg");
        onSignal("freude");
        return;
      }
      if (lage === "fehlt") {
        weiter();
        return;
      }
      if (erster) {
        setPruefLage("warten");
        onSignal("ruhe");
      }
      pollTimer.current = setTimeout(() => tick(false), 3000);
    };
    tick(true);
    return () => {
      aktiv = false;
      stoppePoll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  /* --- Navigation. --------------------------------------------------------- */
  const szeneFertig = useCallback(
    (szene: Szene) => {
      const neu = { ...stand, erledigt: { ...stand.erledigt, [szene.id]: true } };
      speichern(neu);
      const alleFertig = KURS.every((s) => neu.erledigt[s.id]);
      onSignal(alleFertig ? "feiern" : "freude");
      setView({ art: "liste" });
    },
    [stand, speichern, onSignal],
  );

  const weiter = useCallback(() => {
    if (view.art !== "szene") return;
    const naechster = view.schritt + 1;
    if (naechster >= view.szene.schritte.length) {
      szeneFertig(view.szene);
    } else {
      setView({ ...view, schritt: naechster });
    }
  }, [view, szeneFertig]);

  const starteSzene = (szene: Szene) => {
    setView({ art: "szene", szene, schritt: 0 });
  };

  const naechsteOffene = KURS.find((s) => !stand.erledigt[s.id]);
  const kursKlasse = `course${zg === "senior" ? " course--senior" : ""}`;

  /* --- AUFTRAG-Karte ausführen (nur per Klick). ---------------------------- */
  const [auftragLief, setAuftragLief] = useState(false);
  useEffect(() => setAuftragLief(false), [view]);
  const führeAus = async (cmd: "open_settings" | "open_url", arg: string) => {
    try {
      await invoke(cmd, cmd === "open_settings" ? { panel: arg } : { target: arg });
      setAuftragLief(true);
      onSignal("zeigen");
    } catch (e) {
      console.error("Auftrag fehlgeschlagen", e);
    }
  };

  /* ======================= Ansichten ======================= */

  if (view.art === "check" && view.phase === "wissen") {
    return (
      <div className={kursKlasse} role="dialog" aria-label={ui.ariaKennenlernen}>
        <div className="course-head">
          <span>{ui.kennenlernenTitel}</span>
          <button className="bubble-close" onClick={onClose} aria-label={ui.kursSchliessen}>
            ✕
          </button>
        </div>
        <p className="course-text">{ui.kennenlernenText}</p>
        <p className="course-frage">{t(CHECK_FRAGEN[checkNr])}</p>
        <div className="bubble-actions">
          {[
            { t: ui.ja, ja: true },
            { t: ui.neinNochNicht, ja: false },
          ].map((o) => (
            <button
              key={o.t}
              className="bubble-btn"
              onClick={() => {
                if (o.ja) jaCount.current += 1;
                if (checkNr + 1 < CHECK_FRAGEN.length) {
                  setCheckNr(checkNr + 1);
                } else {
                  const level = levelAusAntworten(jaCount.current);
                  const erledigt: Record<string, boolean> = {};
                  for (const id of vorabErledigt(level)) erledigt[id] = true;
                  speichern({ ...stand, level, erledigt });
                  setView({ art: "check", phase: "gruppe" });
                }
              }}
            >
              {o.t}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view.art === "check" && view.phase === "gruppe") {
    return (
      <div className={kursKlasse} role="dialog" aria-label={ui.ariaKennenlernen}>
        <div className="course-head">
          <span>{ui.nochEineFrage}</span>
          <button className="bubble-close" onClick={onClose} aria-label={ui.kursSchliessen}>
            ✕
          </button>
        </div>
        <p className="course-frage">{t(GRUPPEN_FRAGE)}</p>
        <div className="bubble-actions">
          {GRUPPEN_OPTIONEN.map((o) => (
            <button
              key={o.zg ?? "keine"}
              className="bubble-btn"
              onClick={() => {
                speichern({ ...stand, zielgruppe: o.zg });
                onSignal("freude");
                setView({ art: "liste" });
              }}
            >
              {t(o.t)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view.art === "liste") {
    const fertig = KURS.filter((s) => stand.erledigt[s.id]).length;
    const alle = fertig === KURS.length;
    return (
      <div className={kursKlasse} role="dialog" aria-label={ui.ariaLektionen}>
        <div className="course-head">
          <span>{ui.deinKurs}</span>
          <button className="bubble-close" onClick={onClose} aria-label={ui.kursSchliessen}>
            ✕
          </button>
        </div>
        <div className="moehren" aria-label={ui.lektionenGeschafft(fertig, KURS.length)}>
          {KURS.map((s) => (
            <span key={s.id} className={`moehre${stand.erledigt[s.id] ? " moehre--voll" : ""}`}>
              🥕
            </span>
          ))}
        </div>
        {alle ? (
          <p className="course-text">{ui.allesGeschafft}</p>
        ) : (
          <button
            className="bubble-btn bubble-btn--primary"
            onClick={() => naechsteOffene && starteSzene(naechsteOffene)}
          >
            {ui.weiter}: {naechsteOffene && t(naechsteOffene.titel)}
          </button>
        )}
        <div className="course-liste">
          {KURS.map((s) => (
            <button key={s.id} className="course-item" onClick={() => starteSzene(s)}>
              <span className="course-item-check" aria-hidden="true">
                {stand.erledigt[s.id] ? "✓" : "○"}
              </span>
              <span>
                {ui.akt} {s.akt}: {t(s.titel)}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* --- Szene spielen. ------------------------------------------------------ */
  if (view.art !== "szene" || !schritt) return null;
  const { szene } = view;

  return (
    <div className={kursKlasse} role="dialog" aria-label={t(szene.titel)}>
      <div className="course-head">
        <span>{t(szene.titel)}</span>
        <button
          className="bubble-close"
          onClick={() => setView({ art: "liste" })}
          aria-label={ui.zurueckZurListe}
        >
          ✕
        </button>
      </div>

      {schritt.k === "sag" && (
        <>
          <p className="course-text">{t(schritt.text)}</p>
          <div className="bubble-actions">
            <button className="bubble-btn bubble-btn--primary" onClick={weiter}>
              {ui.weiter}
            </button>
            <button className="bubble-btn" onClick={() => szeneFertig(szene)}>
              {ui.kennIchSchon}
            </button>
          </div>
        </>
      )}

      {schritt.k === "auftrag" && (
        <>
          <p className="course-text">
            {auftragLief && schritt.danach ? t(schritt.danach) : t(schritt.text)}
          </p>
          <div className="bubble-actions">
            {!auftragLief && (
              <button
                className="bubble-btn bubble-btn--primary"
                onClick={() => führeAus(schritt.cmd, schritt.arg)}
              >
                {t(schritt.knopf)}
              </button>
            )}
            {auftragLief && (
              <button className="bubble-btn bubble-btn--primary" onClick={weiter}>
                {ui.weiter}
              </button>
            )}
            <button
              className="bubble-btn"
              onClick={() => (auftragLief ? setView({ art: "liste" }) : weiter())}
            >
              {auftragLief ? ui.zurLektionsliste : ui.spaeter}
            </button>
          </div>
        </>
      )}

      {schritt.k === "pruef" && (
        <>
          {pruefLage === "prueft" && <p className="course-text">{ui.schaueNach}</p>}
          {pruefLage === "schon" && <p className="course-text">{t(schritt.schonErledigtText)}</p>}
          {pruefLage === "erfolg" && <p className="course-text">{t(schritt.erfolgText)} 🎉</p>}
          {pruefLage === "warten" && <p className="course-text">{t(schritt.warteText)}</p>}
          <div className="bubble-actions">
            {pruefLage === "warten" && schritt.auftragKnopf && (
              <button
                className="bubble-btn bubble-btn--primary"
                onClick={() => führeAus(schritt.auftragCmd!, schritt.auftragArg!)}
              >
                {t(schritt.auftragKnopf)}
              </button>
            )}
            {(pruefLage === "schon" || pruefLage === "erfolg") && (
              <button className="bubble-btn bubble-btn--primary" onClick={weiter}>
                {ui.weiter}
              </button>
            )}
            {pruefLage === "warten" && (
              <button
                className="bubble-btn"
                onClick={() =>
                  // Letzter Schritt der Szene: zurück zur Liste OHNE die
                  // Möhre zu füllen — „Später“ ist kein Erfolg.
                  view.schritt + 1 >= view.szene.schritte.length
                    ? setView({ art: "liste" })
                    : weiter()
                }
              >
                {ui.spaeterWeitermachen}
              </button>
            )}
          </div>
        </>
      )}

      {schritt.k === "frage" && (
        <>
          <p className="course-text">{t(schritt.text)}</p>
          <div className="bubble-actions">
            {schritt.optionen.map((o, i) => (
              <button
                key={i}
                className="bubble-btn"
                onClick={() => {
                  if (o.ok) {
                    setQuizHinweis(null);
                    onSignal("freude");
                    weiter();
                  } else {
                    setQuizHinweis(o.antwort ? t(o.antwort) : ui.quizAusweich);
                  }
                }}
              >
                {t(o.t)}
              </button>
            ))}
          </div>
          {quizHinweis && <p className="course-hinweis">{quizHinweis}</p>}
        </>
      )}
    </div>
  );
}
