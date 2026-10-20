'use client';

import { LiquiGlass, useGlassTheme } from '@liqui-design/glass';
import type { ReactNode } from 'react';
import { MaterialProvider, useMaterialPreference } from './provider';

/** A small client island; server-rendered route content is passed as children. */
export function WorkspaceMaterials({ children }: { children: ReactNode }) {
  const [material] = useMaterialPreference();
  return <MaterialProvider material={material}>{children}</MaterialProvider>;
}

/** Frosted application chrome, never an optical lens around dense record content. */
export function ChromeSurface({
  children,
  className,
  contentClassName,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const { material } = useGlassTheme();
  return (
    <LiquiGlass
      material={material === 'auto' ? 'frost' : material}
      radius={22}
      frost={0.68}
      dispersion={0}
      specular={0.25}
      className={className}
      contentClassName={contentClassName}
    >
      {children}
    </LiquiGlass>
  );
}
