# 🐇 Niemand / Nobody — der Gratis-Computerkurs für Jung und Alt

**Niemand** (englisch **Nobody** — ja, wirklich, so heißt er) ist der weiße Hase von
[SMarTrAgents](https://smartragents.ai) — ein vollanimiertes **Desktop-Tierchen** für
Windows, macOS und Ubuntu mit eingebautem, **kostenlosem Computerkurs**.

Er wohnt auf deinem Bildschirm und erklärt dir deinen Computer Schritt für Schritt:
WLAN, Drucker, Dateien, richtig ausschalten, sicher bleiben — dann der Browser mit
Tabs und Favoriten — und zum Schluss stellt er dir deine KI-Helfer auf
[cloud.smartragents.ai](https://cloud.smartragents.ai) vor. Der Kurs passt sich an:
an dein Wissen (drei kurze Fragen am Anfang) und an dein Leben (Ruhestand, Beruf
oder Ausbildung — jeder bekommt seine eigenen Beispiele, Senioren größere Schrift).
**Der Kurs ist gratis. Für immer.** Niemand spricht Deutsch und Englisch.

> **Mensch mit Maschine:** Niemand erklärt und schlägt vor — ausgeführt wird nur,
> was du selbst anklickst. Er unterbricht dich nie von sich aus.

## 🇬🇧 Nobody — the free computer course for young and old

Nobody is the white rabbit from [smartragents.ai](https://smartragents.ai) — a fully
animated **desktop pet** for Windows, macOS and Ubuntu with a built-in **free
computer course for young and old**. He teaches Wi-Fi, printers, files, safe
passwords, shutting down properly, the browser with tabs and favorites — and then
introduces your AI helpers at [cloud.smartragents.ai](https://cloud.smartragents.ai).
The course adapts to your knowledge (quick check at the start) and your life
situation (retirement, work or school — everyone gets their own examples, seniors
get bigger text). Nobody speaks English and German. The course is free. Forever.

## Herunterladen

Ein Klick, fertig — Installer für alle Systeme gibt es unter
**[Releases](../../releases)**:

| System | Datei |
|---|---|
| Windows | `Niemand_x.y.z_x64-setup.exe` |
| macOS | `Niemand_x.y.z_universal.dmg` |
| Ubuntu/Debian | `Niemand_x.y.z_amd64.deb` |
| andere Linux | `Niemand_x.y.z_amd64.AppImage` |

## Was Niemand kann (Stand: Prototyp E1)

- 🐇 Lebt als kleines, transparentes Fenster auf deinem Schreibtisch — immer sichtbar, nie im Weg
- 🥕 Hoppelt auf Wunsch über den Bildschirmrand, zwinkert, denkt, feiert, schläft
- 💬 Sprechblase per Klick — große Knöpfe, klare Sprache, per Escape wieder zu
- 🛎️ Leisten-Symbol (Tray): *Niemand rufen · Schlafen legen · Beenden*
- ♿ Barrierefrei gedacht: Tastatur-Bedienung, sichtbarer Fokus, `prefers-reduced-motion`
- 🔇 Kein Ton, keine Unterbrechungen, keine Datensammlung

Der komplette Computerkurs (drei Akte: *Dein Computer* → *Dein Fenster ins Netz* →
*Deine Agenten*) mit Kenntnis-Check am Anfang ist in Arbeit — Fahrplan siehe unten.

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
- [ ] **E2/E3** — Verbindung zum SMarTrAgents-Konto (Gerätecode, Präsenz-Sync)
- [ ] **E4** — Akt 1: Kenntnis-Check, WLAN, Drucker, Dateien, LibreOffice-Kurs
- [ ] **E5** — Akt 2: Browser installieren und verstehen
- [ ] **E6** — Akt 3: deine Agenten kennenlernen und einrichten
- [ ] **E7** — Vorlesen (deutsche Stimme, auch offline)
- [ ] **E8** — signierte Installer + Auto-Update

## Lizenz

MIT — siehe [LICENSE](LICENSE).

---

*Ein Projekt von [smartragents.ai](https://smartragents.ai) × Fable 5.*
