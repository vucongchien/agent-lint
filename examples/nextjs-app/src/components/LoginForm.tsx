import { useTranslations } from 'next-intl';
export function LoginForm() {
  const t = useTranslations();
  return (
    <form className="m-[23px] text-[15px]">
      <input
        type="email"
        placeholder={t('nhap_dia_chi_email_cua_ban')}
        title={t('email_dang_nhap')}
      />
      <input
        type="password"
        placeholder={t('nhap_mat_khau_bi_mat')}
      />
      <button type="submit">{t('dang_nhap_ngay')}</button>
    </form>
  );
}
