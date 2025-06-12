// components/contract/SmartReextraction.tsx
import { useState, useEffect } from 'react';
import { diffWords } from 'diff'; // npm install diff

interface SmartReextractionProps {
  contractId: string;
  originalContent: string;
  editedContent: string;
  onReextractionComplete: (updatedContract: any) => void;
}

export function SmartReextraction({
  contractId,
  originalContent,
  editedContent,
  onReextractionComplete
}: SmartReextractionProps) {
  const [showReextractionPrompt, setShowReextractionPrompt] = useState(false);
  const [isReextracting, setIsReextracting] = useState(false);
  const [significantChanges, setSignificantChanges] = useState<string[]>([]);

  useEffect(() => {
    // Analyze changes
    const changes = analyzeChanges(originalContent, editedContent);
    
    if (changes.significant) {
      setSignificantChanges(changes.affectedFields);
      setShowReextractionPrompt(true);
    }
  }, [editedContent]);

  const analyzeChanges = (original: string, edited: string) => {
    const diff = diffWords(original, edited);
    let addedWords = 0;
    let removedWords = 0;
    const affectedFields: string[] = [];

    diff.forEach(part => {
      if (part.added) {
        addedWords += part.value.split(/\s+/).length;
        
        // Check for key field indicators
        if (part.value.match(/\b[\w.-]+@[\w.-]+\.\w+\b/)) {
          affectedFields.push('email addresses');
        }
        if (part.value.match(/\$[\d,]+/)) {
          affectedFields.push('financial terms');
        }
        if (part.value.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/)) {
          affectedFields.push('dates');
        }
        if (part.value.match(/\b(Party|Client|Contractor|Company)\b/i)) {
          affectedFields.push('party information');
        }
      }
      if (part.removed) {
        removedWords += part.value.split(/\s+/).length;
      }
    });

    // Consider changes significant if:
    // - More than 20 words changed
    // - Key fields were affected
    // - More than 10% of content changed
    const totalWords = original.split(/\s+/).length;
    const changePercentage = (addedWords + removedWords) / totalWords;
    
    return {
      significant: (addedWords + removedWords > 20) || 
                   affectedFields.length > 0 || 
                   changePercentage > 0.1,
      affectedFields: [...new Set(affectedFields)],
      changePercentage
    };
  };

  const handleReextract = async () => {
    setIsReextracting(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/reextract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          editedContent,
          editedTitle: '', // Pass from parent if needed
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onReextractionComplete(data.contract);
        setShowReextractionPrompt(false);
      }
    } catch (error) {
      console.error('Re-extraction failed:', error);
    } finally {
      setIsReextracting(false);
    }
  };

  if (!showReextractionPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-md border border-blue-200 dark:border-blue-700">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            Significant Changes Detected
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Changes detected in: {significantChanges.join(', ')}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Would you like to update the contract metadata to reflect these changes?
          </p>
          <div className="mt-3 flex space-x-3">
            <button
              onClick={handleReextract}
              disabled={isReextracting}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isReextracting ? 'Updating...' : 'Update Metadata'}
            </button>
            <button
              onClick={() => setShowReextractionPrompt(false)}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}