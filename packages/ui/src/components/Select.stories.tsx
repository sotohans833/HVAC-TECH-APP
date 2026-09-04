import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Select } from './Select';

const meta = {
  title: 'Components/Select',
  component: Select,
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const CAUSES = [
  { value: 'burned-contacts', label: 'Burned / pitted contacts' },
  { value: 'welded', label: 'Contacts welded closed' },
  { value: 'coil-failed', label: 'Coil failed — will not pull in' },
  { value: 'insects', label: 'Insect / ant intrusion' },
];

export const Chosen: Story = {
  args: {
    value: 'burned-contacts',
    options: CAUSES,
    label: 'Why the contactor was replaced',
    onValueChange: () => {},
  },
  render: function ChosenStory(args) {
    const [value, setValue] = useState(args.value);
    return <Select {...args} value={value} onValueChange={setValue} />;
  },
};

/** Nothing picked yet reads as a prompt — dashed border, muted text. */
export const Empty: Story = {
  args: {
    value: '',
    options: CAUSES,
    placeholder: 'Why? — optional',
    label: 'Why the contactor was replaced',
    onValueChange: () => {},
  },
  render: function EmptyStory(args) {
    const [value, setValue] = useState(args.value);
    return <Select {...args} value={value} onValueChange={setValue} />;
  },
};
