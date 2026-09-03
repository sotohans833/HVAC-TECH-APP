import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ActionTile } from './ActionTile';

const meta = {
  title: 'Components/ActionTile',
  component: ActionTile,
} satisfies Meta<typeof ActionTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { icon: 'capacitor', label: 'Run capacitor', meta: '45/5 MFD' },
};

export const Selected: Story = {
  args: { icon: 'contactor', label: 'Contactor', meta: '2 pole 30A', selected: true, count: 1 },
};

/** How the grid behaves in use: tap to add, tap again to add another. */
export const Grid: Story = {
  args: { icon: 'capacitor', label: 'Run capacitor' },
  parameters: { layout: 'padded' },
  render: function GridStory() {
    const [counts, setCounts] = useState<Record<string, number>>({ contactor: 1 });
    const items = [
      { icon: 'capacitor', label: 'Run capacitor', meta: '45/5 MFD' },
      { icon: 'contactor', label: 'Contactor', meta: '2 pole 30A' },
      { icon: 'condenser-fan', label: 'Condenser fan motor', meta: '1/4 HP' },
      { icon: 'expansion-valve', label: 'TXV', meta: 'R-410A' },
      { icon: 'flame-sensor', label: 'Flame sensor', meta: '' },
      { icon: 'air-filter', label: 'Air filter', meta: '20x25x1' },
    ] as const;

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 14,
          maxWidth: 620,
        }}
      >
        {items.map((item) => (
          <ActionTile
            key={item.icon}
            icon={item.icon}
            label={item.label}
            meta={item.meta || undefined}
            count={counts[item.icon] ?? 0}
            selected={(counts[item.icon] ?? 0) > 0}
            onSelect={() =>
              setCounts((prev) => ({ ...prev, [item.icon]: (prev[item.icon] ?? 0) + 1 }))
            }
          />
        ))}
      </div>
    );
  },
};
