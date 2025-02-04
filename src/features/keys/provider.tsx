import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { keyHoldersSelector } from 'src/features/keys/slices/keysSlice';
import { RootState, useAppDispatch } from 'src/redux/store';
import { useAuth } from '../auth/AuthContext';
import { ItemHolderScreen } from './index';

const ItemHolderScreenProvider = () => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const keyHolders = useSelector((state: RootState) => keyHoldersSelector.selectAll(state));
  const { loading } = useSelector((state: RootState) => state.keys);
  const { t } = useTranslation();

  return <ItemHolderScreen t={t} dispatch={dispatch} user={user!} loading={loading} keyHolders={keyHolders} />;
};

export default ItemHolderScreenProvider;
