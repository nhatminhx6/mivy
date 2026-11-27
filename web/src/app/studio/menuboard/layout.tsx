import type { Metadata } from 'next';
import { studioMeta } from '@/lib/studioSeo';
import { StudioSeoArticle } from '@/components/StudioSeoArticle';

export const metadata: Metadata = studioMeta('menuboard');

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <StudioSeoArticle slug="menuboard" />
    </>
  );
}
