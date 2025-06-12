    // components/contract/ContractHeader.tsx
'use client';

import Link from 'next/link';
import { Contract } from '@/types/Contract';
import { Session } from 'next-auth';

interface ContractHeaderProps {
  contract: Contract;
  session: Session | null;
  editing: boolean;
  editedTitle: string;
  hasSignatures: boolean;
  downloadingPdf: boolean;
  onTitleChange: (title: string) => void;
  onEditClick: () => void;
  onDownloadPDF: () => void;
}

export function ContractHeader({
  contract,
  session,
  editing,
  editedTitle,
  hasSignatures,
  downloadingPdf,
  onTitleChange,
  onEditClick,
  onDownloadPDF,
}: ContractHeaderProps) {
  const canEdit = contract && contract.status !== 'completed' && session?.user?.id === contract.userId;

  return (
    <>
      <Link 
        href="/dashboard" 
        className="text-blue-600 hover:text-blue-800 mb-6 inline-block"
      >
        ← Back to Dashboard
      </Link>

      <div className="mb-6 flex justify-between items-center">
        {editing ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="text-3xl font-bold bg-transparent border-b-2 border-blue-500 outline-none flex-1 mr-4"
            style={{ color: 'var(--foreground)' }}
            placeholder="Contract Title"
          />
        ) : (
          <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
            {contract.title}
          </h1>
        )}
        
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm ${
            contract.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
            contract.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}>
            {contract.status}
          </span>
          
          <button
            onClick={onDownloadPDF}
            disabled={downloadingPdf}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Download contract as PDF"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {downloadingPdf ? 'Generating...' : 'Download PDF'}
          </button>
          
          {canEdit && !editing && (
            <button
              onClick={onEditClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              disabled={hasSignatures}
              title={hasSignatures ? "Cannot edit contract with existing signatures" : "Edit contract"}
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </>
  );
}
