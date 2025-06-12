// app/contracts/[id]/page.tsx (Main page component)
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Contract, Party } from "@/types/contract";
import { generateContractPDF } from "@/utils/contractPdfGenerator";
import { ContractHeader } from "@/components/contract/ContractHeader";
import { ContractContent } from "@/components/contract/ContractContent";
import { SignatureStatus } from "@/components/contract/SignatureStatus";
import { EmailModal } from "@/components/contract/EmailModal";
import { EmailInputModal } from "@/components/contract/EmailInputModal";

export default function ContractPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [emailInputModalOpen, setEmailInputModalOpen] = useState(false);
  const [selectedPartyForEmail, setSelectedPartyForEmail] =
    useState<Party | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    fetchContract();
  }, []);

  useEffect(() => {
    if (contract) {
      setEditedTitle(contract.title);
      setEditedContent(contract.content);
    }
  }, [contract]);

  const fetchContract = async () => {
    try {
      const response = await fetch(`/api/contracts/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setContract(data.contract);
      }
    } catch (error) {
      console.error("Error fetching contract:", error);
    } finally {
      setLoading(false);
    }
  };

  // Replace the handleSave function in app/contracts/[id]/page.tsx

  const handleSave = async () => {
    if (!contract) return;

    setSaving(true);
    try {
      // First, save the content changes
      const response = await fetch(`/api/contracts/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editedTitle,
          content: editedContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to save changes: ${errorData.error || "Unknown error"}`);
        return;
      }

      // Then, re-extract requirements from the edited content
      const reextractResponse = await fetch(
        `/api/contracts/${params.id}/reextract`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            editedTitle,
            editedContent,
          }),
        }
      );

      if (reextractResponse.ok) {
        const {
          contract: updatedContract,
          changes,
          confidence,
        } = await reextractResponse.json();

        // Update local state with the re-extracted contract
        setContract(updatedContract);

        // Show change summary if significant changes detected
        if (
          changes &&
          (changes.added.length > 0 || changes.modified.length > 0)
        ) {
          showChangesSummary(changes, confidence);
        }
      } else {
        // If re-extraction fails, still update with saved content
        setContract({
          ...contract,
          title: editedTitle,
          content: editedContent,
        });

        console.error("Re-extraction failed, but content was saved");
      }

      setEditing(false);
    } catch (error) {
      console.error("Error saving contract:", error);
      alert("An error occurred while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Add this helper function to show changes summary
  const showChangesSummary = (changes: any, confidence: number) => {
    const summaryItems = [];

    if (changes.added.length > 0) {
      summaryItems.push(`Added: ${changes.added.join(", ")}`);
    }
    if (changes.modified.length > 0) {
      summaryItems.push(`Modified: ${changes.modified.join(", ")}`);
    }
    if (changes.removed.length > 0) {
      summaryItems.push(`Removed: ${changes.removed.join(", ")}`);
    }

    if (summaryItems.length > 0) {
      // You can replace this with a proper toast notification
      alert(
        `Contract requirements updated (${Math.round(
          confidence * 100
        )}% confidence):\n\n${summaryItems.join("\n")}`
      );
    }
  };

  const handleCancel = () => {
    if (contract) {
      setEditedTitle(contract.title);
      setEditedContent(contract.content);
    }
    setEditing(false);
  };

  const handleSendSignatureRequest = async (
    partyEmail: string | null = null
  ) => {
    if (!contract) return;

    setSendingEmail(true);
    try {
      const response = await fetch(
        `/api/contracts/${params.id}/send-signature-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            partyEmail: partyEmail,
            sendToAll: !partyEmail,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(`Signature request${partyEmail ? "" : "s"} sent successfully!`);

        if (data.contractStatus !== contract.status) {
          setContract({ ...contract, status: data.contractStatus });
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to send: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error sending signature request:", error);
      alert("An error occurred while sending. Please try again.");
    } finally {
      setSendingEmail(false);
      setEmailModalOpen(false);
      setSelectedParty(null);
    }
  };

  const handleUpdatePartyEmail = async () => {
    if (!contract || !selectedPartyForEmail || !emailInput) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput)) {
      alert("Please enter a valid email address");
      return;
    }

    setUpdatingEmail(true);
    try {
      const response = await fetch(
        `/api/contracts/${params.id}/update-party-email`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            partyName: selectedPartyForEmail.name,
            newEmail: emailInput,
          }),
        }
      );

      if (response.ok) {
        const updatedParties = contract.parties.map((party) =>
          party.name === selectedPartyForEmail.name
            ? { ...party, email: emailInput }
            : party
        );
        setContract({ ...contract, parties: updatedParties });

        setEmailInputModalOpen(false);
        setEmailInput("");

        openEmailModal(emailInput);
      } else {
        const errorData = await response.json();
        alert(`Failed to update email: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error updating party email:", error);
      alert("An error occurred while updating email. Please try again.");
    } finally {
      setUpdatingEmail(false);
    }
  };

  const openEmailModal = (partyEmail: string | null = null) => {
    setSelectedParty(partyEmail);
    setEmailModalOpen(true);
  };

  const handleEmailButtonClick = (party: Party) => {
    const emailIsEmpty = !party.email || party.email.toString().trim() === "";

    if (emailIsEmpty) {
      setSelectedPartyForEmail(party);
      setEmailInput("");
      setEmailInputModalOpen(true);
    } else {
      openEmailModal(party.email);
    }
  };

  const copySignatureLink = (party: Party) => {
    if (!party.email || party.email.trim() === "") {
      alert("Please add an email address for this party first");
      return;
    }
    const link = `${window.location.origin}/contracts/sign/${
      contract?._id
    }?email=${encodeURIComponent(party.email)}`;
    navigator.clipboard.writeText(link);
    alert("Signature link copied to clipboard!");
  };

  const downloadPDF = async () => {
    if (!contract) return;

    setDownloadingPdf(true);
    try {
      await generateContractPDF(contract);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const canEdit =
    contract &&
    contract.status !== "completed" &&
    session?.user?.id === contract.userId;
  const hasSignatures =
    contract?.parties.some((party) => party.signed) ?? false;
  const unsignedParties =
    contract?.parties.filter((party) => !party.signed) || [];
  const unsignedPartiesWithEmail = unsignedParties.filter(
    (party) => party.email && party.email.trim() !== ""
  );
  const isOwner = !!(contract && session?.user?.id === contract.userId);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!contract) return <div className="p-8">Contract not found</div>;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="max-w-4xl mx-auto p-8">
        <ContractHeader
          contract={contract}
          session={session}
          editing={editing}
          editedTitle={editedTitle}
          hasSignatures={hasSignatures}
          downloadingPdf={downloadingPdf}
          onTitleChange={setEditedTitle}
          onEditClick={() => setEditing(true)}
          onDownloadPDF={downloadPDF}
        />

        {/* Warning for contracts with signatures */}
        {hasSignatures && canEdit && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  This contract has existing signatures and cannot be edited.
                  Create a new version if changes are needed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Edit Controls */}
        {editing && (
          <div className="mb-6 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                saving
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        )}

        <ContractContent
          contract={contract}
          editing={editing}
          editedContent={editedContent}
          onContentChange={setEditedContent}
        />

        {/* Email Actions for Owner */}
        {isOwner &&
          unsignedParties.length > 0 &&
          contract.status !== "completed" && (
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
              <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">
                Send Signature Requests
              </h3>
              {unsignedPartiesWithEmail.length === 0 ? (
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Please add email addresses for the parties below before
                  sending signature requests.
                </p>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => openEmailModal(null)}
                    disabled={
                      sendingEmail || unsignedPartiesWithEmail.length === 0
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingEmail
                      ? "Sending..."
                      : `Email ${unsignedPartiesWithEmail.length} Part${
                          unsignedPartiesWithEmail.length > 1 ? "ies" : "y"
                        } with Email`}
                  </button>
                  <button
                    onClick={() => {
                      if (unsignedPartiesWithEmail.length === 1) {
                        copySignatureLink(unsignedPartiesWithEmail[0]);
                      } else {
                        alert(
                          "Please use individual copy buttons for multiple parties"
                        );
                      }
                    }}
                    disabled={unsignedPartiesWithEmail.length === 0}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Copy Signature Link
                  </button>
                </div>
              )}
            </div>
          )}

        <SignatureStatus
          contract={contract}
          isOwner={isOwner}
          sendingEmail={sendingEmail}
          onCopyLink={copySignatureLink}
          onEmailClick={handleEmailButtonClick}
        />

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {editing
                  ? "You are currently editing this contract. Save your changes or cancel to exit edit mode."
                  : "All parties must sign this contract for it to be marked as completed. Each party will receive a copy once all signatures are collected."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <EmailInputModal
        isOpen={emailInputModalOpen}
        selectedParty={selectedPartyForEmail}
        emailInput={emailInput}
        updatingEmail={updatingEmail}
        onEmailChange={setEmailInput}
        onClose={() => {
          setEmailInputModalOpen(false);
          setSelectedPartyForEmail(null);
          setEmailInput("");
        }}
        onSave={handleUpdatePartyEmail}
      />

      <EmailModal
        isOpen={emailModalOpen}
        selectedParty={selectedParty}
        unsignedPartiesWithEmail={unsignedPartiesWithEmail}
        sendingEmail={sendingEmail}
        onClose={() => {
          setEmailModalOpen(false);
          setSelectedParty(null);
        }}
        onSend={() => handleSendSignatureRequest(selectedParty)}
      />
    </div>
  );
}
