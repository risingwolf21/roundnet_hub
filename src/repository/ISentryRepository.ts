export interface ISentryRepository {
    loadUnresolvedIssues(): Promise<Response | null>
}

export class SentryRepository implements ISentryRepository {
    async loadUnresolvedIssues(): Promise<Response | null> {
        let token = process.env.REACT_APP_SENTRY_USER_AUTH_TOKEN;
        if (!token) {
            console.log("token null")
            return null;
        }
        try {
            return await fetch("https://sentry.io/api/0/projects/roundnet-karlsruhe/roundnet-karlsruhe/issues/", {
                mode: 'no-cors',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    "Access-Control-Allow-Origin": "*"
                }
            });

        } catch (error) {
            return null;
        }
    }
}