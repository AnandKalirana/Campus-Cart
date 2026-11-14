// AstraX neutral theme, imported directly instead of through the generated src/astryx-themes.ts.
// That generated module also imports the theme's fonts.css, which @imports Figtree from
// fonts.googleapis.com: a third-party request that would disclose every visitor's IP to Google.
// Space Grotesk (body) and Archivo Black (display) are self-hosted via Fontsource (OFL-1.1): files are served from our own origin, no third-party request.
// wght.css declares one variable-font face per unicode-range subset; browsers fetch only the subsets a page uses.
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import "@astryxdesign/theme-neutral/theme.css";
import "@fontsource-variable/space-grotesk/wght.css";
import "@fontsource/archivo-black/latin-400.css";
import "@fontsource/archivo-black/latin-ext-400.css";

export { neutralTheme };
