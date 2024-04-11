import {TFunction} from "i18next";
import {useSelector} from "react-redux";
import {RootState} from "src/redux/store";
import {AlertSnackbar} from "../AlertSnackbar";
import React from "react";
import {withTranslation} from "react-i18next";
import CreateEvent from ".";
import {useParams} from "react-router-dom";
import {CreateEventOption} from "./types";

const CreateEventProvider = ({ t }: { t: TFunction }) => {
    const { option } = useParams();
    const eventToEdit = useSelector((state: RootState) => state.events.eventToEdit);

    if (!option)
        return <AlertSnackbar close={() => { }} alertInfo={{ message: "Fatal error occured. Repository or user was null!", severity: "error" }} />
    console.log(option)
    return <CreateEvent t={t} eventToEdit={eventToEdit} option={option as CreateEventOption}/>
}

export default withTranslation()(CreateEventProvider);