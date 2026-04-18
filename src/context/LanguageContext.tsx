"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Language } from "@/lib/translations";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>('hinglish');

    useEffect(() => {
        const savedLang = localStorage.getItem("language") as Language;
        if (savedLang && (savedLang === 'hinglish' || savedLang === 'english' || savedLang === 'hindi')) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLanguageState(savedLang);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("language", lang);
    };

    const t = (path: string): string => {
        const keys = path.split('.');
        let current: unknown = translations[language];
        for (const key of keys) {
            if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
                current = (current as Record<string, unknown>)[key];
            } else {
                console.warn(`Translation path not found: ${path} for language: ${language}`);
                return path;
            }
        }
        return typeof current === 'string' ? current : path;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};
