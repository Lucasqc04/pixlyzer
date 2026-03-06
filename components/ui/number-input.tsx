import * as React from 'react';
import { Input, type InputProps } from '@/components/ui/input';

interface NumberInputProps extends Omit<InputProps, 'type' | 'inputMode'> {
  allowNegative?: boolean;
}

export function NumberInput({ value, onChange, allowNegative = false, ...props }: NumberInputProps) {
  return (
    <Input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => {
        const rx = allowNegative ? /[^\d.,-]/g : /[^\d.,]/g;
        const clean = e.target.value.replace(rx, '');
        onChange?.({ ...e, target: { ...e.target, value: clean } } as React.ChangeEvent<HTMLInputElement>);
      }}
      {...props}
    />
  );
}
