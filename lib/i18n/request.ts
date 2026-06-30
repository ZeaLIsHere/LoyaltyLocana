import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  // Get locale from cookie, fallback to 'id' (Indonesian)
  const cookieStore = await cookies();
  const locale = cookieStore.get('locale')?.value || 'id';

  let messages;
  try {
    messages = (await import(`@/messages/${locale}.json`)).default;
  } catch {
    messages = (await import(`@/messages/id.json`)).default;
  }

  return {
    locale,
    messages,
  };
});
