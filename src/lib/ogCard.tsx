import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

const PAPER = "#e8e6e1";
const INK = "#14140f";
const INK_SOFT = "#6b6a63";
const RULE = "#c9c6bf";

const asset = (name: string) => readFile(path.join(process.cwd(), "src", "assets", name));

/**
 * The boots mark as halftone squares - the same treatment every image on the
 * site gets. Drawn straight from the icon with a plain threshold curve: the
 * page's equalisation is for photographs, and would turn the mark's flat
 * white ground into noise.
 */
async function markSvg(cols: number): Promise<string> {
  const { data } = await sharp(path.join(process.cwd(), "src", "app", "icon.png"))
    .flatten({ background: "#ffffff" })
    .greyscale()
    .resize(cols, cols, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rects: string[] = [];
  for (let y = 0; y < cols; y++) {
    for (let x = 0; x < cols; x++) {
      const d = 1 - data[y * cols + x] / 255;
      if (d < 0.07) continue;
      const side = Math.sqrt(d) * 0.98;
      const off = (1 - side) / 2;
      rects.push(`<rect x="${(x + off).toFixed(2)}" y="${(y + off).toFixed(2)}" width="${side.toFixed(2)}" height="${side.toFixed(2)}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols} ${cols}" fill="${INK}">${rects.join("")}</svg>`;
}

/**
 * The card shown when a link is shared. `title` puts a post's name in place
 * of the tagline; the masthead stays either way so it reads as this site.
 */
export async function ogCard({ title, kicker }: { title?: string; kicker?: string } = {}) {
  const [regular, medium, svg] = await Promise.all([
    asset("IBMPlexMono-Regular.ttf"),
    asset("IBMPlexMono-Medium.ttf"),
    markSvg(30),
  ]);
  const mark = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: PAPER,
          color: INK,
          fontFamily: "Plex Mono",
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 20, letterSpacing: 5, color: INK_SOFT }}>{kicker ?? "an insight"}</div>
            <div
              style={{
                marginTop: 28,
                fontSize: title ? 56 : 80,
                fontWeight: 500,
                letterSpacing: title ? -2 : -4,
                lineHeight: 1.08,
                maxWidth: 620,
              }}
            >
              {title ?? "wasserstiefel"}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              borderTop: `1px solid ${RULE}`,
              paddingTop: 22,
              fontSize: 17,
              letterSpacing: 2,
              color: INK_SOFT,
            }}
          >
            {title ? "wasserstiefel" : "films · games · series · books · music · writing"}
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mark} width={300} height={300} alt="" style={{ alignSelf: "center", marginLeft: 64 }} />
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Plex Mono", data: regular, weight: 400, style: "normal" },
        { name: "Plex Mono", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
