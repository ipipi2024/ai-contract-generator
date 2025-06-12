// components/contract/EmailModal.tsx
'use client';

import { Party } from '@/types/Contract';

interface EmailModalProps {
  isOpen: boolean;
  selectedParty: string | null;
  unsignedPartiesWithEmail: Party[];
  sendingEmail: boolean;
  onClose: () => void;
  onSend: () => void;
}

export function EmailModal({
  isOpen,
  selectedParty,
  unsignedPartiesWithEmail,
  sendingEmail,
  onClose,
  onSend,
}: EmailModalProps) {
  if (!isOpen) return null;

  const unsignedParties = unsignedPartiesWithEmail;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">Send Signature Request{selectedParty ? '' : 's'}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {selectedParty ? (
            <>Send email signature request to:</>
          ) : (
            <>Send email signature requests to all parties with email addresses ({unsignedPartiesWithEmail.length} total)?</>
          )}
        </p>
        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
          {selectedParty ? (
            <div className="text-sm font-medium">
              {unsignedParties.find(p => p.email === selectedParty)?.name} ({selectedParty})
            </div>
          ) : (
            unsignedPartiesWithEmail.map((party, index) => (
              <div key={index} className="text-sm">
                • {party.name} ({party.email})
              </div>
            ))
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSend}
            disabled={sendingEmail}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {sendingEmail ? 'Sending...' : (selectedParty ? 'Send' : 'Send All')}
          </button>
        </div>
      </div>
    </div>
  );
}
