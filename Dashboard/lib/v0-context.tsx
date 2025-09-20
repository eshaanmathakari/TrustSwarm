"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface V0ContextType {
    isV0: boolean;
    setIsV0: (value: boolean) => void;
}

const V0Context = createContext<V0ContextType | undefined>(undefined);

export function V0Provider({
    children,
    isV0: initialIsV0 = false
}: {
    children: ReactNode;
    isV0?: boolean;
}) {
    const [isV0, setIsV0] = useState(initialIsV0);

    return (
        <V0Context.Provider value={{ isV0, setIsV0 }}>
            {children}
        </V0Context.Provider>
    );
}

export function useIsV0() {
    const context = useContext(V0Context);
    if (context === undefined) {
        throw new Error("useIsV0 must be used within a V0Provider");
    }
    return context;
}
