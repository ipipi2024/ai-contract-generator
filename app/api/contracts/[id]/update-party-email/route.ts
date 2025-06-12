// app/api/contracts/[id]/update-party-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Contract from '@/models/Contract';
import mongoose from 'mongoose';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'You must be logged in to update party information' },
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
    const { partyName, newEmail } = body;

    // Validate inputs
    if (!partyName || !newEmail) {
      return NextResponse.json(
        { error: 'Party name and new email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
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

    // Check if user owns the contract
    if (contract.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this contract' },
        { status: 403 }
      );
    }

    // Check contract status
    if (contract.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot update party information for completed contracts' },
        { status: 400 }
      );
    }

    // Find the party to update
    const partyIndex = contract.parties.findIndex((party: any) => party.name === partyName);
    if (partyIndex === -1) {
      return NextResponse.json(
        { error: 'Party not found in contract' },
        { status: 404 }
      );
    }

    // Check if party has already signed
    if (contract.parties[partyIndex].signed) {
      return NextResponse.json(
        { error: 'Cannot update email for a party that has already signed' },
        { status: 400 }
      );
    }

    // Check if email is already used by another party in this contract
    const emailExists = contract.parties.some((party: any, index: number) => 
      index !== partyIndex && party.email === newEmail
    );
    if (emailExists) {
      return NextResponse.json(
        { error: 'This email is already assigned to another party in this contract' },
        { status: 400 }
      );
    }

    // Update the party's email
    contract.parties[partyIndex].email = newEmail;
    
    // Save the contract
    await contract.save();

    return NextResponse.json({
      message: 'Party email updated successfully',
      party: contract.parties[partyIndex],
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating party email:', error);
    return NextResponse.json(
      { error: 'Failed to update party email' },
      { status: 500 }
    );
  }
}