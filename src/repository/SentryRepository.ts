export type SentryIssue = {
    title: string
    culprit: string
    level: string
    permalink: string
    status: string
    type: string
    metadata: {
        value: string
        type: string
        filename: string
        function: string
    }
    firstSeen: string
    lastSeen: string
    isUnhandled: boolean
    count: number
    userCount: number
    hasSeen: boolean
}

export const SentryRepository = {
    async fetchIssues(): Promise<SentryIssue[]> {
        return fetch("https://sentry.io/api/0/projects/roundnet-karlsruhe/roundnet-karlsruhe/issues/", {
            mode: "cors",
            method: "GET",

            headers: {
                "Authorization": "Bearer 500d89e22e9fa2d8b372f208509f9b579ca3aec755f189752551ff102fd689d6",
            }
        }).then((result) => {
            return result.json()
        }).then((json) => {
            return JSON.parse(json) as SentryIssue[];
        }).catch((error) => {
            console.error(error);
            return [];
        });
    }
}