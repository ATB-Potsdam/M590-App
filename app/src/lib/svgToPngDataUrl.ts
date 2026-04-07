// src/lib/svgToPngDataUrl.ts

/**
 * Render an emoji character to a PNG data URI using a canvas.
 * Useful for embedding emoji as images in react-pdf (which cannot render emoji via fonts).
 */
export const emojiToPngDataUrl = (emoji: string, sizePx = 32): string => {
    const canvas = document.createElement("canvas");
    canvas.width = sizePx;
    canvas.height = sizePx;
    const ctx = canvas.getContext("2d")!;
    ctx.font = `${sizePx * 0.8}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, sizePx / 2, sizePx / 2);
    return canvas.toDataURL("image/png");
};

/**
 * Fetch an SVG from a URL and rasterize it to a PNG data URI.
 * @react-pdf/renderer's <Image> does not support SVG directly.
 */
export const svgUrlToPngDataUrl = (svgUrl: string, targetHeightPx: number): Promise<string> =>
    fetch(svgUrl)
        .then(r => r.text())
        .then(svgText => {
            const blob = new Blob([svgText], {type: "image/svg+xml"});
            const objectUrl = URL.createObjectURL(blob);
            const img = new Image();
            return new Promise<string>((resolve, reject) => {
                img.onload = () => {
                    const ratio = img.naturalWidth / img.naturalHeight;
                    const canvas = document.createElement("canvas");
                    canvas.height = targetHeightPx * 2; // 2x for sharpness
                    canvas.width = Math.round(canvas.height * ratio);
                    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
                    URL.revokeObjectURL(objectUrl);
                    resolve(canvas.toDataURL("image/png"));
                };
                img.onerror = reject;
                img.src = objectUrl;
            });
        });
