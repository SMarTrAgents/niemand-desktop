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
        .invoke_handler(tauri::generate_handler![quit_app, open_settings])
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
