import {SliceEvent} from "src/redux/events/eventsSlice"
import {User} from "src/types/supabaseTypes"

export type EventScreenProps = {
    events: SliceEvent[],
    loading: boolean,
    error: string,
    endReached: boolean,
    user: User
}