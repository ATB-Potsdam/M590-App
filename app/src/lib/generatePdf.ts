// src/lib/generatePdf.ts
import html2canvas from "html2canvas";
import {jsPDF} from "jspdf";
import {isNative, nativeShareFile} from "./nativeShare";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 10;
const FOOTER_HEIGHT_MM = 8;

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
            map.set(img.src, svgToPngDataUrl(img, 48));
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
            img.style.height = "44px";
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
 * Push an element to the start of the next page by inserting a spacer before it.
 * @param bodyHeightPx — the usable body content height per page in pixels
 */
const forcePageBreakBefore = (clone: HTMLElement, selector: string, bodyHeightPx: number) => {
    const el = clone.querySelector<HTMLElement>(selector);
    if (!el) return;

    const cloneRect = clone.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const elTop = elRect.top - cloneRect.top;

    const currentPage = Math.floor(elTop / bodyHeightPx);
    const nextPageTop = (currentPage + 1) * bodyHeightPx;
    const padNeeded = nextPageTop - elTop;

    if (padNeeded > 0 && padNeeded < bodyHeightPx) {
        const spacer = document.createElement("div");
        spacer.style.height = `${padNeeded}px`;
        el.parentElement!.insertBefore(spacer, el);
    }
};

/**
 * Prevent page breaks inside `.print-detail` blocks.
 * @param bodyHeightPx — the usable body content height per page in pixels
 */
const avoidPageBreaks = (clone: HTMLElement, bodyHeightPx: number) => {
    const blocks = clone.querySelectorAll<HTMLElement>(".print-detail");

    // Re-measure after each adjustment since added margins shift subsequent blocks
    for (const block of blocks) {
        const cloneRect = clone.getBoundingClientRect();
        const blockRect = block.getBoundingClientRect();
        const blockTop = blockRect.top - cloneRect.top;
        const blockBottom = blockTop + blockRect.height;

        const pageStart = Math.floor(blockTop / bodyHeightPx);
        const pageEnd = Math.floor((blockBottom - 1) / bodyHeightPx);

        if (pageEnd > pageStart && blockRect.height < bodyHeightPx * 0.95) {
            const nextPageTop = (pageStart + 1) * bodyHeightPx;
            const padNeeded = nextPageTop - blockTop;
            const spacer = document.createElement("div");
            spacer.style.height = `${padNeeded + 4}px`;
            block.parentElement!.insertBefore(spacer, block);
        }
    }
};

/**
 * Capture the print header as a separate canvas image for repeating on each page.
 */
const captureHeader = async (clone: HTMLElement): Promise<{canvas: HTMLCanvasElement; heightMm: number} | null> => {
    const printHeader = clone.querySelector<HTMLElement>(".project-summary__print-header");
    if (!printHeader) return null;

    const contentWidthMm = A4_WIDTH_MM - 2 * MARGIN_MM;
    const pxPerMm = clone.offsetWidth / contentWidthMm;
    const headerHeightMm = printHeader.offsetHeight / pxPerMm;

    const headerCanvas = await html2canvas(printHeader, {
        scale: 1.5,
        useCORS: true,
        logging: false,
    });

    return {canvas: headerCanvas, heightMm: headerHeightMm};
};

/**
 * Clone the element offscreen, force print-header visible & details open,
 * then capture as a multi-page A4 PDF with repeated header and page numbers.
 */
export const generateSummaryPdf = async (element: HTMLElement, filename: string): Promise<File> => {
    // Pre-rasterize SVG logos from the original (where images are loaded)
    const logoMap = rasterizeLogos(element);

    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.position = "absolute";
    clone.style.left = "-9999px";
    clone.style.top = "0";
    clone.style.width = `${Math.max(element.offsetWidth, 800)}px`;
    clone.style.background = "white";
    document.body.appendChild(clone);

    // Match print CSS: remove border/shadow from summary section
    clone.style.border = "none";
    clone.style.boxShadow = "none";
    clone.style.borderRadius = "0";

    preparePrintHeader(clone, logoMap);

    // Remove scroll shadow hints from table wrapper (not needed in PDF)
    const tableWrap = clone.querySelector<HTMLElement>(".project-summary__table-wrap");
    if (tableWrap) tableWrap.style.background = "none";

    // Show print-only detail blocks
    const printDetails = clone.querySelector<HTMLElement>(".project-summary__print-details");
    if (printDetails) printDetails.style.display = "block";

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

    // Capture the header before hiding it
    const header = await captureHeader(clone);

    // Hide header from the main content (it will be drawn separately on each page)
    const printHeader = clone.querySelector<HTMLElement>(".project-summary__print-header");
    if (printHeader) printHeader.style.display = "none";

    // Compute body height per page in pixels (for page-break spacing)
    const contentWidthMm = A4_WIDTH_MM - 2 * MARGIN_MM;
    const pxPerMm = clone.offsetWidth / contentWidthMm;
    const headerMm = header ? header.heightMm + 2 : 0;
    const pageFullHeight = A4_HEIGHT_MM - 2 * MARGIN_MM;
    const bodyHeightPerPageMm = pageFullHeight - headerMm - FOOTER_HEIGHT_MM;
    const bodyHeightPerPagePx = bodyHeightPerPageMm * pxPerMm;

    // Force field detail blocks to start on a new page
    forcePageBreakBefore(clone, ".project-summary__print-details", bodyHeightPerPagePx);

    // Avoid page breaks through detail blocks
    avoidPageBreaks(clone, bodyHeightPerPagePx);

    try {
        const canvas = await html2canvas(clone, {
            scale: 1.5,
            useCORS: true,
            logging: false,
        });

        const capturePxPerMm = canvas.width / contentWidthMm;
        const contentHeightMm = canvas.height / capturePxPerMm;

        const pdf = new jsPDF("p", "mm", "a4");

        // Count total pages
        let totalPages = Math.ceil(contentHeightMm / bodyHeightPerPageMm);
        if (totalPages < 1) totalPages = 1;

        let remainingHeight = contentHeightMm;
        let sourceY = 0;
        let page = 0;

        while (remainingHeight > 0) {
            if (page > 0) pdf.addPage();

            const sliceHeightMm = Math.min(remainingHeight, bodyHeightPerPageMm);
            const sliceHeightPx = sliceHeightMm * capturePxPerMm;

            // Draw header on every page
            let bodyTopMm = MARGIN_MM;
            if (header) {
                const headerImg = header.canvas.toDataURL("image/jpeg", 0.85);
                pdf.addImage(headerImg, "JPEG", MARGIN_MM, MARGIN_MM, contentWidthMm, header.heightMm);
                bodyTopMm = MARGIN_MM + headerMm;
            }

            // Draw body content slice
            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = Math.ceil(sliceHeightPx);
            const ctx = sliceCanvas.getContext("2d")!;
            ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeightPx, 0, 0, canvas.width, Math.ceil(sliceHeightPx));

            const imgData = sliceCanvas.toDataURL("image/jpeg", 0.85);
            pdf.addImage(imgData, "JPEG", MARGIN_MM, bodyTopMm, contentWidthMm, sliceHeightMm);

            // Page number centered at bottom
            pdf.setFontSize(9);
            pdf.setTextColor(150);
            pdf.text(
                `Seite ${page + 1} von ${totalPages}`,
                A4_WIDTH_MM / 2,
                A4_HEIGHT_MM - MARGIN_MM + 2,
                {align: "center"},
            );

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

/** Share via native share sheet on Android/iOS, open in new tab on desktop. */
export const sharePdf = async (file: File): Promise<"shared" | "opened"> => {
    if (isNative()) {
        await nativeShareFile(file);
        return "shared";
    }
    // Desktop: open PDF in a new browser tab
    const url = URL.createObjectURL(file);
    window.open(url, "_blank");
    return "opened";
};
