import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { holdSplash, releaseSplash } from './splash';

// Same markup and styles as the start-up splash in index.html. While the splash is still up it
// covers this screen; later loading phases (e.g. a lazy route) show this copy instead.
export const LoadingScreen = () => {
  const { t } = useTranslation();
  useLayoutEffect(() => {
    holdSplash();
    return releaseSplash;
  }, []);

  return (
    <div className="app-splash" role="status" aria-label={t('common.loadingData')}>
      <div className="app-splash__stage">
        <span className="app-splash__ring" />
        <span className="app-splash__ring" />
        <img className="app-splash__logo" src={`/${import.meta.env.VITE_ICON_PREFIX}/android-chrome-512x512.png`} alt="" />
      </div>
      <div className="app-splash__court" aria-hidden>
        <span className="app-splash__net" />
        <span className="app-splash__shadow" />
        <span className="app-splash__ball" />
      </div>
      <p className="app-splash__name">{import.meta.env.VITE_WEBSITE_NAME}</p>
      <span className="app-splash__bar" aria-hidden />
    </div>
  );
};
