use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager,
};

/// Prozess-Start ohne Konsolenfenster — auf Windows blitzt sonst bei jedem
/// Aufruf ein schwarzes Fenster auf (Gegenprüfungs-Blocker 28.07.).
fn befehl(prog: &str) -> std::process::Command {
    #[allow(unused_mut)]
    let mut c = std::process::Command::new(prog);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        c.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }
    c
}

/// Sauberes Beenden aus der Oberfläche (Sprechblasen-Knopf).
#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

/// Tray-Sprache zur Laufzeit aus der Umgebung: LC_ALL vor LANG (Konvention).
/// Beginnt der Wert mit „de“ → Deutsch, sonst Englisch (Zweisprachigkeit 0.5.0;
/// die Oberfläche selbst wählt ihre Sprache im Webview über i18n.ts).
fn tray_ist_deutsch() -> bool {
    ["LC_ALL", "LANG"]
        .iter()
        .filter_map(|k| std::env::var(k).ok())
        .find(|v| !v.is_empty())
        .map(|v| v.starts_with("de"))
        .unwrap_or(false)
}

/// Öffnet eine System-Einstellungsseite per Deep-Link — NUR aus der festen
/// Ziel-Liste, nie aus freien Strings (Playbook-Regel, Plan § 8.4). Wird
/// ausschließlich durch einen Nutzer-Klick auf eine AUFTRAG-Karte ausgelöst.
/// Async, damit nichts den UI-Thread blockiert.
#[tauri::command]
async fn open_settings(panel: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        let gnome_arg: Option<&str> = match panel.as_str() {
            "sound" => Some("sound"),
            "wifi" => Some("wifi"),
            "printers" => Some("printers"),
            "system" => None,
            _ => return Err("unbekanntes Ziel".into()),
        };
        // Fallback-Kette: GNOME → KDE → XFCE (Gegenprüfung: nicht jedes
        // Linux hat gnome-control-center).
        let versuche: Vec<(&str, Vec<&str>)> = vec![
            (
                "gnome-control-center",
                gnome_arg.map(|a| vec![a]).unwrap_or_default(),
            ),
            ("systemsettings", vec![]),
            ("xfce4-settings-manager", vec![]),
        ];
        for (prog, args) in versuche {
            match befehl(prog).args(&args).spawn() {
                Ok(_) => return Ok(()),
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => continue,
                Err(e) => return Err(e.to_string()),
            }
        }
        Err("werkzeug-fehlt".into())
    }
    #[cfg(target_os = "windows")]
    {
        let uri = match panel.as_str() {
            "sound" => "ms-settings:sound",
            "wifi" => "ms-settings:network-wifi",
            "printers" => "ms-settings:printers",
            "system" => "ms-settings:",
            _ => return Err("unbekanntes Ziel".into()),
        };
        befehl("explorer.exe")
            .arg(uri)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(target_os = "macos")]
    {
        let uri = match panel.as_str() {
            "sound" => "x-apple.systempreferences:com.apple.Sound-Settings.extension",
            "wifi" => "x-apple.systempreferences:com.apple.wifi-settings-extension",
            "printers" => "x-apple.systempreferences:com.apple.Print-Scan-Settings.extension",
            "system" => "x-apple.systempreferences:",
            _ => return Err("unbekanntes Ziel".into()),
        };
        befehl("open").arg(uri).spawn().map_err(|e| e.to_string())?;
        Ok(())
    }
}

/// Internet da? App-eigene Wahrheit: kommen wir zu unserer Cloud durch?
/// (Plan § 4: Konnektivität statt SSID — keine Location-Berechtigung nötig.)
/// Async: DNS + TCP-Timeout dürfen den UI-Thread nie einfrieren.
#[tauri::command]
async fn check_online() -> bool {
    tauri::async_runtime::spawn_blocking(|| {
        use std::net::{TcpStream, ToSocketAddrs};
        use std::time::Duration;
        if let Ok(mut addrs) = "cloud.smartragents.ai:443".to_socket_addrs() {
            if let Some(addr) = addrs.next() {
                return TcpStream::connect_timeout(&addr, Duration::from_secs(3)).is_ok();
            }
        }
        false
    })
    .await
    .unwrap_or(false)
}

/// Eingerichtete Drucker auflisten — ohne Adminrechte, ohne Prompts
/// (lpstat auf Linux/macOS, Get-Printer auf Windows; Plan § 4 Akt 1.4).
/// „werkzeug-fehlt“ = lpstat existiert nicht (Minimal-System) — der Kurs
/// überspringt den Schritt dann, statt endlos zu warten.
#[tauri::command]
async fn check_printer() -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        #[cfg(any(target_os = "linux", target_os = "macos"))]
        {
            let out = befehl("lpstat")
                .arg("-p")
                // sprachneutral erzwingen: immer "printer X …", nie
                // "imprimante/impresora/…" (Gegenprüfungs-Befund)
                .env("LC_ALL", "C")
                .env("LANG", "C")
                .output()
                .map_err(|e| {
                    if e.kind() == std::io::ErrorKind::NotFound {
                        "werkzeug-fehlt".to_string()
                    } else {
                        e.to_string()
                    }
                })?;
            let s = String::from_utf8_lossy(&out.stdout);
            Ok(s.lines()
                .filter_map(|l| {
                    l.strip_prefix("printer ")
                        .or_else(|| l.strip_prefix("Drucker "))
                        .and_then(|r| r.split_whitespace().next())
                        .map(|n| n.to_string())
                })
                .collect())
        }
        #[cfg(target_os = "windows")]
        {
            let out = befehl("powershell")
                .args(["-NoProfile", "-Command", "(Get-Printer).Name"])
                .output()
                .map_err(|e| e.to_string())?;
            let s = String::from_utf8_lossy(&out.stdout);
            Ok(s.lines()
                .map(|l| l.trim().to_string())
                .filter(|l| !l.is_empty())
                .collect())
        }
    })
    .await
    .unwrap_or_else(|e| Err(e.to_string()))
}

/// Öffnet ein System-Werkzeug — NUR aus der festen Liste (Playbook-Regel).
/// Erster Eintrag: der Taschenrechner (🔢-Gag-Knopf, Inhaber-Wunsch 29.07.).
#[tauri::command]
async fn open_tool(tool: String) -> Result<(), String> {
    if tool != "calculator" {
        return Err("unbekanntes Werkzeug".into());
    }
    #[cfg(target_os = "linux")]
    {
        for prog in ["gnome-calculator", "kcalc", "xcalc"] {
            match befehl(prog).spawn() {
                Ok(_) => return Ok(()),
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => continue,
                Err(e) => return Err(e.to_string()),
            }
        }
        Err("werkzeug-fehlt".into())
    }
    #[cfg(target_os = "windows")]
    {
        befehl("calc.exe").spawn().map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(target_os = "macos")]
    {
        befehl("open")
            .args(["-a", "Calculator"])
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

/* --- Cloud-Sitzung + Aufgabenzettel-Sync (v0.6.0) ---------------------------
   Der Aufgabenzettel lebt als Markdown-Notiz `workdir/notepad/Niemand-Aufgaben.md`
   im Kunden-Container: Agenten füllen sie (Skill „planen“), das Notizen-Panel
   der Cloud zeigt sie, und Niemand holt/bringt sie über die files-API des
   Gateways. HTTP läuft bewusst hier in Rust — der Webview-Origin steht nicht
   in ALLOWED_ORIGINS des Gateways, und hier gibt es kein CORS.
   Anmeldung = derselbe Login wie überall (Inhaber-Regel: Login überall gleich);
   der Gerätecode-Flow aus Plan E2 ersetzt das später, die Kommandos bleiben. */

const CLOUD_BASIS: &str = "https://cloud.smartragents.ai";
const NOTIZ_PFAD: &str = "workdir/notepad/Niemand-Aufgaben.md";
const NOTIZ_MAX_BYTES: usize = 200_000; // Notepad-Deckel der Cloud (200 KB)

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct CloudSitzung {
    token: String,
    email: String,
}

fn sitzungs_datei(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("config-dir: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("config-dir: {e}"))?;
    Ok(dir.join("cloud-sitzung.json"))
}

fn lade_sitzung(app: &tauri::AppHandle) -> Option<CloudSitzung> {
    let pfad = sitzungs_datei(app).ok()?;
    let raw = std::fs::read_to_string(pfad).ok()?;
    serde_json::from_str(&raw).ok()
}

fn speichere_sitzung(app: &tauri::AppHandle, s: &CloudSitzung) -> Result<(), String> {
    let pfad = sitzungs_datei(app)?;
    let raw = serde_json::to_string(s).map_err(|e| e.to_string())?;
    // Datei von der ERSTEN Millisekunde an nur für den Nutzer lesbar —
    // nachträgliches chmod ließe ein Fenster mit weltlesbarem Token offen.
    #[cfg(unix)]
    {
        use std::io::Write;
        use std::os::unix::fs::OpenOptionsExt;
        let mut f = std::fs::OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .mode(0o600)
            .open(&pfad)
            .map_err(|e| e.to_string())?;
        f.write_all(raw.as_bytes()).map_err(|e| e.to_string())?;
    }
    // Windows: %APPDATA% trägt bereits Nur-dieser-Nutzer-ACLs.
    #[cfg(not(unix))]
    std::fs::write(&pfad, raw).map_err(|e| e.to_string())?;
    Ok(())
}

fn loesche_sitzung(app: &tauri::AppHandle) {
    if let Ok(pfad) = sitzungs_datei(app) {
        let _ = std::fs::remove_file(pfad);
    }
}

fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent(concat!("niemand-desktop/", env!("CARGO_PKG_VERSION")))
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())
}

/// Antwort ans UI: `code` ist ein Symbol (zugangsdaten/code_falsch/…), die
/// Oberfläche übersetzt es zweisprachig — hier wohnen keine Texte.
#[derive(serde::Serialize)]
struct LoginAntwort {
    ok: bool,
    totp_noetig: bool,
    code: Option<String>,
}

fn login_fehler(code: &str, totp_noetig: bool) -> LoginAntwort {
    LoginAntwort {
        ok: false,
        totp_noetig,
        code: Some(code.to_string()),
    }
}

/// Anmeldung mit denselben Zugangsdaten wie auf cloud.smartragents.ai.
/// TOTP-Konten: erster Aufruf ohne Code liefert `totp_noetig`, zweiter Aufruf
/// mit Code schließt über /auth/totp/verify (Bearer = mfa_token) ab.
#[tauri::command]
async fn cloud_login(
    app: tauri::AppHandle,
    email: String,
    passwort: String,
    totp: Option<String>,
) -> Result<LoginAntwort, String> {
    let client = http_client()?;
    let r = client
        .post(format!("{CLOUD_BASIS}/api/v1/auth/login"))
        .json(&serde_json::json!({ "email": email.trim(), "password": passwort }))
        .send()
        .await
        .map_err(|e| format!("offline: {e}"))?;
    let status = r.status().as_u16();
    let v: serde_json::Value = r.json().await.unwrap_or_default();
    match status {
        200 => {
            if let Some(token) = v.get("token").and_then(|t| t.as_str()) {
                speichere_sitzung(
                    &app,
                    &CloudSitzung { token: token.to_string(), email: email.trim().to_string() },
                )?;
                return Ok(LoginAntwort { ok: true, totp_noetig: false, code: None });
            }
            if v.get("mfa_required").and_then(|b| b.as_bool()) == Some(true) {
                match v.get("method").and_then(|m| m.as_str()) {
                    Some("totp") => {
                        let code = totp.unwrap_or_default();
                        if code.trim().is_empty() {
                            return Ok(LoginAntwort { ok: false, totp_noetig: true, code: None });
                        }
                        let mfa_token = v
                            .get("mfa_token")
                            .and_then(|t| t.as_str())
                            .ok_or("server: mfa_token fehlt")?;
                        let r2 = client
                            .post(format!("{CLOUD_BASIS}/api/v1/auth/totp/verify"))
                            .bearer_auth(mfa_token)
                            .json(&serde_json::json!({ "code": code.trim() }))
                            .send()
                            .await
                            .map_err(|e| format!("offline: {e}"))?;
                        if r2.status().as_u16() == 401 {
                            return Ok(login_fehler("code_falsch", true));
                        }
                        let v2: serde_json::Value = r2.json().await.unwrap_or_default();
                        if let Some(token) = v2.get("token").and_then(|t| t.as_str()) {
                            speichere_sitzung(
                                &app,
                                &CloudSitzung { token: token.to_string(), email: email.trim().to_string() },
                            )?;
                            return Ok(LoginAntwort { ok: true, totp_noetig: false, code: None });
                        }
                        Ok(login_fehler("server", true))
                    }
                    Some("passkey") => Ok(login_fehler("passkey", false)),
                    _ => Ok(login_fehler("server", false)),
                }
            } else {
                Ok(login_fehler("server", false))
            }
        }
        401 => Ok(login_fehler("zugangsdaten", false)),
        403 => {
            let fehler = v
                .get("detail")
                .and_then(|d| d.get("error"))
                .and_then(|e| e.as_str())
                .unwrap_or("");
            match fehler {
                "email_not_verified" => Ok(login_fehler("email_bestaetigen", false)),
                "mfa_setup_required" => Ok(login_fehler("mfa_einrichten", false)),
                _ => Ok(login_fehler("server", false)),
            }
        }
        429 => Ok(login_fehler("warten", false)),
        _ => Ok(login_fehler("server", false)),
    }
}

#[derive(serde::Serialize)]
struct CloudLage {
    angemeldet: bool,
    email: Option<String>,
}

#[tauri::command]
fn cloud_status(app: tauri::AppHandle) -> CloudLage {
    match lade_sitzung(&app) {
        Some(s) => CloudLage { angemeldet: true, email: Some(s.email) },
        None => CloudLage { angemeldet: false, email: None },
    }
}

#[tauri::command]
fn cloud_logout(app: tauri::AppHandle) {
    loesche_sitzung(&app);
}

/// Holt die Aufgaben-Notiz. `None` = Notiz existiert noch nicht.
/// Fehlertexte sind Symbole: „abgemeldet“ (Sitzung weg/abgelaufen) oder
/// „offline: …“ / „server: …“ — die Oberfläche übersetzt.
#[tauri::command]
async fn todo_pull(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let s = lade_sitzung(&app).ok_or("abgemeldet")?;
    let client = http_client()?;
    let r = client
        .get(format!("{CLOUD_BASIS}/api/v1/files/download/{NOTIZ_PFAD}"))
        .bearer_auth(&s.token)
        .send()
        .await
        .map_err(|e| format!("offline: {e}"))?;
    match r.status().as_u16() {
        200 => Ok(Some(r.text().await.map_err(|e| format!("offline: {e}"))?)),
        404 => Ok(None),
        401 => {
            loesche_sitzung(&app);
            Err("abgemeldet".into())
        }
        s => Err(format!("server: {s}")),
    }
}

async fn notiz_hochladen(client: &reqwest::Client, token: &str, inhalt: &str) -> Result<u16, String> {
    let teil = reqwest::multipart::Part::bytes(inhalt.as_bytes().to_vec())
        .file_name("Niemand-Aufgaben.md")
        .mime_str("text/markdown")
        .map_err(|e| e.to_string())?;
    let form = reqwest::multipart::Form::new()
        .part("file", teil)
        .text("path", "workdir/notepad");
    let r = client
        .post(format!("{CLOUD_BASIS}/api/v1/files/upload"))
        .bearer_auth(token)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("offline: {e}"))?;
    Ok(r.status().as_u16())
}

/// Bringt den Zettel in die Cloud. Fehlt der notepad-Ordner noch (frischer
/// Container), wird er einmal angelegt und der Upload wiederholt.
#[tauri::command]
async fn todo_push(app: tauri::AppHandle, inhalt: String) -> Result<(), String> {
    if inhalt.len() > NOTIZ_MAX_BYTES {
        return Err("server: notiz zu groß".into());
    }
    let s = lade_sitzung(&app).ok_or("abgemeldet")?;
    let client = http_client()?;
    let mut status = notiz_hochladen(&client, &s.token, &inhalt).await?;
    if status == 401 {
        loesche_sitzung(&app);
        return Err("abgemeldet".into());
    }
    if !(200..300).contains(&status) {
        let _ = client
            .post(format!("{CLOUD_BASIS}/api/v1/files/create-folder"))
            .bearer_auth(&s.token)
            .json(&serde_json::json!({ "folder_name": "notepad", "path": "workdir" }))
            .send()
            .await;
        status = notiz_hochladen(&client, &s.token, &inhalt).await?;
    }
    match status {
        s if (200..300).contains(&s) => Ok(()),
        401 => {
            loesche_sitzung(&app);
            Err("abgemeldet".into())
        }
        s => Err(format!("server: {s}")),
    }
}

/// Öffnet eine Web-Adresse im Standard-Browser — NUR aus der festen
/// Ziel-Liste (Playbook-Regel), nie freie URLs.
#[tauri::command]
async fn open_url(target: String) -> Result<(), String> {
    let url = match target.as_str() {
        "cloud" => "https://cloud.smartragents.ai",
        "homepage" => "https://smartragents.ai",
        _ => return Err("unbekanntes Ziel".into()),
    };
    #[cfg(target_os = "linux")]
    let c: (&str, Vec<&str>) = ("xdg-open", vec![url]);
    #[cfg(target_os = "windows")]
    let c: (&str, Vec<&str>) = ("cmd", vec!["/C", "start", "", url]);
    #[cfg(target_os = "macos")]
    let c: (&str, Vec<&str>) = ("open", vec![url]);
    befehl(c.0).args(&c.1).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        // Zweiter Doppelklick aufs Icon erzeugt keinen zweiten Hasen,
        // sondern ruft den vorhandenen (Plan § 3: single-instance).
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
            }
            let _ = app.emit("niemand://rufen", ());
        }))
        .invoke_handler(tauri::generate_handler![
            quit_app,
            open_settings,
            check_online,
            check_printer,
            open_url,
            open_tool,
            cloud_login,
            cloud_status,
            cloud_logout,
            todo_pull,
            todo_push
        ])
        .setup(|app| {
            // Tray = Rettungsanker, falls der Hase mal außer Sicht ist (Plan § 3).
            let (t_rufen, t_ecke, t_schlafen, t_beenden, t_tooltip) = if tray_ist_deutsch() {
                (
                    "Niemand rufen",
                    "In die Ecke setzen",
                    "Schlafen legen",
                    "Beenden",
                    "Niemand — der weiße Hase",
                )
            } else {
                (
                    "Call Nobody",
                    "Put in the corner",
                    "Go to sleep",
                    "Quit",
                    "Nobody — the white rabbit",
                )
            };
            let rufen = MenuItem::with_id(app, "rufen", t_rufen, true, None::<&str>)?;
            let ecke = MenuItem::with_id(app, "ecke", t_ecke, true, None::<&str>)?;
            let schlafen = MenuItem::with_id(app, "schlafen", t_schlafen, true, None::<&str>)?;
            let beenden = MenuItem::with_id(app, "beenden", t_beenden, true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&rufen, &ecke, &schlafen, &beenden])?;

            TrayIconBuilder::with_id("niemand-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(true)
                .tooltip(t_tooltip)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "rufen" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                        let _ = app.emit("niemand://rufen", ());
                    }
                    "ecke" => {
                        let _ = app.emit("niemand://ecke", ());
                    }
                    "schlafen" => {
                        let _ = app.emit("niemand://schlafen", ());
                    }
                    "beenden" => app.exit(0),
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Fehler beim Start von Niemand");
}
