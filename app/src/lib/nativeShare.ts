// src/lib/nativeShare.ts
import {Capacitor} from "@capacitor/core";
import {Directory, Filesystem} from "@capacitor/filesystem";
import {Share} from "@capacitor/share";

/** True when running inside a native Capacitor shell (Android/iOS). */
export const isNative = () => Capacitor.getPlatform() !== "web";

/** Convert a Blob to a base64 string (without the data-URL prefix). */
const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

/**
 * Write a File to the native cache directory, then open the system share sheet.
 * Only call this when `isNative()` is true.
 */
export const nativeShareFile = async (file: File): Promise<void> => {
    const base64 = await blobToBase64(file);
    const {uri} = await Filesystem.writeFile({
        path: file.name,
        data: base64,
        directory: Directory.Cache,
    });
    await Share.share({
        title: file.name,
        url: uri,
        dialogTitle: "Datei teilen",
    });
};
