import type { Meta, StoryObj } from '@storybook/react';
import { PartIcon, partIconIds } from './part-icons';

const meta = {
  title: 'Foundations/Part icons',
  component: PartIcon,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PartIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  args: { id: 'capacitor', size: 48 },
  argTypes: { id: { control: 'select', options: partIconIds } },
};

/**
 * The whole set at the size it is actually used in the tile grid. Drawn as
 * schematic symbols so they match the wiring diagram inside the unit door.
 */
export const Gallery: Story = {
  args: { id: 'capacitor' },
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
        gap: 12,
      }}
    >
      {partIconIds.map((id) => (
        <div
          key={id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: '16px 8px',
            border: '1px solid var(--mf-border)',
            borderRadius: 'var(--mf-r-lg)',
            background: 'var(--mf-surface)',
          }}
        >
          <PartIcon id={id} size={34} style={{ color: 'var(--mf-low)' }} />
          <code
            style={{
              fontFamily: 'var(--mf-font-mono)',
              fontSize: 10.5,
              color: 'var(--mf-text-3)',
              textAlign: 'center',
              lineHeight: 1.35,
            }}
          >
            {id}
          </code>
        </div>
      ))}
    </div>
  ),
};
