import type { ComponentPropsWithRef } from 'react';
import styles from './Button.module.css';

export type ButtonWeight = 'next' | 'outline';

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  readonly weight: ButtonWeight;
}

export function Button({ weight, className, type = 'button', ...props }: ButtonProps) {
  const classes = [styles.button, styles[weight], className].filter(Boolean).join(' ');

  return <button {...props} type={type} className={classes} />;
}
