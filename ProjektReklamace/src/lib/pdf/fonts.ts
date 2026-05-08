import path from "node:path";
import { Font } from "@react-pdf/renderer";

const FONT_FAMILY = "Source Sans 3";
let registered = false;

export function ensureFontsRegistered() {
  if (registered) return FONT_FAMILY;
  const dir = path.join(process.cwd(), "src", "lib", "pdf", "fonts");
  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: path.join(dir, "SourceSans3-Regular.ttf"), fontWeight: 400 },
      { src: path.join(dir, "SourceSans3-Bold.ttf"), fontWeight: 700 },
      { src: path.join(dir, "SourceSans3-It.ttf"), fontWeight: 400, fontStyle: "italic" },
    ],
  });
  // Disable hyphenation; default heuristic breaks Czech words awkwardly.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
  return FONT_FAMILY;
}

export const PDF_FONT_FAMILY = FONT_FAMILY;
