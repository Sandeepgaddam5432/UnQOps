import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TabTile } from './TabTile';

const tab = { id: 'settings' as const, visible: true, window: 'user' as const, order: 0 };

describe('settings tile', () => {
  it('renders its label and description in a native button', () => {
    const html = renderToStaticMarkup(<TabTile tab={tab} description="Configure application preferences" />);

    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
    expect(html).toContain('Settings');
    expect(html).toContain('Configure application preferences');
  });

  it('marks loading tiles disabled and displays updates', () => {
    const html = renderToStaticMarkup(<TabTile tab={tab} isLoading hasUpdate statusMessage="Updates available" />);

    expect(html).toContain('disabled');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Updates available');
  });
});
