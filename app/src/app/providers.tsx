'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'light',
    toggleTheme: () => { },
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Initialize from the DOM attribute (set by the blocking script in layout.tsx)
    // to avoid a flash. Falls back to 'light' during SSR.
    const [theme, setTheme] = useState<Theme>('light');

    useEffect(() => {
        // Sync React state with whatever the blocking script set on <html>
        const current = document.documentElement.getAttribute('data-theme') as Theme;
        if (current && current !== theme) {
            setTheme(current);
        }
    }, []);

    const toggleTheme = () => {
        const next = theme === 'light' ? 'dark' : 'light';
        setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('vs-theme', next);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
