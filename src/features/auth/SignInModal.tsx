import React from 'react';
import { SupabaseAuthModal } from './SupabaseAuthModal';

interface SignInModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({ isOpen = true, onClose }) => {
  return <SupabaseAuthModal isOpen={isOpen} onClose={onClose} />;
};

