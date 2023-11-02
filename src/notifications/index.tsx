import { useEffect } from "react";
import OneSignal from 'react-onesignal';

export default async function runOneSignal() {
    const appId = process.env.REACT_APP_oneSignalAppId;
    if (!appId)
        return;
    await OneSignal.init({ appId, allowLocalhostAsSecureOrigin: true });
    OneSignal.Slidedown.promptPush();
}

export function useOneSignalNotifications() {

    useEffect(() => {
        runOneSignal();
    }, []);
}
