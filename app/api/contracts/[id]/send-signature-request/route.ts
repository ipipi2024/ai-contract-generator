// app/api/contracts/[id]/send-signature-request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Contract from '@/models/Contract';
import { sendSignatureRequest } from '@/lib/email';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'You must be logged in to send signature requests' },
        { status: 401 }
      );
    }

    // Await params
    const { id } = await params;
    
    // Validate contract ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid contract ID format' },
        { status: 400 }
      );
    }

    // Get request body
    const body = await request.json();
    const { partyEmail, sendToAll = false } = body;

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

    // Check if user owns the contract
    if (contract.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to send signature requests for this contract' },
        { status: 403 }
      );
    }

    // Check contract status
    if (contract.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot send signature requests for completed contracts' },
        { status: 400 }
      );
    }

    // Get base URL from request
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Determine which parties to send to
    let partiesToEmail = [];
    
    if (sendToAll) {
      // Send to all unsigned parties WITH VALID EMAILS
      partiesToEmail = contract.parties.filter((party: any) => 
        !party.signed && party.email && party.email.trim() !== ''
      );
    } else if (partyEmail) {
      // Validate the specific party email
      if (!partyEmail.trim()) {
        return NextResponse.json(
          { error: 'Invalid email address provided' },
          { status: 400 }
        );
      }
      
      // Send to specific party
      const party = contract.parties.find((p: any) => p.email === partyEmail);
      if (!party) {
        return NextResponse.json(
          { error: 'Party not found in contract' },
          { status: 404 }
        );
      }
      if (party.signed) {
        return NextResponse.json(
          { error: 'This party has already signed the contract' },
          { status: 400 }
        );
      }
      if (!party.email || party.email.trim() === '') {
        return NextResponse.json(
          { error: 'This party does not have a valid email address. Please update their email first.' },
          { status: 400 }
        );
      }
      partiesToEmail = [party];
    } else {
      return NextResponse.json(
        { error: 'Please specify a party email or set sendToAll to true' },
        { status: 400 }
      );
    }

    if (partiesToEmail.length === 0) {
      return NextResponse.json(
        { error: 'No unsigned parties with valid email addresses to send signature requests to' },
        { status: 400 }
      );
    }

    // Send emails
    const results = await Promise.all(
      partiesToEmail.map(async (party: any) => {
        try {
          await sendSignatureRequest({
            contractId: contract._id,
            contractTitle: contract.title,
            party: {
              name: party.name,
              email: party.email,
              role: party.role,
            },
            senderName: session.user.name || session.user.email,
            baseUrl,
          });
          return { email: party.email, success: true };
        } catch (error) {
          console.error(`Failed to send email to ${party.email}:`, error);
          return { email: party.email, success: false, error: error.message };
        }
      })
    );

    // Update contract status to pending if it was draft
    if (contract.status === 'draft') {
      contract.status = 'pending';
      await contract.save();
    }

    // Count successes and failures
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Signature requests sent successfully`,
      results: {
        sent: successful,
        failed: failed,
        details: results,
      },
      contractStatus: contract.status,
    }, { status: 200 });

  } catch (error) {
    console.error('Error sending signature requests:', error);
    return NextResponse.json(
      { error: 'Failed to send signature requests' },
      { status: 500 }
    );
  }
}