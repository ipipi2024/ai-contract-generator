// app/api/contracts/[id]/sign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';
import Signature from '@/models/Signature';
import Contract from '@/models/Contract';
import { sendCompletedContract } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { partyEmail, signature, timestamp } = await request.json();

    if (!partyEmail || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Await params before use
    const { id } = await params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid contract ID format' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Find the contract
    const contract = await Contract.findById(id);

    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }

    // Find the party index
    const partyIndex = contract.parties.findIndex(
      (party: any) => party.email === partyEmail
    );

    if (partyIndex === -1) {
      return NextResponse.json(
        { error: 'Party not found in contract' },
        { status: 404 }
      );
    }

    // Check if party has already signed
    if (contract.parties[partyIndex].signed) {
      return NextResponse.json(
        { error: 'Party has already signed this contract' },
        { status: 400 }
      );
    }

    // Create signature record
    const signatureRecord = await Signature.create({
      contractId: contract._id,
      partyEmail: partyEmail,
      signatureData: signature,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      timestamp: new Date(timestamp),
    });

    // Update the party's signed status and add signature reference
    contract.parties[partyIndex].signed = true;
    contract.parties[partyIndex].signatureId = signatureRecord._id;
    contract.parties[partyIndex].signedAt = new Date(timestamp);
    contract.parties[partyIndex].signatureData = signature; // Store signature image data

    // Check if all parties have signed
    const allSigned = contract.parties.every((party: any) => party.signed);

    // If all parties have signed, update the contract status and send completion emails
    if (allSigned) {
      contract.status = 'completed';
      
      // Save the contract first
      await contract.save();

      // Get base URL for email links
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const host = request.headers.get('host') || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;

      // Send completion emails to all parties
      try {
        await sendCompletedContract({
          contractId: contract._id,
          contractTitle: contract.title,
          parties: contract.parties.map((p: any) => ({
            name: p.name,
            email: p.email,
            role: p.role,
          })),
          baseUrl,
        });
      } catch (emailError) {
        console.error('Error sending completion emails:', emailError);
        // Don't fail the signature process if email fails
      }
    } else {
      // Just save the contract with the new signature
      await contract.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Contract signed successfully',
      allPartiesSigned: allSigned,
      signatureId: signatureRecord._id.toString(),
    });

  } catch (error) {
    console.error('Error signing contract:', error);
    console.error('Full error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return NextResponse.json(
      { error: 'Failed to sign contract' },
      { status: 500 }
    );
  }
}