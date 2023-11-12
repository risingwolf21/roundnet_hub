import { useEffect } from "react";
import OneSignal from 'react-onesignal';

export default async function runOneSignal() {
    const appId = process.env.REACT_APP_oneSignalAppId;
    if (!appId)
        return;
    await OneSignal.init({ appId: "29f88fe6-c955-493f-8de5-065263af3e23", allowLocalhostAsSecureOrigin: true });
    OneSignal.Slidedown.promptPush({ force: true });
}

export function useOneSignalNotifications() {

    useEffect(() => {
        runOneSignal();
    }, []);
}
