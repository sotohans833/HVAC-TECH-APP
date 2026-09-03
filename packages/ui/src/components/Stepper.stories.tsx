import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Stepper } from './Stepper';

const meta = {
  title: 'Components/Stepper',
  component: Stepper,
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: 1, label: 'Capacitor quantity', onChange: () => {} },
  render: function StepperStory(args) {
    const [value, setValue] = useState(args.value);
    return <Stepper {...args} value={value} onChange={setValue} />;
  },
};
