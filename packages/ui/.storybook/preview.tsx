import type { Decorator, Preview } from '@storybook/react';
import { useEffect, type ReactNode } from 'react';
import '../src/styles/tokens.css';
import './storybook.css';

/**
 * Storybook drives the same `data-theme` attribute the app uses, so every story
 * is checked in both themes with no component-level theme prop.
 */
function ThemeFrame({ theme, children }: { theme: 'light' | 'dark'; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return <>{children}</>;
}

const withTheme: Decorator = (Story, context) => (
  <ThemeFrame theme={context.globals['theme'] === 'light' ? 'light' : 'dark'}>
    <Story />
  </ThemeFrame>
);

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Color theme',
      defaultValue: 'dark',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'dark', title: 'Dark' },
          { value: 'light', title: 'Light' },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
    a11y: { test: 'error' },
    backgrounds: { disable: true },
  },
};

export default preview;
