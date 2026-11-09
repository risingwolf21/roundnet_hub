
import { TENANT_LOGO } from '@/utils';
import { useTranslation } from 'react-i18next';
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from './ui/empty';
import { Spinner } from './ui/spinner';

export const LoadingScreen = () => {
  const { t } = useTranslation();
  return <div
    className="w-[100dvw] h-[100dvh] justify-center align-center flex flex-col p-4"
  >
    <Empty className="border border-dashed flex-0">
      <EmptyHeader>
        <EmptyMedia variant="default">
          <img src={TENANT_LOGO} alt={t('common.logo')} style={{ height: 125, objectFit: 'contain' }} />
        </EmptyMedia>
        <EmptyTitle>{t('common.loadingData')}</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Spinner className='size-8' />
      </EmptyContent>
    </Empty>

  </div>
};
