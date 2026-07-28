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
            open_url
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
