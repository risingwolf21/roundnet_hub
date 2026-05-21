
import { TENANT_LOGO } from '@/utils';
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from './ui/empty';
import { Spinner } from './ui/spinner';

export const LoadingScreen = () => {
  return <div
    className="w-[100dvw] h-[100dvh] justify-center align-center flex flex-col p-4"
  >
    <Empty className="border border-dashed flex-0">
      <EmptyHeader>
        <EmptyMedia variant="default">
          <img src={TENANT_LOGO} alt="MUI logo" style={{ height: 125, objectFit: 'contain' }} />
        </EmptyMedia>
        <EmptyTitle>Daten werden geladen</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Spinner className='size-8' />
      </EmptyContent>
    </Empty>

  </div>
};
