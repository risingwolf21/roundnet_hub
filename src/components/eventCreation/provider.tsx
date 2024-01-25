import { TFunction } from "i18next";
import { useSelector } from "react-redux";
import { useDependency } from "src/hooks/useDependency";
import { RootState } from "src/redux/store";
import { IEventRepository } from "src/repository/IEventRepository";
import { AlertSnackbar } from "../AlertSnackbar";
import React from "react";
import { withTranslation } from "react-i18next";
import CreateEvent from ".";

const CreateEventProvider = ({ t }: { t: TFunction }) => {
    const repository = useDependency<IEventRepository>("IEventRepository");
    const eventToEdit = useSelector((state: RootState) => state.events.eventToEdit);

    if (!repository)
        return <AlertSnackbar close={() => { }} alertInfo={{ message: "Fatal error occured. Repository or user was null!", severity: "error" }} />

    return <CreateEvent t={t} eventToEdit={eventToEdit} repository={repository} />
}

export default withTranslation()(CreateEventProvider);