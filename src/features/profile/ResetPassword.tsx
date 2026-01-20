import Layout from '@/components/layout/Layout';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ResetPasswordLayout } from '../auth/ResetPasswordScreen';

const ResetPassword = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else {
      await new Promise((r) => setTimeout(r, 2000));
      setLoading(false);
      setError('');
      navigate(`/user`, { replace: true });
    }
  };

  return (
    <Layout appBarConfig={{ title: 'Passwort zurücksetzen', showProfile: false, navigateBackPath: '/user' }}>
      <ResetPasswordLayout
        loadingState={[loading, setLoading]}
        theme={theme}
        errorState={[error, setError]}
        handleSubmit={handleSubmit}
      />
    </Layout>
  );
};
export default ResetPassword;
