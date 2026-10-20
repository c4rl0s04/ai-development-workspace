'use client';
import {
  defaultGlassTheme,
  type GlassMaterial,
  LiquiThemeProvider,
} from '@liqui-design/glass';
import { type ReactNode, useEffect, useState } from 'react';

export function useMaterialPreference() {
  const [material, setMaterial] = useState<GlassMaterial>('auto');
  const [opaque, setOpaque] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(
      '(prefers-reduced-transparency: reduce), (prefers-contrast: more)',
    );
    const update = () => setOpaque(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return [opaque ? 'clear' : material, setMaterial] as const;
}

/** Optics only: colour tokens are scoped CSS, never injected at :root. */
export function MaterialProvider({
  material,
  children,
}: {
  material: GlassMaterial;
  children: ReactNode;
}) {
  return (
    <LiquiThemeProvider
      injectTokens={false}
      theme={{
        glass: {
          ...defaultGlassTheme,
          material,
          dispersion: 0,
          frost: 0.48,
          specular: 0.35,
        },
      }}
    >
      {children}
    </LiquiThemeProvider>
  );
}
