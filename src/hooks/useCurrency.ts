import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/** Formats euro amounts in the app language, always with two decimals ("2,50 €"). */
export const useCurrency = () => {
  const { i18n } = useTranslation();
  return useMemo(() => {
    const formatter = new Intl.NumberFormat(i18n.resolvedLanguage, { style: 'currency', currency: 'EUR' });
    return (value: number | null | undefined) => formatter.format(value ?? 0);
  }, [i18n.resolvedLanguage]);
};
