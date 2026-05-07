import {Link} from "react-router";
import "./LogoBar.scss";

const base = import.meta.env.BASE_URL;

export const LogoBar = () => (
    <div className="logo-bar">
        <a href="https://www.atb-potsdam.de" target="_blank" rel="noopener noreferrer">
            <img src={`${base}atb_logo.svg`} alt="ATB" className="logo-bar__logo" />
        </a>
        <a href="https://www.dwa.de" target="_blank" rel="noopener noreferrer">
            <img src={`${base}dwa-logo.svg`} alt="DWA" className="logo-bar__logo" />
        </a>
        <span className="logo-bar__spacer" />
        <Link to="/about" className="logo-bar__link" title="Über die App" aria-label="Über die App">©</Link>
        <Link to="/privacy" className="logo-bar__link" title="Datenschutz" aria-label="Datenschutz">🔒</Link>
    </div>
);
