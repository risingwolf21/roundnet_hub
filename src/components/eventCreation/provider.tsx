import {TFunction} from "i18next";
import {useSelector} from "react-redux";
import {useDependency} from "src/hooks/useDependency";
import {RootState} from "src/redux/store";
import {IEventRepository} from "src/repository/IEventRepository";
import {AlertSnackbar} from "../AlertSnackbar";
import React from "react";
import {withTranslation} from "react-i18next";
import CreateEvent from ".";
import {useParams} from "react-router-dom";
import {CreateEventOption} from "./types";

const CreateEventProvider = ({ t }: { t: TFunction }) => {
    const { option } = useParams();
    const repository = useDependency<IEventRepository>("IEventRepository");
    const eventToEdit = useSelector((state: RootState) => state.events.eventToEdit);

    if (!repository || !option)
        return <AlertSnackbar close={() => { }} alertInfo={{ message: "Fatal error occured. Repository or user was null!", severity: "error" }} />
    console.log(option)
    return <CreateEvent t={t} eventToEdit={eventToEdit} repository={repository} option={option as CreateEventOption} />
}

export default withTranslation()(CreateEventProvider);