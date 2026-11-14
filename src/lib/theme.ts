// AstraX neutral theme, imported directly instead of through the generated src/astryx-themes.ts.
// That generated module also imports the theme's fonts.css, which @imports Figtree from
// fonts.googleapis.com: a third-party request that would disclose every visitor's IP to Google.
// To use a webfont, self-host it (e.g. next/font) rather than re-adding that import.
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import "@astryxdesign/theme-neutral/theme.css";

export { neutralTheme };
