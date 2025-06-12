// app/contracts/sign/[id]/success/page.tsx
'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function SignatureSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const isCompleted = searchParams.get('completed') === 'true';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-8 text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <svg className="w-20 h-20 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold mb-4">
            {isCompleted ? 'Contract Fully Executed!' : 'Successfully Signed!'}
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {isCompleted 
              ? 'All parties have now signed this contract. It is legally binding and complete. All parties will receive a copy via email.'
              : 'Your signature has been recorded. You will receive a copy of the fully executed contract once all parties have signed.'
            }
          </p>

          {/* Additional Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4 mb-6">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-blue-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="ml-3 text-sm text-blue-800 dark:text-blue-200">
                A confirmation email has been sent to your registered email address with the contract details.
              </p>
            </div>
          </div>

          {/* Only show download option if contract is fully completed */}
          {isCompleted && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4 mb-6">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="ml-3 text-sm text-green-800 dark:text-green-200">
                  The contract is now fully executed. You can view and download the completed contract with all signatures.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href={`/contracts/${params.id}`}
              className="block w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              View Contract {isCompleted && '& Download PDF'}
            </Link>
            
            <Link
              href="/dashboard"
              className="block w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-3 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Go to Dashboard
            </Link>
          </div>

          {/* Footer Note */}
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            {isCompleted 
              ? 'Thank you for completing this contract. If you have any questions, please contact the contract creator.'
              : 'You will be notified via email once all parties have signed the contract.'
            }
          </p>
        </div>
      </div>
    </div>
  );
}