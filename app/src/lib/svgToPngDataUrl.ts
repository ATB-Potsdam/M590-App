// src/lib/svgToPngDataUrl.ts

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
