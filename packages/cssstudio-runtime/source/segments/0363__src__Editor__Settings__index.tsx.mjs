// src/Editor/Settings/index.tsx
import { jsx as jsx19, jsxs as jsxs9 } from "react/jsx-runtime";
var SCHEMES = [
  {
    name: "indigo",
    color: "#7c6af6",
    accent: "#8df0cc",
    layer: "#1a1a28",
    black: "#141422",
    feintSolid: "#222236",
    feintText: "#8888a8",
    hc: { layer: "#12101e", black: "#100e1c", feintSolid: "#1c1a30", border: "rgba(255,255,255,0.12)", feintText: "#8888a0" },
    light: { layer: "#f4f4f8", black: "#ffffff", feintSolid: "#e4e4ec", feintText: "#707088", accent: "#7c6af6" }
  },
  {
    name: "emerald",
    color: "#10b981",
    accent: "#f0a08d",
    layer: "#142420",
    black: "#101e1a",
    feintSolid: "#1c302a",
    feintText: "#6a9a88",
    hc: { layer: "#0c1812", black: "#0a1410", feintSolid: "#142420", border: "rgba(255,255,255,0.12)", feintText: "#7a9a8c" },
    light: { layer: "#f2f8f6", black: "#ffffff", feintSolid: "#dceee8", feintText: "#4a7a68", accent: "#10b981" }
  },
  {
    name: "rose",
    color: "#fb7185",
    accent: "#5eead4",
    layer: "#241420",
    black: "#1e101a",
    feintSolid: "#301c28",
    feintText: "#9a6a78",
    hc: { layer: "#160c10", black: "#140a0e", feintSolid: "#261820", border: "rgba(255,255,255,0.12)", feintText: "#9a7a88" },
    light: { layer: "#f8f2f6", black: "#ffffff", feintSolid: "#eedce8", feintText: "#8a5a72", accent: "#fb7185" }
  },
  {
    name: "amber",
    color: "#f59e0b",
    accent: "#a78bfa",
    layer: "#242014",
    black: "#1e1a10",
    feintSolid: "#302a1c",
    feintText: "#9a8a60",
    hc: { layer: "#16120a", black: "#141008", feintSolid: "#242010", border: "rgba(255,255,255,0.12)", feintText: "#9a9278" },
    light: { layer: "#f8f6f0", black: "#ffffff", feintSolid: "#eee8d8", feintText: "#7a6a40", accent: "#f59e0b" }
  },
  {
    name: "ocean",
    color: "#38bdf8",
    accent: "#f97066",
    layer: "#142030",
    black: "#101a28",
    feintSolid: "#1c2838",
    feintText: "#6a88a0",
    hc: { layer: "#0a1220", black: "#081018", feintSolid: "#102030", border: "rgba(255,255,255,0.12)", feintText: "#6a8aa0" },
    light: { layer: "#f0f4f8", black: "#ffffff", feintSolid: "#dce4ee", feintText: "#5a7088", accent: "#38bdf8" }
  }
];
var STORAGE_KEY = "cssstudio-settings";
var DEFAULT_SETTINGS = { scheme: "indigo", highContrast: false, autoApply: false, appearance: "auto" };
function setDefaultSettings(overrides) {
  DEFAULT_SETTINGS = { ...DEFAULT_SETTINGS, ...overrides };
}
function resolveMode(appearance) {
  if (appearance !== "auto") return appearance;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function applyToDOM(settings) {
  const host = document.querySelector("css-studio-panel");
  if (!host) return;
  const scheme = SCHEMES.find((s) => s.name === settings.scheme) ?? SCHEMES[0];
  const hc = settings.highContrast;
  const mode = resolveMode(settings.appearance);
  const isLight = mode === "light";
  if (isLight) {
    host.style.setProperty("--cs-accent", scheme.light.accent);
    host.style.setProperty("--cs-layer", scheme.light.layer);
    host.style.setProperty("--cs-black", scheme.light.black);
    host.style.setProperty("--cs-feint-solid", scheme.light.feintSolid);
    host.style.setProperty("--cs-feint-text", scheme.light.feintText);
  } else {
    host.style.setProperty("--cs-accent", scheme.accent);
    host.style.setProperty("--cs-layer", hc ? scheme.hc.layer : scheme.layer);
    host.style.setProperty("--cs-black", hc ? scheme.hc.black : scheme.black);
    host.style.setProperty("--cs-feint-solid", hc ? scheme.hc.feintSolid : scheme.feintSolid);
    host.style.setProperty("--cs-feint-text", hc ? scheme.hc.feintText : scheme.feintText);
  }
  const fg = isLight ? "#1a1a2e" : "#fff";
  host.style.setProperty("--cs-foreground", fg);
  host.style.setProperty("--cs-white", fg);
  host.style.setProperty("--cs-on-accent", isLight ? "#fff" : "#000");
  host.style.setProperty("--cs-red", isLight ? "#dc2626" : "#ff1231");
  host.style.setProperty("--cs-feint", isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)");
  host.style.setProperty("--cs-border", isLight ? hc ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.10)" : hc ? scheme.hc.border : "rgba(255,255,255,0.10)");
  host.style.setProperty("--cs-label-text", isLight ? hc ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.55)" : hc ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.6)");
  host.style.setProperty("--cs-input-bg", isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)");
  host.style.setProperty("--cs-input-bg-hover", isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)");
  host.style.setProperty("--cs-input-border", isLight ? hc ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.08)");
  host.style.setProperty("--cs-input-border-strong", isLight ? hc ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.15)");
  host.style.setProperty("--cs-icon-muted", isLight ? hc ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.3)" : hc ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)");
  host.style.setProperty("--cs-icon-muted-hover", isLight ? hc ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.8)");
  host.style.setProperty("--cs-secondary-text", isLight ? hc ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.5)");
  host.style.setProperty("--cs-secondary-text-hover", isLight ? hc ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.7)");
  host.style.setProperty("--cs-checker", isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.15)");
  host.style.setProperty("--cs-select-chevron", isLight ? `url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 8 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 3L4 5.5L6 3' stroke='rgba(0,0,0,0.4)' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")` : `url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 8 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 3L4 5.5L6 3' stroke='rgba(255,255,255,0.5)' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`);
  const feintText = isLight ? scheme.light.feintText : hc ? scheme.hc.feintText : scheme.feintText;
  const accent = isLight ? scheme.light.accent : scheme.accent;
  host.style.setProperty("--cs-dark-text", `color-mix(in srgb, ${fg} 70%, ${feintText})`);
  host.style.setProperty("--cs-selected-tree-bg", `color-mix(in srgb, ${accent} 8%, transparent)`);
  host.style.setProperty("color-scheme", mode);
}
function pushThemeToPage(settings) {
  const scheme = SCHEMES.find((s) => s.name === settings.scheme) ?? SCHEMES[0];
  const hc = settings.highContrast;
  const mode = resolveMode(settings.appearance);
  const isLight = mode === "light";
  syncThemeToPage({
    layer: isLight ? scheme.light.layer : hc ? scheme.hc.layer : scheme.layer,
    black: isLight ? scheme.light.black : hc ? scheme.hc.black : scheme.black,
    accent: isLight ? scheme.light.accent : scheme.accent,
    border: isLight ? hc ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.10)" : hc ? scheme.hc.border : "rgba(255,255,255,0.10)",
    white: isLight ? "#1a1a2e" : "#fff",
    feintText: isLight ? scheme.light.feintText : hc ? scheme.hc.feintText : scheme.feintText,
    foreground: isLight ? "#1a1a2e" : "#fff",
    feint: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)"
  });
}
function persist(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
  }
}
var APPEARANCES = ["auto", "dark", "light"];
function Settings() {
  const [open, setOpen] = useState4(false);
  const [settings, setSettings] = useState4(DEFAULT_SETTINGS);
  const buttonRef = useRef16(null);
  const mcpStatus = useStore2((s) => s.mcpStatus);
  useEffect16(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      const s = saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS;
      setSettings(s);
      applyToDOM(s);
      pushThemeToPage(s);
      useStore2.getState().setAutoApply(s.autoApply);
    } catch {
      applyToDOM(DEFAULT_SETTINGS);
    }
  }, []);
  useEffect16(() => {
    if (settings.appearance !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      applyToDOM(settings);
      pushThemeToPage(settings);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [settings]);
  const update = useCallback11((partial) => {
    setSettings((prev) => {
      const next2 = { ...prev, ...partial };
      persist(next2);
      applyToDOM(next2);
      if ("scheme" in partial || "highContrast" in partial || "appearance" in partial) {
        pushThemeToPage(next2);
      }
      if ("autoApply" in partial) {
        useStore2.getState().setAutoApply(next2.autoApply);
      }
      return next2;
    });
  }, []);
  const handleSchemeChange = useCallback11(
    (scheme) => {
      if (scheme === settings.scheme) return;
      animateView(() => update({ scheme })).exit({ opacity: 0 }, { duration: 0.15 }).enter({ opacity: 1 }, { duration: 0.25, delay: 0.1 });
    },
    [settings.scheme, update]
  );
  return /* @__PURE__ */ jsxs9("span", { ref: buttonRef, className: Settings_default.container, children: [
    /* @__PURE__ */ jsx19(IconButton, { active: open, onClick: () => setOpen((v) => !v), title: "Settings", children: /* @__PURE__ */ jsxs9(
      "svg",
      {
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        width: "14",
        height: "14",
        children: [
          /* @__PURE__ */ jsx19("path", { d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" }),
          /* @__PURE__ */ jsx19("circle", { cx: "12", cy: "12", r: "3" })
        ]
      }
    ) }),
    /* @__PURE__ */ jsxs9(Dropdown, { open, onClose: () => setOpen(false), anchorRef: buttonRef, children: [
      /* @__PURE__ */ jsxs9("div", { className: Settings_default.row, children: [
        /* @__PURE__ */ jsx19("span", { className: Settings_default.label, children: "Theme" }),
        /* @__PURE__ */ jsx19("div", { className: Settings_default.swatches, children: SCHEMES.map((s) => /* @__PURE__ */ jsx19(
          "button",
          {
            className: `${Settings_default.swatch} ${settings.scheme === s.name ? Settings_default.activeSwatch : ""}`,
            style: { background: s.color },
            onClick: () => handleSchemeChange(s.name),
            title: s.name
          },
          s.name
        )) })
      ] }),
      /* @__PURE__ */ jsxs9("div", { className: Settings_default.row, children: [
        /* @__PURE__ */ jsx19("span", { className: Settings_default.label, children: "Appearance" }),
        /* @__PURE__ */ jsx19("div", { className: Settings_default.modeButtons, children: APPEARANCES.map((mode) => /* @__PURE__ */ jsx19(
          "button",
          {
            className: `${Settings_default.modeButton} ${settings.appearance === mode ? Settings_default.modeButtonActive : ""}`,
            onClick: () => {
              if (mode === settings.appearance) return;
              animateView(() => update({ appearance: mode })).exit({ opacity: 0 }, { duration: 0.15 }).enter({ opacity: 1 }, { duration: 0.25, delay: 0.1 });
            },
            children: mode[0].toUpperCase() + mode.slice(1)
          },
          mode
        )) })
      ] }),
      /* @__PURE__ */ jsxs9("div", { className: Settings_default.row, children: [
        /* @__PURE__ */ jsx19("span", { className: Settings_default.label, children: "High contrast" }),
        /* @__PURE__ */ jsx19(
          Toggle,
          {
            value: settings.highContrast,
            onChange: (v) => update({ highContrast: v })
          }
        )
      ] }),
      mcpStatus === "connected" && /* @__PURE__ */ jsxs9("div", { className: Settings_default.row, children: [
        /* @__PURE__ */ jsx19("span", { className: Settings_default.label, children: "Auto apply" }),
        /* @__PURE__ */ jsx19(
          Toggle,
          {
            value: settings.autoApply,
            onChange: (v) => update({ autoApply: v })
          }
        )
      ] })
    ] })
  ] });
}

