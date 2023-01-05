import { useEffect, useState } from 'react';

type StateType = {
  state: any;
};

export type DisclosureType<StateType = any> = {
  isOpen: boolean;
  open: (state?: StateType) => void;
  close: (state?: StateType) => void;
  toggle: (state?: StateType) => void;
  state?: StateType;
};

type DisclosureProps = {
  opened: boolean;
  onOpen?: () => void;
  onClose?: () => void;
};

export const useDisclosure = ({
  opened: initialState,
  onOpen,
  onClose,
}: DisclosureProps): DisclosureType => {
  const [isOpen, setIsOpen] = useState(initialState);
  const [state, setState] = useState<StateType>({ state: null });

  useEffect(() => {
    if (isOpen !== initialState) {
      setIsOpen(initialState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialState]);

  const open = (state?: StateType) => {
    setIsOpen(true);
    if (state) setState(state);
    if (onOpen) {
      onOpen();
    }
  };

  const close = (state?: StateType) => {
    setIsOpen(false);
    if (state) setState(state);
    if (onClose) {
      onClose();
    }
  };

  const toggle = () => (isOpen ? close() : open());

  return { isOpen, open, close, toggle, ...state };
};
