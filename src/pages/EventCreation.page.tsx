import { TFunction } from 'i18next';
import { useSelector } from 'react-redux';
import { RootState } from 'src/redux/store';
import { AlertSnackbar } from '../components/AlertSnackbar';
import React from 'react';
import { withTranslation } from 'react-i18next';
import CreateEvent from '../features/events/EventCreation';
import { useParams } from 'react-router';
import { CreateEventOption } from '../features/events/types';

const CreateEventProvider = ({ t }: { t: TFunction }) => {
  const { option } = useParams();

  if (!option)
    return (
      <AlertSnackbar
        close={() => {}}
        alertInfo={{ message: 'Fatal error occured. Repository or user was null!', severity: 'error' }}
      />
    );

  return <CreateEvent t={t} eventToEdit={null} option={option as CreateEventOption} />;
};

export default withTranslation()(CreateEventProvider);
