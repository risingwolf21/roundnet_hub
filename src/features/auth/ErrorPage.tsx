import Layout from '@/components/layout/Layout';
import FeatureNotAvailableImage from '@/images/feature_not_available.png';
import PermissionDeniedImage from '@/images/no_permission.png';
import NotFoundImage from '@/images/not_found.png';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export const ErrorPage = ({ title, message, imagePath }: { title: string; message: string; imagePath: string }) => {
  return (
    <Layout>
      <Stack direction={'column'} sx={{ m: 6 }}>
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <img src={imagePath} width={'100%'} height={'350px'} style={{ objectFit: 'contain' }} />
        </Box>
        <Typography sx={{ fontSize: 26, fontWeight: 'bold', mt: 3, textAlign: 'center' }}>{title}</Typography>
        <Typography sx={{ fontSize: 20, mt: 3, textAlign: 'center' }}>{message}</Typography>
      </Stack>
    </Layout>
  );
};

export const PermissionDeniedPage = () => {
  return (
    <ErrorPage
      title="Berechtigungen fehlen"
      message="Dir fehlen leider die Berechtigungen um diese Seite anzeigen zu können. Falls das nicht so sein sollte, wende dich bitte an den Administrator oder kehre zur Startseite zurück."
      imagePath={PermissionDeniedImage}
    />
  );
};

export const NotFoundPage = () => {
  return (
    <ErrorPage
      title="Berechtigungen fehlen"
      message="Dir fehlen leider die Berechtigungen um diese Seite anzeigen zu können. Falls das nicht so sein sollte, wende dich bitte an den Administrator oder kehre zur Startseite zurück."
      imagePath={NotFoundImage}
    />
  );
};

export const FeatureNotAvailable = () => {
  return (
    <ErrorPage
      title="Feature fehlt"
      message="Dir fehlt leider das Feature um diese Seite anzeigen zu können. Falls das nicht so sein sollte, wende dich bitte an den Administrator oder kehre zur Startseite zurück."
      imagePath={FeatureNotAvailableImage}
    />
  );
};
