import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import OneSignal from 'react-onesignal';
import { useSelector } from 'react-redux';
import { RootState } from 'src/redux/store';
import { default as userTags } from "../components/services/onesignal/userTags";

export function useOneSignal() {
    const { t } = useTranslation();
    const oneSignalUserId = process.env.REACT_APP_oneSignalAppId;
    const [oneSignalInitialized, setOneSignalInitialized] = useState(false);
    const { user } = useSelector((state: RootState) => state.application);

    useEffect(() => {
        if (oneSignalInitialized || !oneSignalUserId)
            return;
        OneSignal.init({
            appId: oneSignalUserId,
            allowLocalhostAsSecureOrigin: true,
            promptOptions: {
                slidedown: {
                    prompts: [
                        {
                            type: "category",
                            autoPrompt: true,
                            text: {
                                actionMessage: t("notification_actionMessage"),
                                acceptButton: "Allow",
                                cancelButton: "Cancel",

                                /* CATEGORY SLIDEDOWN SPECIFIC TEXT */
                                negativeUpdateButton: "Cancel",
                                positiveUpdateButton: "Save Preferences",
                                updateMessage: t("notification_updateMessage"),
                            },
                            categories: userTags
                        }
                    ]
                }
            }
        }).then(() => {
            setOneSignalInitialized(true);
            OneSignal.Slidedown.promptPush();
        });
    }, []);

    useEffect(() => {
        if (user && oneSignalInitialized) {
            OneSignal.login(user.userId);
            const userTagsToAdd: { [key: string]: string } = {};
            const userTagsToRemove: string[] = [];
            user.notificationTags.forEach(x => userTagsToAdd[x] = "1")
            userTags.filter(x => !user.notificationTags.includes(x.tag)).forEach(x => userTagsToRemove.push(x.tag))
            OneSignal.User.addTags(userTagsToAdd);
            OneSignal.User.removeTags(userTagsToRemove)
        }
    }, [user])
}