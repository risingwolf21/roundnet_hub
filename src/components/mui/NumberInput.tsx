import { NumberField } from '@base-ui-components/react/number-field';
import styled from '@emotion/styled';
import { blue, grey } from '@mui/material/colors';
import * as React from 'react';

function PlusIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentcolor"
      strokeWidth="1.6"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M0 5H5M10 5H5M5 5V0M5 5V10" />
    </svg>
  );
}

function MinusIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentcolor"
      strokeWidth="1.6"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M0 5H10" />
    </svg>
  );
}

export const NumberInput = React.forwardRef(function CustomNumberInput(
  props: NumberField.Root.Props & { fullWidth?: boolean; placeholder?: string },
  ref: React.ForwardedRef<HTMLDivElement>
) {
  return (
    <NumberField.Root
      style={{ width: props.fullWidth ? '100%' : 'unset' }}
      disabled={props.disabled}
      ref={ref}
      {...props}
    >
      <NumberField.Group style={{ display: 'flex', width: '100%' }}>
        <StyledNumberFieldDecrement>
          <MinusIcon />
        </StyledNumberFieldDecrement>
        <StyledNumberFielInput width={'100%'} placeholder={props.placeholder} />
        <StyledNumberFieldIncrement>
          <PlusIcon />
        </StyledNumberFieldIncrement>
      </NumberField.Group>
    </NumberField.Root>
  );
});

const StyledNumberFielInput = styled(NumberField.Input)(
  () => `
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border-radius: 0;
  border-top: 1px solid ${grey[200]};
  border-bottom: 1px solid ${grey[200]};
  border-left: none;
  border-right: none;
  width: 6rem;
  height: 2.5rem;
  font-family: inherit;
  font-size: 1rem;
  font-weight: normal;
  background-color: transparent;
  color: ${grey[900]};

  text-align: center;
  font-variant-numeric: tabular-nums;

  &:focus {
    z-index: 1;
    outline: 2px solid ${blue};
    outline-offset: -1px;
  }
`
);

const StyledNumberFieldDecrement = styled(NumberField.Decrement)(
  () => `
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  margin: 0;
  outline: 0;
  padding: 0;
  border: 1px solid ${grey[200]};
  border-radius: 0.375rem;
  background-color: ${grey[50]};
  background-clip: padding-box;
  color: ${grey[900]};
  user-select: none;
  &:hover {
    background-color: ${grey[100]};
  }
  &:active {
    background-color: ${grey[100]};
  }
`
);

const StyledNumberFieldIncrement = styled(NumberField.Increment)(
  () => `
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  margin: 0;
  outline: 0;
  padding: 0;
  border: 1px solid ${grey[200]};
  border-radius: 0.375rem;
  background-color: ${grey[50]};
  background-clip: padding-box;
  color: ${grey[900]};
  user-select: none;
  &:hover {
    background-color: ${grey[100]};
  }
  &:active {
    background-color: ${grey[100]};
  }
`
);
