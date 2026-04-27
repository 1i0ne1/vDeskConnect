// Updated MessagePopup.jsx with CSS classes
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import "../style/general.css"

function MessagePopup({ message, onClose }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (message) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(() => onClose(), 300);
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [message, onClose]);

    if (!message || !isVisible) return null;

    return (
        <div className={`message-popup message-popup-enter message-popup-${message.type}`}>
            <div className="message-content">
                <span className="message-icon">
                    {message.type === 'error' && '❌'}
                    {message.type === 'success' && '✅'}
                    {message.type === 'warning' && '⚠️'}import '../style/general.css';
                    {message.type === 'info' && 'ℹ️'}
                </span>
                <div className="message-text">
                    <div className="message-title">
                        {message.type.charAt(0).toUpperCase() + message.type.slice(1)}
                    </div>
                    <div className="message-description">{message.text}</div>
                </div>
            </div>
            <button 
                className="message-close"
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(() => onClose(), 300);
                }}
            >
                <X size={16} />
            </button>
        </div>
    );
}

export default MessagePopup;