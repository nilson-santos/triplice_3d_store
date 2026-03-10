import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { trackVisit } from '../api';

const VISITOR_ID_KEY = 'triplice_visitor_id';

function getVisitorId() {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing) {
        return existing;
    }

    const generated = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, generated);
    return generated;
}

export function VisitTracker() {
    const location = useLocation();

    useEffect(() => {
        if (location.pathname.startsWith('/admin')) {
            return;
        }

        const visitorId = getVisitorId();

        trackVisit(visitorId, location.pathname).catch((error) => {
            console.error('Falha ao registrar visita', error);
        });
    }, [location.pathname]);

    return null;
}
