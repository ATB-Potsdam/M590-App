import clsx from "clsx";
import {useAppStore} from "../stores/useAppStore";
import "./Messages.scss";

const TYPE_ICON: Record<string, string> = {
    info:    "ℹ️",
    warning: "⚠️",
    error:   "❌",
};

export const Messages = () => {
    const messages = useAppStore((state) => state.messages);
    const delMessage = useAppStore((state) => state.delMessage);

    if (!messages.length) return undefined;

    return (
        <div className="messages">
            {messages.map((message, i) => (
                <div className={clsx("message", message.type)} key={i}>
                    <span className="message__icon">{TYPE_ICON[message.type]}</span>
                    <span className="message__body">
                        {message.message.map((line, j) => (
                            <span key={j}>{line}</span>
                        ))}
                    </span>
                    <button
                        className="message__close"
                        onClick={() => delMessage(message)}
                        aria-label="Schließen"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
};
