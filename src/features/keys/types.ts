import { TFunction } from 'i18next';

export type ItemHolderScreenProps = {
  keyHolders: FullItemHolder[];
  loading: boolean;
  user: User;
  t: TFunction;
};
