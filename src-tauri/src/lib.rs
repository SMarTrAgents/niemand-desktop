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
        .invoke_handler(tauri::generate_handler![quit_app])
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
