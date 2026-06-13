let cached: ServiceWorkerRegistration | null = null;

export const setSwRegistration = (reg: ServiceWorkerRegistration) => {
    cached = reg;
};

export const getSwRegistration = (): ServiceWorkerRegistration | null => cached;
