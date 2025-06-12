// app/contracts/sign/[id]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Contract {
  _id: string;
  title: string;
  content: string;
  parties: Array<{
    name: string;
    email: string;
    role: string;
    signed: boolean;
    signedAt?: string;
    signatureData?: string;
  }>;
  status: string;
}

export default function SignContractPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const partyEmail = searchParams.get('email') || '';
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [agreed, setAgreed] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentParty, setCurrentParty] = useState<any>(null);

  useEffect(() => {
    fetchContract();
  }, []);

  useEffect(() => {
    if (contract && partyEmail) {
      const party = contract.parties.find(p => p.email === partyEmail);
      setCurrentParty(party);
    }
  }, [contract, partyEmail]);

  const fetchContract = async () => {
    try {
      const response = await fetch(`/api/contracts/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setContract(data.contract);
      } else {
        console.error('Failed to fetch contract');
      }
    } catch (error) {
      console.error('Error fetching contract:', error);
    } finally {
      setLoading(false);
    }
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Set drawing style
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const isCanvasEmpty = (): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return true;

    const ctx = canvas.getContext('2d');
    if (!ctx) return true;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] !== 0) { // Check alpha channel
        return false;
      }
    }
    return true;
  };

  const handleSign = async () => {
    if (!agreed) {
      alert('Please check the agreement box before signing');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || isCanvasEmpty()) {
      alert('Please provide your signature');
      return;
    }

    setSigning(true);

    try {
      const signatureData = canvas.toDataURL('image/png');
      const timestamp = new Date().toISOString();

      const response = await fetch(`/api/contracts/${params.id}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partyEmail,
          signature: signatureData,
          timestamp,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.allPartiesSigned) {
          router.push(`/contracts/sign/${params.id}/success?completed=true`);
        } else {
          router.push(`/contracts/sign/${params.id}/success`);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to sign contract');
      }
    } catch (error) {
      console.error('Error signing contract:', error);
      alert('An error occurred while signing. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Contract Not Found</h1>
          <p className="text-gray-600">The contract you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  if (!currentParty) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Signature Link</h1>
          <p className="text-gray-600">This signature link is not valid for your email address.</p>
        </div>
      </div>
    );
  }

  if (currentParty.signed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-4">Already Signed</h1>
          <p className="text-gray-600 mb-4">You have already signed this contract on {new Date(currentParty.signedAt).toLocaleDateString()}</p>
          <Link href={`/contracts/${contract._id}`} className="text-blue-600 hover:text-blue-800">
            View Contract
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{contract.title}</h1>
          <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
            <span>Signing as: <strong>{currentParty.name}</strong></span>
            <span>•</span>
            <span>Role: <strong>{currentParty.role}</strong></span>
          </div>
        </div>

        {/* Contract Content */}
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-8 mb-8">
          <h2 className="text-xl font-semibold mb-4">Contract Terms</h2>
          <div className="prose dark:prose-invert max-w-none mb-8">
            <div dangerouslySetInnerHTML={{ __html: contract.content.replace(/\n/g, '<br />') }} />
          </div>

          {/* Other Parties */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-3">Contract Parties:</h3>
            <div className="space-y-2">
              {contract.parties.map((party, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{party.name}</span>
                    <span className="text-gray-500 ml-2">({party.role})</span>
                  </div>
                  {party.signed && (
                    <span className="text-green-600 text-sm flex items-center">
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Signed
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Signature Section */}
        {!showSignaturePad ? (
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-8">
            <h2 className="text-xl font-semibold mb-4">Ready to Sign?</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              By signing this contract, you agree to be legally bound by its terms and conditions.
            </p>
            <button
              onClick={() => {
                setShowSignaturePad(true);
                setTimeout(initCanvas, 100);
              }}
              className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Proceed to Sign
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-8">
            <h2 className="text-xl font-semibold mb-4">Electronic Signature</h2>
            
            {/* Agreement Checkbox */}
            <div className="mb-6">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 mr-3"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  I have read and agree to the terms of this contract. I understand that my electronic signature
                  is legally binding and equivalent to my handwritten signature.
                </span>
              </label>
            </div>

            {/* Signature Pad */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Please sign below:</label>
              <div className="border-2 border-gray-300 rounded-lg p-2 bg-gray-50 dark:bg-gray-900">
                <canvas
                  ref={canvasRef}
                  className="w-full h-48 bg-white cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={clearSignature}
                  className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Clear Signature
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setShowSignaturePad(false)}
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSign}
                disabled={signing || !agreed}
                className={`flex-1 px-6 py-3 rounded-md font-medium transition-colors ${
                  signing || !agreed
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {signing ? 'Signing...' : 'Sign Contract'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}