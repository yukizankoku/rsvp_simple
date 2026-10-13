import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";

const SIZE = 640;
// The logo covers the middle of the code. Level H restores up to 30% damage, so 22% of the width
// (about 5% of the area) leaves plenty of margin for a bent or dimly lit phone screen.
const LOGO = Math.round(SIZE * 0.22);
const LOGO_PAD = 8;

let logo: Promise<Buffer> | null = null;

function loadLogo() {
  logo ??= readFile(path.join(process.cwd(), "src/assets/qr-logo.png")).then((file) =>
    sharp(file)
      .resize(LOGO, LOGO, { fit: "contain", background: "#ffffff" })
      // White frame so the logo doesn't touch the QR modules.
      .extend({ top: LOGO_PAD, bottom: LOGO_PAD, left: LOGO_PAD, right: LOGO_PAD, background: "#ffffff" })
      .png()
      .toBuffer(),
  );
  return logo;
}

/** PNG of the QR code with the BUMITEC logo in the middle. The QR only contains the random token. */
export async function qrPng(token: string): Promise<Buffer> {
  const [code, mark] = await Promise.all([
    QRCode.toBuffer(token, { margin: 2, width: SIZE, errorCorrectionLevel: "H" }),
    loadLogo(),
  ]);
  return sharp(code).composite([{ input: mark, gravity: "center" }]).png().toBuffer();
}
