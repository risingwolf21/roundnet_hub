import { ReactNode, useEffect } from 'react';
import { fetchNotVerifiedUsersAsync } from '../features/admin/slices/adminUserSlice';
import { useApplication } from '../features/auth/AuthContext';
import {
  fetchNotificationsAsync
} from '../features/notifications/slices/notificationsSlice';
import { useAppDispatch } from '../redux/store';

export const InitialFetch = ({ children }: { children: ReactNode }) => {
  useInitialFetch();

  return children;
};

export const useInitialFetch = () => {
  const dispatch = useAppDispatch();
  const { user } = useApplication();

  useEffect(() => {
    dispatch(fetchNotificationsAsync(user!));
    if (user!.role === 'admin') dispatch(fetchNotVerifiedUsersAsync());
  }, [dispatch, user]);

};
