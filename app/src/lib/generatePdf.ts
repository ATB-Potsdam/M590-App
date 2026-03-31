// src/lib/generatePdf.ts
import html2canvas from "html2canvas";
import {jsPDF} from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 10;

/** Rasterize an SVG <img> to a PNG data URL (html2canvas can't handle SVGs well). */
const svgToPngDataUrl = (img: HTMLImageElement, targetHeight: number): string => {
    const canvas = document.createElement("canvas");
    const ratio = img.naturalWidth / img.naturalHeight;
    canvas.height = targetHeight * 2; // 2x for sharpness
    canvas.width = Math.round(canvas.height * ratio);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
};

/** Pre-rasterize SVG logos from the *original* (loaded) element. */
const rasterizeLogos = (original: HTMLElement): Map<string, string> => {
    const map = new Map<string, string>();
    original.querySelectorAll<HTMLImageElement>(".project-summary__print-logos img").forEach((img) => {
        if (img.src.endsWith(".svg") && img.naturalWidth > 0) {
            map.set(img.src, svgToPngDataUrl(img, 32));
        }
    });
    return map;
};

/** Apply the print-media styles inline on the clone so html2canvas renders them. */
const preparePrintHeader = (clone: HTMLElement, logoMap: Map<string, string>) => {
    const printHeader = clone.querySelector<HTMLElement>(".project-summary__print-header");
    if (!printHeader) return;

    printHeader.style.display = "block";
    printHeader.style.padding = "14px";
    printHeader.style.borderBottom = "1px solid #ccc";

    const logos = printHeader.querySelector<HTMLElement>(".project-summary__print-logos");
    if (logos) {
        logos.style.display = "flex";
        logos.style.alignItems = "center";
        logos.style.justifyContent = "space-between";
        logos.style.marginBottom = "12px";

        logos.querySelectorAll("img").forEach((img) => {
            const png = logoMap.get(img.src);
            if (png) img.src = png;
            img.style.height = "32px";
            img.style.width = "auto";
        });
    }

    const title = printHeader.querySelector<HTMLElement>(".project-summary__print-title");
    if (title) {
        title.style.fontSize = "14px";
        title.style.fontWeight = "600";
        title.style.color = "#333";
    }

    const h1 = printHeader.querySelector<HTMLElement>("h1");
    if (h1) {
        h1.style.margin = "0 0 4px";
        h1.style.fontSize = "18px";
    }

    const p = printHeader.querySelector<HTMLElement>("p");
    if (p) {
        p.style.margin = "0";
        p.style.fontSize = "13px";
        p.style.color = "#666";
    }
};

/**
 * Clone the element offscreen, force print-header visible & details open,
 * then capture as a multi-page A4 PDF.
 */
export const generateSummaryPdf = async (element: HTMLElement, filename: string): Promise<File> => {
    // Pre-rasterize SVG logos from the original (where images are loaded)
    const logoMap = rasterizeLogos(element);

    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.position = "absolute";
    clone.style.left = "-9999px";
    clone.style.top = "0";
    clone.style.width = `${element.offsetWidth}px`;
    clone.style.background = "white";
    document.body.appendChild(clone);

    // Match print CSS: remove border/shadow from summary section
    clone.style.border = "none";
    clone.style.boxShadow = "none";
    clone.style.borderRadius = "0";

    preparePrintHeader(clone, logoMap);
    clone.querySelectorAll<HTMLDetailsElement>("details").forEach((d) => {
        d.open = true;
        const summary = d.querySelector("summary");
        if (summary) summary.style.display = "none";
    });
    const printBtn = clone.querySelector<HTMLElement>(".project-summary__print-btn");
    if (printBtn) printBtn.style.display = "none";

    // Hide the screen-only <h2>Zusammenfassung</h2> (print CSS hides it too)
    const h2 = clone.querySelector<HTMLElement>(":scope > h2");
    if (h2) h2.style.display = "none";

    try {
        const canvas = await html2canvas(clone, {
            scale: 2,
            useCORS: true,
            logging: false,
        });

        const contentWidthMm = A4_WIDTH_MM - 2 * MARGIN_MM;
        const pxPerMm = canvas.width / contentWidthMm;
        const contentHeightMm = canvas.height / pxPerMm;
        const pageContentHeight = A4_HEIGHT_MM - 2 * MARGIN_MM;

        const pdf = new jsPDF("p", "mm", "a4");

        let remainingHeight = contentHeightMm;
        let sourceY = 0;
        let page = 0;

        while (remainingHeight > 0) {
            if (page > 0) pdf.addPage();

            const sliceHeightMm = Math.min(remainingHeight, pageContentHeight);
            const sliceHeightPx = sliceHeightMm * pxPerMm;

            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sliceHeightPx;
            const ctx = sliceCanvas.getContext("2d")!;
            ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

            const imgData = sliceCanvas.toDataURL("image/png");
            pdf.addImage(imgData, "PNG", MARGIN_MM, MARGIN_MM, contentWidthMm, sliceHeightMm);

            sourceY += sliceHeightPx;
            remainingHeight -= sliceHeightMm;
            page++;
        }

        const blob = pdf.output("blob");
        return new File([blob], filename, {type: "application/pdf"});
    } finally {
        document.body.removeChild(clone);
    }
};

/** Share via Web Share API on native apps, open in new tab on desktop browsers. */
export const sharePdf = async (file: File): Promise<"shared" | "opened"> => {
    if (navigator.canShare?.({files: [file]})) {
        await navigator.share({files: [file]});
        return "shared";
    }
    // Desktop: open PDF in a new browser tab
    const url = URL.createObjectURL(file);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return "opened";
};
