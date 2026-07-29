# Mitmachen bei Niemand

Danke, dass du hier bist. 🐇

Niemand ist ein kostenloser Computerkurs für Menschen, die am Computer noch
unsicher sind — oft ältere Menschen, oft Leute, die nie die Gelegenheit hatten,
es in Ruhe zu lernen. Jede Sprache, die dazukommt, sind Menschen, die vorher
außen vor waren.

**Der wichtigste Satz zuerst: Du musst nichts fertig machen.** Schick, was du
hast. Wirklich.

---

## Übersetzen — der einfachste Weg hineinzukommen

### In fünf Schritten

1. **Fork und klonen**, dann `npm install`.
2. **Deinen Sprachcode eintragen** in `src/i18n.ts`, ganz oben:
   ```ts
   export const SPRACHEN = ["de", "en", "fr"] as const;   // "fr" ist neu
   ```
   Und den Namen deiner Sprache — **in deiner Sprache**, denn die Auswahl liest
   jemand, der die anderen nicht kann:
   ```ts
   export const SPRACHNAMEN: Record<Sprache, string> = {
     de: "Deutsch",
     en: "English",
     fr: "Français",
   };
   ```
3. **Texte schreiben.** Überall, wo `de:` steht, darf `fr:` daneben:
   ```ts
   titel: {
     de: "Ab ins Netz: dein Internet",
     en: "Off to the net: your internet",
     fr: "En route vers le net : ton internet",   // ← deine Zeile
   },
   ```
   Die Oberflächentexte stehen in `src/i18n.ts`, die Kurstexte in
   `src/kurs.ts`. Beide sind einfach zu lesen: Deutsch und Englisch stehen
   direkt daneben.
4. **Schauen, wie weit du bist:**
   ```
   npm run sprachen
   ```
   ```
     🏠 Deutsch      100 %  ████████████████████  in der Auswahl sichtbar
     ✅ English      100 %  ████████████████████  in der Auswahl sichtbar
     🔸 Français       3 %  █···················  noch nicht sichtbar — es fehlen 140
          Oberfläche: ariaSpricht, ariaZeigt, blaseSchliessen … (+58)
          Kurstexte : 76 von 77 fehlen noch
   ```
5. **Pull Request schicken.** Auch bei 3 %. Der Nächste macht weiter.

### Warum du wirklich aufhören darfst, wann du willst

Das ist keine Höflichkeitsfloskel, das ist so gebaut:

* **Es kompiliert auch halb.** Deutsch ist die einzige Pflichtsprache. Alles
  andere ist im Typ optional (`LText = { de: TextVar } & Partial<…>`). Bis Juli
  2026 war das anders — da waren Deutsch **und** Englisch Pflichtfelder, und
  eine neue Sprache musste in *jedem* der 77 Kurstexte und aller 64
  Oberflächentexte stehen, bevor überhaupt etwas baute. Das war eine Mauer,
  keine Tür. Sie ist weg.
* **Fehlendes fällt auf Deutsch zurück.** Niemand stürzt ab, wenn ein Text
  fehlt.
* **Deine Sprache erscheint erst, wenn sie ganz da ist.** Bis dahin sieht kein
  Nutzer etwas Halbfertiges — das ist Absicht: Wer zum ersten Mal am Computer
  sitzt, kommt mit einem Programm, das mitten im Satz die Sprache wechselt,
  nicht zurecht. Deine Arbeit liegt so lange sicher im Projekt und wächst.

### Wie Niemand klingt

Bitte übernimm den Ton, nicht nur die Wörter:

* **Kurze Sätze. Ein Gedanke pro Satz.** Wie mit jemandem, der neben dir sitzt.
* **Nie „falsch" oder „Fehler".** Stattdessen „Fast!" oder „Kein Problem".
  Auf Englisch „Almost!" / „No worries".
* **Du-Form**, warm, nie von oben herab.
* **Sprachniveau A2** — einfache Alltagssprache.
* **Feste Konvention:** „AUFTRAG: …" heißt auf Englisch „TASK: …". Wähl für
  deine Sprache ein ebenso kurzes, klares Wort und bleib dabei.
* Wenn eine Redewendung in deiner Sprache nicht funktioniert: **nimm eine
  andere.** Wir wollen keine wörtliche Übersetzung, wir wollen, dass es
  ankommt.

### Zielgruppen-Varianten

Manche Texte haben Varianten für verschiedene Menschen:

```ts
de: {
  standard: "In „Dokumente" wohnen deine Briefe.",
  senior:   "In „Dokumente" wohnen deine Briefe. In „Bilder" die Fotos von der Familie.",
  beruf:    "In „Dokumente" wohnen deine Angebote und Rechnungen.",
  jung:     "In „Dokumente" wohnen deine Texte und Unterlagen.",
},
```

Du darfst das übernehmen — musst aber nicht. Ein einfacher Text reicht:

```ts
fr: "Tes lettres vivent dans « Documents ».",
```

---

## Andere Wege mitzumachen

* **Fehler melden.** Etwas hakt, ein Text ist unklar, der Hase steht im Weg?
  Mach ein Issue auf. Auch „ich habe es nicht verstanden" ist ein wertvoller
  Fehlerbericht — bei diesem Programm sogar der wertvollste.
* **Auf deinem System testen.** Windows, macOS, Ubuntu. Sag uns, was schiefgeht.
* **Neue Lektionen vorschlagen.** Was fehlt im Kurs? Was fragen dich die
  Menschen in deinem Umfeld immer wieder?
* **Barrierefreiheit.** Screenreader, Tastaturbedienung, Kontraste, große
  Schrift — wenn du dich damit auskennst, bist du hier besonders willkommen.

---

## Entwickeln

```bash
npm install
npm run tauri dev      # Anwendung starten
npm run build          # Weboberfläche bauen
npx tsc --noEmit       # Typen prüfen
npm run sprachen       # Stand der Übersetzungen
```

Ein paar Hausregeln, damit der Quelltext lesbar bleibt:

* **Deutsche Bezeichner im Quelltext.** Das ist ungewöhnlich und Absicht — das
  Projekt wird auf Deutsch gedacht. Englische Namen nur da, wo eine
  Fremdschnittstelle sie vorgibt.
* **Kommentare erklären das WARUM**, nicht das WAS. Am liebsten mit dem Befund,
  aus dem eine Zeile entstanden ist.
* **Keine Negativtexte in der Oberfläche.** Was es nicht gibt, wird weggelassen
  statt ausgegraut.

---

## Pull Requests

* Ein Thema pro PR. Lieber drei kleine als einer, der alles anfasst.
* Sag im Titel, was drin ist: `fr: Lektion „Dateien und Ordner" übersetzt`.
* `npx tsc --noEmit` muss durchlaufen. `npm run sprachen` darf ruhig 🔸 zeigen.
* Fühl dich nicht schlecht, wenn du nicht antwortest oder nicht weitermachst.
  Angefangenes ist auch etwas wert.

## Verhalten

Sei freundlich. Dieses Projekt ist für Menschen gemacht, die sich am Computer
unsicher fühlen — der Umgang hier untereinander sollte dasselbe ausstrahlen.
Herablassung gegenüber Anfängern hat hier keinen Platz, weder gegenüber
Nutzern noch gegenüber Mitwirkenden.

## Lizenz

MIT — siehe [LICENSE](LICENSE) und [NOTICE](NOTICE). Mit deinem Beitrag
stellst du ihn unter dieselbe Lizenz.
