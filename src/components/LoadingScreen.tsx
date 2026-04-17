
import { TENANT_LOGO } from '@/utils';

export const LoadingScreen = () => {
  return <div
    className="size-full justify-center align-center flex flex-col"
  >
    {
      <img src={TENANT_LOGO} alt="MUI logo" style={{ height: 125, objectFit: 'contain' }} />
    }
  </div>
};
