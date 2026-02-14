import { SiWhatsapp } from 'react-icons/si';

const WHATSAPP_NUMBER = '5545991080886';
const WHATSAPP_MESSAGE = 'Olá! Gostaria de saber mais sobre os produtos da Tríplice 3D.';

export const WhatsAppFAB = () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Fale conosco pelo WhatsApp"
            className="whatsapp-fab"
        >
            <SiWhatsapp size={28} />
        </a>
    );
};
