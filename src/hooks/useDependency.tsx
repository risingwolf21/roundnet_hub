import { useContext, useEffect, useState } from 'react'
import { DependencyContext } from '..'

export function useDependency<T>(name: string) {
    const { container } = useContext(DependencyContext);
    const [dependency, setDependency] = useState<T | null>(null);

    useEffect(() => {
        if (container) {
            setDependency(container.get<T>(name));
        }
    }, [container, name]);

    return dependency;
}