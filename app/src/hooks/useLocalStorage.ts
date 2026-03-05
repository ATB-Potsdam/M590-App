// src/hooks/useLocalStorage.ts
import {useCallback, useEffect, useState} from "react";

type SetValue<T> = (value: T | ((prev: T) => T)) => void;

export const useLocalStorage = <T>(key: string, initialValue: T): [T, SetValue<T>] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = localStorage.getItem(key);
            return item ? (JSON.parse(item) as T) : initialValue;
        } catch {
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (e) {
            console.error(e);
        }
    }, [key, storedValue]);

    // useCallback mit leeren Deps → setValue ist stabil, greift nie auf storedValue zu
    const setValue: SetValue<T> = useCallback((value) => {
        setStoredValue((prev: T) => {
            // Updater-Funktion oder direkter Wert – prev kommt von React, nie stale
            return value instanceof Function ? value(prev) : value;
        });
    }, []);

    return [storedValue, setValue];
};
