import { SliceEvent } from "src/redux/events/eventsSlice"
import { IEventRepository } from "src/repository/IEventRepository"
import { User } from "src/types/supabaseTypes"

export type EventScreenProps = {
    events: SliceEvent[],
    loading: boolean,
    error: string,
    endReached: boolean,
    repository: IEventRepository,
    user: User
}