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
        <div className="app-splash__icon">
          <img className="app-splash__logo" src={`/${import.meta.env.VITE_ICON_PREFIX}/android-chrome-512x512.png`} alt="" />
          <svg className="app-splash__progress" viewBox="0 0 136 136" aria-hidden>
            <rect className="app-splash__track" x="2" y="2" width="132" height="132" rx="38" pathLength="100" />
            <rect className="app-splash__arc" x="2" y="2" width="132" height="132" rx="38" pathLength="100" />
          </svg>
        </div>
      </div>
      <p className="app-splash__name">{import.meta.env.VITE_WEBSITE_NAME}</p>
    </div>
  );
};
