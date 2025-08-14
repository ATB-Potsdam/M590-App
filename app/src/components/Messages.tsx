import clsx from "clsx";
import { FaRegWindowClose } from "react-icons/fa";
import { useAppStore } from "../stores/useAppStore";
import "./Messages.scss";

export const Messages = () => {
    const messages = useAppStore((state) => state.messages);
    const delMessage = useAppStore((state) => state.delMessage);

    if (!messages.length) {
        return undefined;
    }
    return (
        <div className="messages">
            {messages.map((message, i) => (
                <div className={clsx("message", message.type)} key={i}>
                    <div
                        className="close"
                        onClick={() =>
                            delMessage(message)
                        }
                    >
                        <FaRegWindowClose />
                    </div>
                    {message.message.map((line, i) => (
                        <div key={i}>{line}</div>
                    ))}
                </div>
            ))}
        </div>
    );

}