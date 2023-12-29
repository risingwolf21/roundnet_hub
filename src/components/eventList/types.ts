import { IEventRepository } from "src/repository/IEventRepository"
import { FullEvent, User } from "src/types/supabaseTypes"

export type EventScreenProps = {
    events: FullEvent[],
    userGroups: number[],
    loading: boolean,
    error: string,
    endReached: boolean,
    repository: IEventRepository,
    user: User
}