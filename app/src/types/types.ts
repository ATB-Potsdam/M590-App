export type Setter<T> = (value: T | ((prev: T) => T)) => void;

export type ValueSetter<T> = [value: T, set: Setter<T>];

