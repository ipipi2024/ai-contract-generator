// app/api/contracts/[id]/reextract/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';
import { reextractContractRequirements } from '@/lib/chatGPT';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params promise
    const params = await context.params;
    const { id } = params;
    
    console.log('Reextract route called for contract:', id);
    
    const session = await getServerSession(authOptions);
    console.log('Session user ID:', session?.user?.id);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'You must be logged in' },
        { status: 401 }
      );
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid contract ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { editedContent, editedTitle } = body;

    if (!editedContent) {
      return NextResponse.json(
        { error: 'Edited content is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const db = mongoose.connection.db;

    if (!db) {
      console.error('Database connection failed');
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Get current contract
    console.log('Looking for contract with ID:', id, 'and userId:', session.user.id);
    
    const contract = await db.collection('contracts').findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(session.user.id)
    });

    console.log('Contract found:', !!contract);

    if (!contract) {
      // Try finding without userId to see if contract exists
      const contractExists = await db.collection('contracts').findOne({
        _id: new mongoose.Types.ObjectId(id)
      });
      
      if (contractExists) {
        console.log('Contract exists but userId mismatch. Contract userId:', contractExists.userId, 'Session userId:', session.user.id);
        return NextResponse.json(
          { error: 'Unauthorized: You do not have access to this contract' },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }

    // Check if contract is completed
    if (contract.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot modify completed contracts' },
        { status: 400 }
      );
    }

    // Check for existing signatures
    const hasSignatures = contract.parties?.some((party: any) => party.signed);
    if (hasSignatures) {
      return NextResponse.json(
        { error: 'Cannot modify contract with existing signatures' },
        { status: 400 }
      );
    }

    console.log('Calling reextractContractRequirements...');

    // Re-extract requirements using AI
    const reextractedData = await reextractContractRequirements({
      editedContent,
      editedTitle: editedTitle || contract.title,
      originalRequirements: contract.requirements,
      contractType: contract.type
    });

    console.log('Reextraction completed:', reextractedData);

    // Compare and merge changes
    const updatedRequirements = {
      ...contract.requirements,
      ...reextractedData.requirements,
      lastExtraction: new Date(),
      extractionConfidence: reextractedData.confidence
    };

    // Update parties if extracted
    const updatedParties = reextractedData.parties.map((newParty: any) => {
      // Find existing party by name
      const existingParty = contract.parties.find(
        (p: any) => p.name.toLowerCase() === newParty.name.toLowerCase()
      );
      
      if (existingParty) {
        // Preserve existing data, update only if new data is available
        return {
          ...existingParty,
          email: newParty.email || existingParty.email,
          role: newParty.role || existingParty.role,
          // Preserve signature status
          signed: existingParty.signed,
          signedAt: existingParty.signedAt
        };
      }
      
      // New party
      return {
        name: newParty.name,
        email: newParty.email || '',
        role: newParty.role || 'party',
        signed: false,
        signedAt: null
      };
    });

    // Update contract
    const updateData = {
      title: editedTitle || contract.title,
      content: editedContent,
      requirements: updatedRequirements,
      parties: updatedParties,
      updatedAt: new Date(),
      lastReextraction: new Date(),
      reextractionCount: (contract.reextractionCount || 0) + 1,
      syncStatus: 'synced'
    };

    const result = await db.collection('contracts').updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to update contract' },
        { status: 500 }
      );
    }

    // Return updated contract with change summary
    const updatedContract = await db.collection('contracts').findOne({
      _id: new mongoose.Types.ObjectId(id)
    });

    return NextResponse.json({
      success: true,
      contract: updatedContract,
      changes: reextractedData.changes,
      confidence: reextractedData.confidence
    }, { status: 200 });

  } catch (error) {
    console.error('Error re-extracting requirements:', error);
    return NextResponse.json(
      { error: 'Failed to re-extract contract requirements' },
      { status: 500 }
    );
  }
}