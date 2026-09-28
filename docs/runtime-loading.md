# EFC runtime loading

The browser preview and the Windows/Tauri build must load the same production redesign modules in the same order.

All post-license UI modules are owned by `assets/production-license-gate-v8.js` and are loaded only after the license/runtime dependency chain is ready. `index.html` must not load those redesign modules independently, because on Windows an unactivated first start can otherwise let their startup wait expire before the licensed runtime begins.

This keeps GitHub Pages and the Windows installer on the same UI runtime.
