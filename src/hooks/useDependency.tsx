import { useContext, useEffect, useState } from 'react'
import { DependencyContext } from '..'
import { captureException } from '@sentry/react';

export function useDependency<T>(name: string) {
    const { container } = useContext(DependencyContext);
    const [dependency, setDependency] = useState<T | null>(null);

    useEffect(() => {
        if (container) {
            try {
                setDependency(container.get<T>(name));
            } catch (error) {
                let message = (error as Error).message;
                console.log(message)
                captureException(new Error(message), (scope) => {
                    scope.clear();
                    scope.setExtra("name", name);
                    return scope;;
                });
            }
        }
    }, [container, name]);

    return dependency;
}