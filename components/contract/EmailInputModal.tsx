// components/contract/EmailInputModal.tsx
'use client';

import { Party } from '@/types/Contract';

interface EmailInputModalProps {
  isOpen: boolean;
  selectedParty: Party | null;
  emailInput: string;
  updatingEmail: boolean;
  onEmailChange: (email: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function EmailInputModal({
  isOpen,
  selectedParty,
  emailInput,
  updatingEmail,
  onEmailChange,
  onClose,
  onSave,
}: EmailInputModalProps) {
  if (!isOpen || !selectedParty) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">Add Email Address</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Please enter the email address for <strong>{selectedParty.name}</strong> ({selectedParty.role}):
        </p>
        <input
          type="email"
          value={emailInput}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="Enter email address"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          style={{ 
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)'
          }}
          autoFocus
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={updatingEmail || !emailInput}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {updatingEmail ? 'Updating...' : 'Save & Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
}