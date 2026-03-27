import React, { createContext, use, useEffect, useState } from 'react';

export type FeatureKey =
  | 'enableShadcnUI';

const defaultFeatures: Record<FeatureKey, boolean> = {
  enableShadcnUI: false
};

interface FeatureToggleContextType {
  features: Record<FeatureKey, boolean>;
  toggleFeature: (key: FeatureKey) => void;
  hasFeature: (key: FeatureKey) => boolean;
  setFeature: (key: FeatureKey, value: boolean) => void;
}

const FeatureToggleContext = createContext<FeatureToggleContextType>({
  features: defaultFeatures,
  toggleFeature: () => { },
  setFeature: () => { },
  hasFeature: () => false
});

const STORAGE_KEY = 'app-feature-flags';

export const FeatureToggleProvider = ({ children }: { children: React.ReactNode }) => {
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultFeatures, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Fehler beim Laden der Feature Flags', error);
    }
    return defaultFeatures;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(features));
  }, [features]);

  const toggleFeature = (key: FeatureKey) => {
    setFeatures((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const setFeature = (key: FeatureKey, value: boolean) => {
    setFeatures((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const hasFeature = (key: FeatureKey): boolean => {
    return features[key];
  };

  return (
    <FeatureToggleContext value={{ features, toggleFeature, setFeature, hasFeature }}>
      {children}
    </FeatureToggleContext>
  );
};

export const useFeatureFlags = () => use(FeatureToggleContext);


export const useFeature = (key: FeatureKey): boolean => {
  const { features } = use(FeatureToggleContext);
  return features[key];
};