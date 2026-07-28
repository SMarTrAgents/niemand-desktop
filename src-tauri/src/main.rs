// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Ein Desktop-Tierchen braucht Selbst-Positionierung, Always-on-top und
    // Transparenz — natives Wayland (GNOME/Mutter) kann davon nichts, XWayland
    // alles. Daher auf Linux hart aufs X11-Backend, solange niemand es
    // ausdrücklich überschreibt (Plan-Niemand-Desktop § 3).
    #[cfg(target_os = "linux")]
    {
        if std::env::var("GDK_BACKEND").is_err() {
            std::env::set_var("GDK_BACKEND", "x11");
        }
    }
    niemand_desktop_lib::run()
}
