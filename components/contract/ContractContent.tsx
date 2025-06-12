// components/contract/ContractContent.tsx
'use client';

import { Contract } from '@/types/Contract';

interface ContractContentProps {
  contract: Contract;
  editing: boolean;
  editedContent: string;
  onContentChange: (content: string) => void;
}

export function ContractContent({
  contract,
  editing,
  editedContent,
  onContentChange,
}: ContractContentProps) {
  return (
    <div 
      className="shadow-md rounded-lg p-8 mb-6"
      style={{ 
        backgroundColor: 'var(--background)',
        border: '1px solid rgba(128, 128, 128, 0.2)',
        color: 'var(--foreground)'
      }}
    >
      {editing ? (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
            Contract Content:
          </label>
          <textarea
            value={editedContent}
            onChange={(e) => onContentChange(e.target.value)}
            className="w-full h-96 p-4 border rounded-md resize-none"
            style={{ 
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
              border: '1px solid rgba(128, 128, 128, 0.3)'
            }}
            placeholder="Enter contract content..."
          />
          <p className="text-sm text-gray-500 mt-2">
            Use line breaks for paragraphs. HTML tags are not supported in edit mode.
          </p>
        </div>
      ) : (
        <>
          <div className="prose max-w-none" style={{ color: 'inherit' }}>
            <div 
              dangerouslySetInnerHTML={{ __html: contract.content.replace(/\n/g, '<br />') }}
              style={{ color: 'var(--foreground)' }}
            />
          </div>

          {contract.parties.some(p => p.signed) && (
            <div className="mt-12 pt-8 border-t-2 border-gray-300">
              <h3 className="text-lg font-semibold mb-6" style={{ color: 'var(--foreground)' }}>
                Signatures
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {contract.parties.map((party, index) => (
                  <div key={index} className="space-y-2">
                    {party.signed && party.signatureData ? (
                      <>
                        <div className="border-b-2 border-gray-400 pb-2">
                          <img 
                            src={party.signatureData} 
                            alt={`${party.name}'s signature`}
                            className="h-16 w-auto"
                            style={{ filter: 'contrast(1.2)' }}
                          />
                        </div>
                        <div className="text-sm" style={{ color: 'var(--foreground)' }}>
                          <p className="font-medium">{party.name}</p>
                          <p className="opacity-75">{party.role}</p>
                          <p className="opacity-75">
                            Signed on: {new Date(party.signedAt || '').toLocaleDateString()}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div>
                        <div className="border-b-2 border-gray-300 h-16 mb-2 flex items-end">
                          <span className="text-gray-400 text-sm pb-1">Awaiting signature</span>
                        </div>
                        <div className="text-sm" style={{ color: 'var(--foreground)' }}>
                          <p className="font-medium">{party.name}</p>
                          <p className="opacity-75">{party.role}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
