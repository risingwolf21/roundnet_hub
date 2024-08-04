import {AppDispatch} from "../../redux/store";
import {FullItemHolder, User} from "../../types/supabaseTypes";
import {TFunction} from "i18next";

export type ItemHolderScreenProps = {
    dispatch: AppDispatch,
    keyHolders: FullItemHolder[],
    loading: boolean,
    user: User,
    t: TFunction
}