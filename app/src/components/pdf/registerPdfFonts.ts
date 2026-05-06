import {Font} from "@react-pdf/renderer";

const base = import.meta.env.BASE_URL;

let registered = false;

export const registerPdfFonts = () => {
    if (registered) return;
    Font.register({
        family: "Roboto",
        fonts: [
            {src: `${base}fonts/Roboto-Regular.ttf`, fontWeight: "normal"},
            {src: `${base}fonts/Roboto-Italic.ttf`, fontWeight: "normal", fontStyle: "italic"},
            {src: `${base}fonts/Roboto-Bold.ttf`, fontWeight: "bold"},
            {src: `${base}fonts/Roboto-BoldItalic.ttf`, fontWeight: "bold", fontStyle: "italic"},
        ],
    });
    registered = true;
};
