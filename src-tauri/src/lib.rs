use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager,
};

/// Sauberes Beenden aus der Oberfläche (Sprechblasen-Knopf).
#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

/// Öffnet eine System-Einstellungsseite per Deep-Link — NUR aus der festen
/// Ziel-Liste, nie aus freien Strings (Playbook-Regel, Plan § 8.4). Wird
/// ausschließlich durch einen Nutzer-Klick auf eine AUFTRAG-Karte ausgelöst.
#[tauri::command]
fn open_settings(panel: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    let cmd: Vec<&str> = match panel.as_str() {
        "sound" => vec!["gnome-control-center", "sound"],
        "wifi" => vec!["gnome-control-center", "wifi"],
        "printers" => vec!["gnome-control-center", "printers"],
        "system" => vec!["gnome-control-center"],
        _ => return Err("unbekanntes Ziel".into()),
    };
    #[cfg(target_os = "windows")]
    let cmd: Vec<&str> = match panel.as_str() {
        "sound" => vec!["cmd", "/C", "start", "ms-settings:sound"],
        "wifi" => vec!["cmd", "/C", "start", "ms-settings:network-wifi"],
        "printers" => vec!["cmd", "/C", "start", "ms-settings:printers"],
        "system" => vec!["cmd", "/C", "start", "ms-settings:"],
        _ => return Err("unbekanntes Ziel".into()),
    };
    #[cfg(target_os = "macos")]
    let cmd: Vec<&str> = match panel.as_str() {
        "sound" => vec!["open", "x-apple.systempreferences:com.apple.Sound-Settings.extension"],
        "wifi" => vec!["open", "x-apple.systempreferences:com.apple.wifi-settings-extension"],
        "printers" => vec!["open", "x-apple.systempreferences:com.apple.Print-Scan-Settings.extension"],
        "system" => vec!["open", "x-apple.systempreferences:"],
        _ => return Err("unbekanntes Ziel".into()),
    };
    std::process::Command::new(cmd[0])
        .args(&cmd[1..])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Internet da? App-eigene Wahrheit: kommen wir zu unserer Cloud durch?
/// (Plan § 4: Konnektivität statt SSID — keine Location-Berechtigung nötig.)
#[tauri::command]
fn check_online() -> bool {
    use std::net::{TcpStream, ToSocketAddrs};
    use std::time::Duration;
    if let Ok(mut addrs) = "cloud.smartragents.ai:443".to_socket_addrs() {
        if let Some(addr) = addrs.next() {
            return TcpStream::connect_timeout(&addr, Duration::from_secs(3)).is_ok();
        }
    }
    false
}

/// Eingerichtete Drucker auflisten — ohne Adminrechte, ohne Prompts
/// (lpstat auf Linux/macOS, Get-Printer auf Windows; Plan § 4 Akt 1.4).
#[tauri::command]
fn check_printer() -> Result<Vec<String>, String> {
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        let out = std::process::Command::new("lpstat")
            .arg("-p")
            .output()
            .map_err(|e| e.to_string())?;
        let s = String::from_utf8_lossy(&out.stdout);
        // lpstat spricht je nach Systemsprache "printer X …" oder "Drucker X …"
        Ok(s
            .lines()
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
        let out = std::process::Command::new("powershell")
            .args(["-NoProfile", "-Command", "(Get-Printer).Name"])
            .output()
            .map_err(|e| e.to_string())?;
        let s = String::from_utf8_lossy(&out.stdout);
        Ok(s.lines()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .collect())
    }
}

/// Öffnet eine Web-Adresse im Standard-Browser — NUR aus der festen
/// Ziel-Liste (Playbook-Regel), nie freie URLs.
#[tauri::command]
fn open_url(target: String) -> Result<(), String> {
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
    std::process::Command::new(c.0)
        .args(&c.1)
        .spawn()
        .map_err(|e| e.to_string())?;
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
            let rufen = MenuItem::with_id(app, "rufen", "Niemand rufen", true, None::<&str>)?;
            let schlafen = MenuItem::with_id(app, "schlafen", "Schlafen legen", true, None::<&str>)?;
            let beenden = MenuItem::with_id(app, "beenden", "Beenden", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&rufen, &schlafen, &beenden])?;

            TrayIconBuilder::with_id("niemand-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(true)
                .tooltip("Niemand — der weiße Hase")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "rufen" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                        let _ = app.emit("niemand://rufen", ());
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
