"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";



export default function NewContractPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [contractType, setContractType] = useState("auto-detect");

  const contractTypes = {
    "auto-detect": "Auto-detect from prompt",
    service: "Service Agreement",
    nda: "Non-Disclosure Agreement",
    employment: "Employment Contract",
    lease: "Lease Agreement",
    partnership: "Partnership Agreement",
    consulting: "Consulting Agreement",
    freelance: "Freelance Contract",
    vendor: "Vendor Agreement",
    custom: "Custom Contract",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      alert("Please enter a description of the contract you need.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          contractType: contractType === "auto-detect" ? null : contractType,
        }),
      });

      if (response.ok) {
        const { contract } = await response.json();
        router.push(`/contracts/${contract.id}`);
      } else {
        const error = await response.json();
        alert(error.message || "Failed to generate contract");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while generating the contract");
    } finally {
      setLoading(false);
    }
  };

  const examplePrompts = [
    "Create a freelance web development contract for building an e-commerce website. Payment is $5,000 in two milestones. Client is ABC Corp, developer is John Smith. 6-week timeline.",
    "Generate an NDA between TechCorp and Jane Doe for sharing confidential product information. 2-year term, mutual disclosure.",
    "Service agreement for monthly social media management. $2,000/month, 6-month initial term with auto-renewal. Company: Marketing Plus, Client: Local Restaurant.",
    "Employment contract for Senior Software Engineer position. $120,000 salary, remote work allowed, standard benefits, 2-week notice period.",
    "Lease agreement for office space at 123 Business Ave. $3,000/month, 2-year term, tenant improvements allowed."
  ];

  const insertExamplePrompt = (example: string) => {
    setPrompt(example);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Generate Contract with AI
          </h1>
          <p className="text-gray-600 mt-2">
            Simply describe what kind of contract you need, and our AI will generate a professional legal document for you.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-md p-6 space-y-6"
        >
          {/* Contract Type (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contract Type (Optional)
            </label>
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(contractTypes).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Leave as "Auto-detect" to let AI determine the contract type from your description
            </p>
          </div>

          {/* Contract Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe Your Contract
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 h-40 resize-none"
              placeholder="Describe the contract you need in detail. Include:
• Type of agreement (service, NDA, employment, etc.)
• Parties involved (names, companies, roles)
• Key terms (payment, timeline, deliverables)
• Special requirements or conditions
• Any specific clauses you need

Example: 'Create a freelance contract between ABC Corp and John Smith for website development. $5,000 payment in two milestones, 6-week timeline, includes hosting setup and training.'"
              required
            />
            <div className="text-sm text-gray-500 mt-2 flex justify-between">
              <span>{prompt.length} characters</span>
              <span>Be as detailed as possible for better results</span>
            </div>
          </div>

          {/* Example Prompts */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-3">Example Prompts</h3>
            <div className="space-y-2">
              {examplePrompts.map((example, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => insertExamplePrompt(example)}
                  className="block w-full text-left p-2 text-sm text-blue-700 bg-white border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* AI Info Box */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-purple-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium text-purple-900">
                  AI-Powered Contract Generation
                </h4>
                <p className="text-sm text-purple-800 mt-1">
                  Our advanced AI will analyze your description and automatically:
                </p>
                <ul className="text-sm text-purple-700 mt-2 list-disc list-inside space-y-1">
                  <li>Identify the contract type and structure</li>
                  <li>Extract party information and roles</li>
                  <li>Generate appropriate legal clauses</li>
                  <li>Include standard terms and conditions</li>
                  <li>Add dispute resolution and termination clauses</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/dashboard"
              className="px-6 py-3 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generating Contract...
                </span>
              ) : (
                "✨ Generate Contract with AI"
              )}
            </button>
          </div>
        </form>

        {/* Help Section */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6 border">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Tips for Better AI-Generated Contracts
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Include These Details:</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-0.5">•</span>
                  Full names and company details of all parties
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-0.5">•</span>
                  Specific payment amounts and schedules
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-0.5">•</span>
                  Clear deliverables and milestones
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-0.5">•</span>
                  Timeline and important dates
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">For Best Results:</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2 mt-0.5">•</span>
                  Be specific about terms and conditions
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2 mt-0.5">•</span>
                  Mention any special requirements
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2 mt-0.5">•</span>
                  Include jurisdiction or governing law
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2 mt-0.5">•</span>
                  Note any industry-specific needs
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}