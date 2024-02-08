import {useContext, useEffect, useState} from 'react'
import {DependencyContext} from '..'
import {captureException} from '@sentry/react';
import {interfaces} from "inversify";
import Factory = interfaces.Factory;
import {useSelector} from "react-redux";
import {RootState} from "../redux/store";

export function useDependency<T>(name: string) {
    const {container} = useContext(DependencyContext);
    const [dependency, setDependency] = useState<T | null>(null);

    useEffect(() => {
        if (container) {
            try {
                setDependency(container.get<T>(name));
            } catch (error) {
                let message = (error as Error).message;
                captureException(new Error(message), (scope) => {
                    scope.clear();
                    scope.setExtra("name", name);
                    return scope;
                    ;
                });
            }
        }
    }, [container, name]);

    return dependency;
}

export function useRepository<T>(name: string) {
    const {user} = useSelector((state: RootState) => state.application);
    const {container} = useContext(DependencyContext);
    const [factory, setFactory] = useState<Factory<T> | null>(null);

    useEffect(() => {
        if (container) {
            try {
                setFactory(container.get<Factory<T>>(name));
            } catch (error) {
                let message = (error as Error).message;
                captureException(new Error(message), (scope) => {
                    scope.clear();
                    scope.setExtra("name", name);
                    return scope;
                });
            }
        }
    }, [container, name]);

    return factory ? factory(user?.role === "admin" ?? false) as T : null;
}