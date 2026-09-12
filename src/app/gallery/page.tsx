import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { GalleryViewer, type GalleryPicture } from "@/components/GalleryViewer";
import { ReelTile } from "@/components/ReelTile";
import { HalftoneImage } from "@/components/Halftone";
import { getGalleryImages, getReels } from "@/lib/gallery";
import { imageSize } from "@/lib/imageSource";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "wasserstiefel — gallery",
  description: "Images and reels worth keeping.",
};

const TAB = "cursor-pointer border-b border-transparent pb-1 text-[10px] tracking-[0.2em] text-ink-soft transition-colors hover:text-ink";

export default async function GalleryPage() {
  const [images, reels] = await Promise.all([getGalleryImages(), getReels()]);

  // Proportions are measured here so the columns can hold each picture's place
  // before it loads.
  const pictures: GalleryPicture[] =
    images.status === "ok"
      ? await Promise.all(
          images.items.map(async (g) => {
            const size = await imageSize(g.src);
            return { ...g, width: size?.width ?? null, height: size?.height ?? null };
          }),
        )
      : [];

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-10 sm:py-24">
      <SiteHeader active="gallery" />

      <div className="flex flex-wrap items-center gap-x-7">
        <input type="radio" name="gallery-tab" id="gallery-images" defaultChecked className="peer/images sr-only" />
        <input type="radio" name="gallery-tab" id="gallery-reels" className="peer/reels sr-only" />

        <label htmlFor="gallery-images" className={`${TAB} peer-checked/images:border-ink peer-checked/images:text-ink`}>
          images
        </label>
        <label htmlFor="gallery-reels" className={`${TAB} peer-checked/reels:border-ink peer-checked/reels:text-ink`}>
          reels
        </label>

        <div className="mt-10 hidden w-full peer-checked/images:block">
          {pictures.length > 0 ? (
            <GalleryViewer pictures={pictures} />
          ) : (
            <p className="text-[11px] text-ink-soft">nothing here yet — add images from /admin</p>
          )}
        </div>

        <div className="mt-10 hidden w-full peer-checked/reels:block">
          {reels.status === "ok" && reels.items.length > 0 ? (
            <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {reels.items.map((r, i) => (
                <li key={r.shortcode}>
                  <ReelTile
                    shortcode={r.shortcode}
                    note={r.note}
                    index={i}
                    poster={
                      r.thumb ? (
                        <HalftoneImage
                          src={r.thumb}
                          cols={30}
                          rows="auto"
                          label={r.note ?? "reel still"}
                          className="h-full w-full text-ink"
                          preserveAspectRatio="xMidYMid slice"
                        />
                      ) : null
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-ink-soft">nothing here yet — add reels from /admin</p>
          )}
        </div>
      </div>
    </main>
  );
}
