// src/components/OnboardingOverlay.tsx
import {useNavigate} from "react-router";
import {useFarm} from "../hooks/useFarm";
import "./OnboardingOverlay.scss";

const base = import.meta.env.BASE_URL;

interface Props {
    onClose: () => void;
}

export const OnboardingOverlay = ({onClose}: Props) => {
    const navigate = useNavigate();
    const {farm} = useFarm();
    const hasFarm = farm.name.trim().length > 0 && farm.fields.length > 0;

    const goTo = (path: string) => {
        onClose();
        navigate(path);
    };

    return (
        <div className="onboarding-overlay" onClick={onClose}>
            <div className="onboarding-overlay__dialog" onClick={(e) => e.stopPropagation()}>
                <h2 className="onboarding-overlay__title">Willkommen zur DWA-M 590 App</h2>
                <p className="onboarding-overlay__intro">
                    Diese App unterstützt Sie bei der Berechnung des Bewässerungsbedarfs
                    landwirtschaftlicher Flächen nach dem DWA-Merkblatt M 590.
                </p>
                <ol className="onboarding-overlay__steps">
                    <li>
                        <span className="onboarding-overlay__step-icon">🏡</span>
                        <div className="onboarding-overlay__step-body">
                            <strong>Betrieb einrichten</strong>
                            <p>Geben Sie Ihren Betriebsnamen ein und legen Sie Ihre Schläge mit Standort und Bodenklasse an.</p>
                            <button className="onboarding-overlay__step-link" onClick={() => goTo("/farm")}>
                                → Jetzt einrichten
                            </button>
                        </div>
                    </li>
                    <li>
                        <span className="onboarding-overlay__step-icon">🌾</span>
                        <div className="onboarding-overlay__step-body">
                            <strong>Szenario anlegen</strong>
                            <p>Erstellen Sie ein Bewässerungsszenario (z. B. für ein bestimmtes Jahr) und wählen Sie die zu berechnenden Schläge aus.</p>
                            <button
                                className="onboarding-overlay__step-link"
                                onClick={() => goTo("/")}
                                disabled={!hasFarm}
                                title={!hasFarm ? "Zuerst Betrieb einrichten" : undefined}
                            >
                                → Jetzt anlegen
                            </button>
                        </div>
                    </li>
                    <li>
                        <span className="onboarding-overlay__step-icon">💧</span>
                        <div className="onboarding-overlay__step-body">
                            <strong>Nutzung zuweisen</strong>
                            <p>Weisen Sie jedem Schlag ein Nutzungsmodul zu (z. B. Hauptkulturen, Gemüse, Golf). Die App berechnet den Wasserbedarf automatisch.</p>
                        </div>
                    </li>
                </ol>
                <button className="onboarding-overlay__cta" onClick={onClose}>
                    Los geht's →
                </button>

                <div className="onboarding-overlay__logos">
                    <a href="https://www.atb-potsdam.de" target="_blank" rel="noopener noreferrer">
                        <img src={`${base}atb_logo.svg`} alt="ATB Leibniz-Institut für Agrartechnik und Bioökonomie" className="onboarding-overlay__logo" />
                    </a>
                    <a href="https://www.dwa.de" target="_blank" rel="noopener noreferrer">
                        <img src={`${base}dwa-logo.svg`} alt="DWA Deutsche Vereinigung für Wasserwirtschaft" className="onboarding-overlay__logo" />
                    </a>
                </div>
            </div>
        </div>
    );
};
