# Graphite component system

Follow the root instructions and [DESIGN.md](../../../DESIGN.md).

- `theme/tokens.css` owns semantic values; keep registry styles scoped to
  `workspace-theme`. `materials/chrome.tsx` is a client island; hook-free record
  primitives remain usable on the server. Components accept presentation data,
  never database services or provider clients.
- Use native form recipes for static submits. The default glass Button is a
  non-native action control; only solid/native variants can submit forms.
- Read [component acquisition](../../../docs/design-system/README.md) before adding
  a primitive; preserve its license, source hash and scoped tokens.
- Preserve reduced-motion/transparency/high-contrast fallbacks on future portal
  roots as well as descendants; do not hide focus indicators beneath glass layers.
