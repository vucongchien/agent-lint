import { useTranslations } from 'next-intl';
export function Header() {
  const t = useTranslations();
  return (
    <header className="bg-[#1e293b] p-[15px]">
      <h1>{t('bang_dieu_khien_quan_tri')}</h1>
      <p>{t('chao_mung_ban_quay_tro_lai_he_thong')}</p>
    </header>
  );
}
