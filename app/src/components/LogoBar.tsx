import "./LogoBar.scss";

export const LogoBar = () => (
    <div className="logo-bar">
        <a href="https://www.atb-potsdam.de" target="_blank" rel="noopener noreferrer">
            <img src="/atb_logo.svg" alt="ATB" className="logo-bar__logo" />
        </a>
        <a href="https://www.dwa.de" target="_blank" rel="noopener noreferrer">
            <img src="/dwa-logo.svg" alt="DWA" className="logo-bar__logo" />
        </a>
    </div>
);
