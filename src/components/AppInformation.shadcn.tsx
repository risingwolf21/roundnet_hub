
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useGrants } from '@/features/auth/GrantsContext';
import { iOS } from '@/utils';
import { Users2 } from 'lucide-react';
import translations from '../translation/locales/translation.de.json';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { AppBar } from './ui/appbar';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const AppInformationShadcn = () => {
  const { user } = useGrants();
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const t = (key: string) => translate(`help.${key}`);


  return <div className="flex flex-col min-h-screen">
    <AppBar
      className='!border-b !shadow-sm'
      title="Homepage"
      user={user}
    />
    <main className='flex-1 size-full pb-safe-bottom'>
      <div className='flex flex-col gap-4'>

        <div className='flex flex-col gap-4 p-4'>
          <Card id="refresh">
            <CardHeader>
              <CardTitle>{t('titles.refresh')}</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2'>
              <p className='text-muted-foreground leading-relaxed'>{t('pullToRefresh')}</p>
              <p className='text-muted-foreground leading-relaxed'>{t('refreshApplication')}</p>
            </CardContent>
          </Card>

          <Card id="installation">
            <CardHeader>
              <CardTitle>{t('titles.installation')}</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2'>
              <div>
                <ol className="list-decimal pl-4 pt-2">
                  {
                    iOS ? (
                      <>
                        <li><p className='text-muted-foreground leading-relaxed'>{t('openShareMenuIOS')}</p></li>
                        <li><p className='text-muted-foreground leading-relaxed'>{t('clickAddToHomeScreen')}</p></li>
                        <li><p className='text-muted-foreground leading-relaxed'>{t('confirmName')}</p></li>
                        <li><p className='text-muted-foreground leading-relaxed'>{t('clickAdd')}</p></li>
                      </>
                    ) : (
                      <>
                        <li><p className='text-muted-foreground leading-relaxed'>{t('openMenuAndroid')}</p></li>
                        <li><p className='text-muted-foreground leading-relaxed'>{t('clickInstallApp')}</p></li>
                        <li><p className='text-muted-foreground leading-relaxed'>{t('confirmName')}</p></li>
                        <li><p className='text-muted-foreground leading-relaxed'>{t('confirmInstallation')}</p></li>
                      </>
                    )
                  }
                </ol>
              </div>
              <p className='text-muted-foreground leading-relaxed'>{t('updateAvailable')}</p>
            </CardContent>
          </Card>

          <Card id="groups">
            <CardHeader>
              <CardTitle>{t('titles.groups')}</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2'>
              <div>
                <ol className="list-decimal pl-4 pt-2">
                  <li><p className='text-muted-foreground leading-relaxed'>{t('navigateToGroups')}</p></li>
                  <li><p className='text-muted-foreground leading-relaxed'>{t('listAllGroups')}</p></li>
                  <li><p className='text-muted-foreground leading-relaxed'>{t('joinGroup')}</p></li>
                </ol>
              </div>
              <div style={{ justifyContent: 'center', width: '100%', display: 'flex', marginTop: '16px' }}>
                <Button onClick={() => navigate('/groups/list')}>
                  <Users2 />
                  Zu den Gruppen
                </Button>
              </div>
              <p className='text-muted-foreground leading-relaxed'>{t('eventsFromGroupInfo')}</p>
              <p className='text-muted-foreground leading-relaxed'>{t('challengesFromGroupInfo')}</p>
            </CardContent>
          </Card>

          <Card id="events">
            <CardHeader>
              <CardTitle>{t('titles.events')}</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2'>
              <div>
                <ol className="list-decimal pl-4 pt-2">
                  <li><p className='text-muted-foreground leading-relaxed'>{t('navigateToEvents')}</p></li>
                  <li><p className='text-muted-foreground leading-relaxed'>{t('listAllEvents')}</p></li>
                  <li><p className='text-muted-foreground leading-relaxed'>{t('eventInformation')}</p></li>
                </ol>
              </div>
              <p className='text-muted-foreground leading-relaxed'>{t('eventComments')}</p>
              <p className='text-muted-foreground leading-relaxed'>{t('eventAttendance')}</p>
              <p className='text-muted-foreground leading-relaxed'>{t('eventMap')}</p>
            </CardContent>
          </Card>

          <Card id="faq" className='px-0'>
            <CardHeader>
              <CardTitle>{t('titles.faq')}</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2 px-0'>
              <Accordion className='w-full'>
                {Object.entries(translations.help.faq).map(([key], index) => (
                  <AccordionItem className={"px-4"} key={index} value={`item-${index + 1}`}>
                    <AccordionTrigger className='text-base'>{t(`faq.${key}.title`)}</AccordionTrigger>
                    <AccordionContent className='text-muted-foreground'>{t(`faq.${key}.answer`)}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>


      </div>
    </main>
  </div>

  // return (
  //   <Layout appBarConfig={{ title: 'Hilfe und Informationen' }}>
  //     <List sx={{ mx: 2, mb: 'env(safe-area-inset-bottom)' }}>
  //       <List subheader={<ListSubheader sx={{ m: 0, p: 0 }}>Inhalt dieser Seite</ListSubheader>}>
  //         <ListItemButton dense href="#refresh">
  //           <ListItemText primary={t('titles.refresh')} />
  //         </ListItemButton>
  //         <ListItemButton dense href="#installation">
  //           <ListItemText primary={t('titles.installation')} />
  //         </ListItemButton>
  //         <ListItemButton dense href="#groups">
  //           <ListItemText primary={t('titles.groups')} />
  //         </ListItemButton>
  //         <ListItemButton dense href="#events">
  //           <ListItemText primary={t('titles.events')} />
  //         </ListItemButton>
  //         <ListItemButton dense href="#faq">
  //           <ListItemText primary={t('titles.faq')} />
  //         </ListItemButton>
  //       </List>
  //       <Divider />
  //     </List>
  //   </Layout>
  // );
};

export default AppInformationShadcn;
