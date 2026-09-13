function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Variável de ambiente em falta: ${name}`)
  }
  return value
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY),
  subscriptionPriceBasico: Number(import.meta.env.VITE_SUBSCRIPTION_PRICE_BASICO ?? '1999'),
  subscriptionPricePro: Number(import.meta.env.VITE_SUBSCRIPTION_PRICE_PRO ?? '3499'),
  mcxNumber: import.meta.env.VITE_MCX_NUMBER ?? '943231005',
  superAdminEmail: import.meta.env.VITE_SUPER_ADMIN_EMAIL ?? '',
}
