import { ContactForm } from './contact-form';

export default async function ContactPage({
  searchParams
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const inquiryType =
    params.type === 'consumer' ||
    params.type === 'partner' ||
    params.type === 'fleet'
      ? params.type
      : 'partner';

  return <ContactForm inquiryType={inquiryType} />;
}
