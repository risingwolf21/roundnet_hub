import { captureException } from "@sentry/react";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";

export function useCaptureException(error: any) {

    const { user } = useSelector((state: RootState) => state.application);

    useEffect(() => {
        if (error) {
            captureException(error, (scope) => {
                scope.clear();
                scope.setExtra("user", JSON.stringify(user));
                scope.setExtra("url", window.location.pathname);
                return scope;
            });
        }
    }, [error]);
}