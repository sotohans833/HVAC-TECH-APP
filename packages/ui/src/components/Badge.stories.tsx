import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta = {
  title: 'Components/Badge',
  component: Badge,
  args: { children: 'Synced' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tones: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <Badge tone="ok" dot>
        Synced
      </Badge>
      <Badge tone="warn" dot>
        Offline
      </Badge>
      <Badge tone="low">Refrigerant</Badge>
      <Badge tone="high">Electrical</Badge>
      <Badge tone="copper">Line set</Badge>
      <Badge tone="neutral">Draft</Badge>
    </div>
  ),
};
