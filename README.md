# 🐇 Niemand / Nobody — der Gratis-Computerkurs für Jung und Alt

**Niemand** (englisch **Nobody** — ja, wirklich, so heißt er) ist der weiße Hase von
[SMarTrAgents](https://smartragents.ai) — ein vollanimiertes **Desktop-Tierchen** für
Windows, macOS und Linux mit eingebautem, **kostenlosem Computerkurs**.

Er wohnt auf deinem Bildschirm und erklärt dir deinen Computer Schritt für Schritt:
WLAN, Drucker, Dateien, richtig ausschalten, sicher bleiben — dann der Browser mit
Tabs und Favoriten — und zum Schluss stellt er dir deine KI-Helfer auf
[cloud.smartragents.ai](https://cloud.smartragents.ai) vor. Der Kurs passt sich an:
an dein Wissen (drei kurze Fragen am Anfang) und an dein Leben (Ruhestand, Beruf
oder Ausbildung — jeder bekommt seine eigenen Beispiele, Senioren größere Schrift).
**Der Kurs ist gratis. Für immer.** Niemand spricht Deutsch und Englisch —
und jede Sprache, die jemand beisteuert. [Mach mit](#mitmachen) 🐇

> **Mensch mit Maschine:** Niemand erklärt und schlägt vor — ausgeführt wird nur,
> was du selbst anklickst. Er unterbricht dich nie von sich aus.

## 🇬🇧 Nobody — the free computer course for young and old

Nobody is the white rabbit from [smartragents.ai](https://smartragents.ai) — a fully
animated **desktop pet** for Windows, macOS and Linux with a built-in **free
computer course for young and old**. He teaches Wi-Fi, printers, files, safe
passwords, shutting down properly, the browser with tabs and favorites — and then
introduces your AI helpers at [cloud.smartragents.ai](https://cloud.smartragents.ai).
The course adapts to your knowledge (quick check at the start) and your life
situation (retirement, work or school — everyone gets their own examples, seniors
get bigger text). Nobody speaks English and German — and any language someone
contributes. The course is free. Forever. **[Contributions welcome](#mitmachen)** 🐇

## Herunterladen

Ein Klick, fertig — Installer für alle Systeme gibt es unter
**[Releases](../../releases)**:

| System | Datei |
|---|---|
| Windows | `Niemand_x.y.z_x64-setup.exe` |
| Windows (Firmen-IT) | `Niemand_x.y.z_x64_en-US.msi` |
| macOS | `Niemand_x.y.z_universal.dmg` |
| Ubuntu/Debian | `Niemand_x.y.z_amd64.deb` |
| Fedora/openSUSE | `Niemand-x.y.z-1.x86_64.rpm` |
| andere Linux | `Niemand_x.y.z_amd64.AppImage` |

Bequemer geht es über **[smartragents.ai/desktop](https://smartragents.ai/desktop/)**:
Dort erkennt die Seite dein System, zeigt die passende Datei und listet die
SHA256-Prüfsummen zum Nachrechnen.

## Was Niemand kann

- 🥕 **Der Computerkurs** — Kenntnis-Check am Anfang, echte Prüfungen („Bist du
  online?“, „Ist ein Drucker da?“), Möhren als Fortschritt, Senioren-Großschrift
- 📝 **Der Aufgabenzettel** (neu in 0.6): Aufschreiben, Abhaken mit grünem Haken,
  Löschen bewusst in drei Klicks (Haken → Mülltonne → weg). Auf Wunsch mit deinem
  [SMarTrAgents-Konto](https://cloud.smartragents.ai) verbunden: dann steht der
  Zettel auch in deinen Cloud-Notizen — und deine KI-Agenten können Aufgaben für
  dich eintragen. Niemand pulst kurz, wenn etwas Neues draufsteht.
- 🐇 Lebt als kleines, transparentes Fenster auf deinem Schreibtisch — immer sichtbar, nie im Weg
- 🎪 Kunststücke: Hoppeln über den Bildschirm, Nachdenken, Rechnen (öffnet den
  echten Taschenrechner), Freuen mit Konfetti
- 🛎️ Leisten-Symbol (Tray): *Niemand rufen · In die Ecke setzen · Schlafen legen · Beenden*
- ♿ Barrierefrei gedacht: Tastatur-Bedienung, sichtbarer Fokus, `prefers-reduced-motion`
- 🔇 Kein Ton, keine Unterbrechungen, keine Datensammlung — die Cloud-Verbindung
  ist freiwillig und jederzeit trennbar

**🇬🇧 New in 0.6: the to-do list.** Write things down, check them off with a green
tick, delete deliberately in three taps (tick → bin → gone). Connect your
SMarTrAgents account and the list also lives in your cloud notes — your AI agents
can add tasks for you, and Nobody gives a gentle pulse when something new arrives.

## Mitmachen

Niemand ist für Menschen gebaut, die am Computer unsicher sind — oft ältere
Menschen, oft Leute, die nie die Gelegenheit hatten, es in Ruhe zu lernen.
**Jede Sprache, die dazukommt, sind Menschen, die vorher außen vor waren.**

Der einfachste Einstieg ist eine Übersetzung, und du musst dafür **nichts
fertig machen**:

* Deutsch ist die einzige Pflichtsprache. Was in deiner Sprache fehlt, fällt
  auf Deutsch zurück — es baut also auch bei 3 %.
* Schick den Stand als Pull Request. Auch drei Sätze. Der Nächste macht weiter.
* Deine Sprache erscheint in der Auswahl erst, wenn sie ganz da ist. Bis dahin
  sieht kein Nutzer etwas Halbfertiges, und deine Arbeit liegt sicher im
  Projekt.
* `npm run sprachen` sagt dir jederzeit, wie weit du bist:

```
  🏠 Deutsch      100 %  ████████████████████  in der Auswahl sichtbar
  ✅ English      100 %  ████████████████████  in der Auswahl sichtbar
  🔸 Français       3 %  █···················  noch nicht sichtbar — es fehlen 140
```

**Du kannst auch ohne Programmierkenntnisse helfen:** Probier Niemand aus und
sag uns, wo du gestockt hast. „Ich habe es nicht verstanden" ist bei diesem
Programm der wertvollste Fehlerbericht, den es gibt.

👉 [Offene Aufgaben für den Einstieg](../../issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
· [CONTRIBUTING.md](CONTRIBUTING.md)

*English: the same goes for you — see [CONTRIBUTING.md](CONTRIBUTING.md).
Partial translations are explicitly welcome.*

## Entwicklung

Tech-Stack: [Tauri 2](https://tauri.app) (Rust) + React + TypeScript. Kein Electron —
Niemand braucht im Leerlauf nur einen Bruchteil des Speichers.

```bash
npm install
npm run tauri dev    # Entwicklung
npx tauri build      # Installer bauen
```

Unter Linux startet Niemand bewusst über XWayland (`GDK_BACKEND=x11`) — natives
Wayland erlaubt Desktop-Tierchen technisch nicht (keine Selbst-Positionierung,
kein Always-on-top).

## Fahrplan

- [x] **E1** — der Hase lebt: Fenster, Animationen, Tray, Einzelinstanz
- [x] **E4** — Akt 1: Kenntnis-Check, WLAN, Drucker, Dateien (mit echten Prüfungen)
- [x] **E5** — Akt 2: Browser mit Tabs und Favoriten
- [x] **E6** — Akt 3: deine Agenten kennenlernen
- [x] **0.5** — zweisprachig Deutsch/Englisch
- [x] **0.6** — Aufgabenzettel mit Cloud-Sync: Anmeldung am SMarTrAgents-Konto,
      Notiz `workdir/notepad/Niemand-Aufgaben.md`, Agenten schreiben mit
- [x] **0.7** — offen für weitere Sprachen: Teilübersetzungen sind mergefähig,
      eine Sprache erscheint, sobald sie vollständig ist
- [ ] **Präsenz-Sync** — Desktop-Niemand blendet den Cloud-Niemand aus
- [ ] **Vorlesen** (deutsche Stimme, auch offline)
- [ ] **Signierte Installer** + Auto-Update
- [ ] **LibreOffice-Kurs** als vierter Akt

## Lizenz

MIT — siehe [LICENSE](LICENSE) und [NOTICE](NOTICE).

---

*Ein Projekt von [smartragents.ai](https://smartragents.ai) × Fable 5.*
