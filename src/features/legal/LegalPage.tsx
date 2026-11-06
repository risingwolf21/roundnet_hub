import { Button } from '@/components/ui/button';
import { LEGAL } from '@/tenant/config';
import { BRANDING, TENANT_LOGO } from '@/utils';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

type Section = { title: string; body: string[] };
export type LegalDoc = 'imprint' | 'privacy' | 'terms' | 'deleteAccount';

export const LegalLinks = ({ className }: { className?: string }) => {
  const { t } = useTranslation();
  return (
    <nav className={`flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground ${className ?? ''}`}>
      <Link className="underline underline-offset-4" to="/legal/imprint">{t('legal.links.imprint')}</Link>
      <Link className="underline underline-offset-4" to="/legal/privacy">{t('legal.links.privacy')}</Link>
      <Link className="underline underline-offset-4" to="/legal/terms">{t('legal.links.terms')}</Link>
      <Link className="underline underline-offset-4" to="/legal/delete-account">{t('legal.links.deleteAccount')}</Link>
    </nav>
  );
};

const ProviderAddress = () => {
  const { t } = useTranslation();
  return (
    <address className="not-italic leading-relaxed">
      {LEGAL.operator}<br />
      {LEGAL.street}<br />
      {LEGAL.city}<br />
      {LEGAL.country}
      {LEGAL.email && <><br />{t('legal.contact.email')}: <a className="underline" href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></>}
    </address>
  );
};

/** Public page (no login) so store listings and reviewers can open it. */
const LegalPage = ({ doc }: { doc: LegalDoc }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const values = { app: BRANDING.title, ...LEGAL };
  const sections = t(`legal.${doc}.sections`, { returnObjects: true, ...values }) as Section[];

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft /> {t('legal.back')}
        </Button>
        <img src={TENANT_LOGO} alt={BRANDING.title} className="h-10 w-auto" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{t(`legal.${doc}.title`)}</h1>
      {doc === 'privacy' && <p className="text-sm text-muted-foreground">{t('legal.privacy.updated')}</p>}

      {doc === 'imprint' && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t('legal.imprint.providerTitle')}</h2>
          <ProviderAddress />
        </section>
      )}
      {doc === 'privacy' && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t('legal.privacy.controllerTitle')}</h2>
          <ProviderAddress />
        </section>
      )}

      {sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph} className="leading-relaxed text-muted-foreground">{paragraph}</p>
          ))}
        </section>
      ))}

      <LegalLinks className="mt-auto pt-6" />
    </div>
  );
};

export default LegalPage;
