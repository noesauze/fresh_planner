import { useTranslation } from 'react-i18next';

const Index = () => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{t('app.welcome')}</h1>
        <p className="text-xl text-muted-foreground">{t('app.startBuilding')}</p>
      </div>
    </div>
  );
};

export default Index;
