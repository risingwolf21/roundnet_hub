import { TFunction } from "i18next"
import { IEventRepository } from "src/repository/IEventRepository"
import { FullEvent } from "src/types/supabaseTypes"

export type CreateEventProps = {
    t: TFunction,
    eventToEdit: FullEvent | null,
    repository: IEventRepository
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