import {TFunction} from "i18next"
import {FullEvent} from "src/types/supabaseTypes"

export type CreateEventOption = "UpdateSingle" | "UpdateRecurrence" | "InsertEvent";

export type CreateEventProps = {
    t: TFunction,
    eventToEdit: FullEvent | null,
    option: CreateEventOption
}

export type PlaceType = {
    name: string,
    lat: number,
    lon: number
}

export type SearchPlacesDialogProps = {
    open: boolean,
    handleClose: () => void,
    placeSelected: (place: PlaceType) => void
}