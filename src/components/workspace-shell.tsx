import type { ReactNode } from 'react';
import { Layers2, LockKeyhole } from 'lucide-react';
import { Navigation } from './navigation';
import {
  ChromeSurface,
  WorkspaceMaterials,
} from './design-system/materials/chrome';
import { Button } from './design-system/ui/button';

export function WorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <WorkspaceMaterials>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="application-frame">
        <aside className="application-sidebar" aria-label="Workspace">
          <ChromeSurface contentClassName="application-sidebar-content">
            <div className="application-brand">
              <span className="application-mark" aria-hidden="true">
                <Layers2 size={20} />
              </span>
              <div>
                AI Development
                <br /> Workspace<small>Personal workspace</small>
              </div>
            </div>
            <Navigation />
            <div className="application-sidebar-note">
              <LockKeyhole
                size={13}
                className="mr-2 inline"
                aria-hidden="true"
              />
              Owner access only
            </div>
          </ChromeSurface>
        </aside>
        <div className="application-body">
          <ChromeSurface
            className="application-toolbar"
            contentClassName="application-toolbar-content"
          >
            <span>Workspace</span>
            <form action="/auth/logout" method="post">
              <Button
                variant="accent"
                size="sm"
                type="submit"
                glass={{ radius: 10 }}
                className="workspace-button workspace-button--secondary"
              >
                Sign out
              </Button>
            </form>
          </ChromeSurface>
          <main id="main-content" tabIndex={-1} className="application-content">
            {children}
          </main>
        </div>
      </div>
    </WorkspaceMaterials>
  );
}
