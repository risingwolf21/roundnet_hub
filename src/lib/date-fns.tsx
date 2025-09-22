import { Locale } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';


export const customEnLocale: Locale = {
  ...enUS,
  options: {
    ...enUS.options,
    // Sunday = 0, Monday = 1.
    weekStartsOn: 1,
  },
};