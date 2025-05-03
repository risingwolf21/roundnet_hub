import { AppDispatch } from '../../redux/store';
import { TFunction } from 'i18next';

export type ItemHolderScreenProps = {
  dispatch: AppDispatch;
  keyHolders: FullItemHolder[];
  loading: boolean;
  user: User;
  t: TFunction;
};
