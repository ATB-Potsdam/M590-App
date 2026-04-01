import {useLocation, useNavigate} from "react-router";
import type {NavItem} from "../types/nav";
import "./BottomNav.scss";

const NAV_ITEMS: NavItem[] = [
    {path: "/", label: "Szenarien", icon: "🌾"},
    {path: "/farm", label: "Betrieb", icon: "🏡"},
];

const isActive = (item: NavItem, pathname: string): boolean =>
    item.path === "/"
        ? pathname === "/" || pathname.startsWith("/projects")
        : pathname.startsWith(item.path);

export const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav className="bottom-nav">
            {NAV_ITEMS.map((item) => (
                <button
                    key={item.path}
                    className={`bottom-nav__item ${isActive(item, location.pathname) ? "bottom-nav__item--active" : ""}`}
                    onClick={() => navigate(item.path)}
                >
                    <span className="bottom-nav__icon">{item.icon}</span>
                    <span className="bottom-nav__label">{item.label}</span>
                </button>
            ))}
        </nav>
    );
};
