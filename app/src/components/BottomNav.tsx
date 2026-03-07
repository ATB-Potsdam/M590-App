import {useLocation, useNavigate} from "react-router";
import type {NavItem} from "../types/nav";
import "./BottomNav.scss";

const NAV_ITEMS: NavItem[] = [
    {path: "/", label: "Übersicht", icon: "🌾"},
    {path: "/projects", label: "Projekte", icon: "📋"},
    {path: "/farm", label: "Betrieb", icon: "🏡"},
];

export const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav className="bottom-nav">
            {NAV_ITEMS.map((item) => (
                <button
                    key={item.path}
                    className={`bottom-nav__item ${location.pathname === item.path ? "bottom-nav__item--active" : ""}`}
                    onClick={() => navigate(item.path)}
                >
                    <span className="bottom-nav__icon">{item.icon}</span>
                    <span className="bottom-nav__label">{item.label}</span>
                </button>
            ))}
        </nav>
    );
};
