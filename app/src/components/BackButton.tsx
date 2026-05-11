import type {ReactNode} from "react";
import {Link} from "react-router";
import {IoChevronBack} from "react-icons/io5";
import "./BackButton.scss";

type Props =
    | {to: string; onClick?: never; children: ReactNode}
    | {onClick: () => void; to?: never; children: ReactNode};

export const BackButton = ({to, onClick, children}: Props) => {
    const content = <><IoChevronBack className="back-button__icon" />{children}</>;
    if (to) return <Link to={to} className="back-button">{content}</Link>;
    return <button type="button" className="back-button" onClick={onClick}>{content}</button>;
};
