// components/contract/SignatureStatus.tsx
'use client';

import Link from 'next/link';
import { Contract, Party } from '@/types/Contract';

interface SignatureStatusProps {
  contract: Contract;
  isOwner: boolean;
  sendingEmail: boolean;
  onCopyLink: (party: Party) => void;
  onEmailClick: (party: Party) => void;
}

export function SignatureStatus({
  contract,
  isOwner,
  sendingEmail,
  onCopyLink,
  onEmailClick,
}: SignatureStatusProps) {
  return (
    <div 
      className="rounded-lg p-6"
      style={{ 
        backgroundColor: 'rgba(128, 128, 128, 0.1)',
        border: '1px solid rgba(128, 128, 128, 0.1)'
      }}
    >
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
        Signature Status
      </h2>
      <div className="space-y-3">
        {contract.parties.map((party, index) => (
          <div key={index} className="flex justify-between items-center">
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                {party.name}
              </p>
              <p 
                className="text-sm"
                style={{ 
                  color: 'var(--foreground)',
                  opacity: 0.7 
                }}
              >
                {party.role} - {party.email && party.email.trim() !== '' ? party.email : 'Not provided'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {party.signed ? (
                <span className="text-green-600 dark:text-green-400 flex items-center">
                  <svg className="w-5 h-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Signed {party.signedAt && `on ${new Date(party.signedAt).toLocaleDateString()}`}
                </span>
              ) : (
                <>
                  {party.email && party.email !== 'Not provided' && party.email.trim() !== '' && (
                    <Link
                      href={`/contracts/sign/${contract._id}?email=${encodeURIComponent(party.email)}`}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors font-medium"
                    >
                      Sign
                    </Link>
                  )}
                  {isOwner && (
                    <>
                      <button
                        onClick={() => onCopyLink(party)}
                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Copy signature link"
                        disabled={!party.email || party.email.trim() === ''}
                      >
                        Copy Link
                      </button>
                      <button
                        onClick={() => onEmailClick(party)}
                        disabled={sendingEmail}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                        title={party.email && party.email.trim() !== '' ? "Send email to this party" : "Add email and send"}
                      >
                        {(!party.email || party.email.trim() === '') ? 'Add Email' : 'Email'}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
