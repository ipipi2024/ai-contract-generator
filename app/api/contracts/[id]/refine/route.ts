// app/api/contracts/[id]/refine/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Contract from '@/models/Contract';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { currentContent, refinementPrompt, title } = await request.json();

    if (!currentContent || !refinementPrompt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Check if contract exists
    const existingContract = await Contract.findById(id);
    
    if (!existingContract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }

    // Check if contract has been signed
    const hasSigned = existingContract.parties.some((party: any) => party.signed);
    if (hasSigned) {
      return NextResponse.json(
        { error: 'Cannot refine a contract that has been signed' },
        { status: 400 }
      );
    }

    // Call AI service to refine the contract
    const refinedContract = await refineContractWithAI({
      currentContent,
      refinementPrompt,
      title
    });

    // DON'T save to database - just return the refined content
    // The frontend will handle saving through the regular save mechanism

    return NextResponse.json({
      refinedContent: refinedContract.content,
      refinedTitle: refinedContract.title || title,
    });

  } catch (error) {
    console.error('Error refining contract:', error);
    return NextResponse.json(
      { error: 'Failed to refine contract' },
      { status: 500 }
    );
  }
}

async function refineContractWithAI({
  currentContent,
  refinementPrompt,
  title
}: {
  currentContent: string;
  refinementPrompt: string;
  title: string;
}) {
  const systemPrompt = `You are a legal contract expert. You will be given an existing contract and a refinement request. 
  Your task is to modify the contract according to the refinement request while:
  1. Maintaining the overall structure and format
  2. Preserving all existing important terms unless specifically asked to change
  3. Ensuring legal validity and clarity
  4. Adding the requested changes in the appropriate sections
  5. Maintaining consistency throughout the document
  
  Return the refined contract content. If the refinement suggests a title change, also suggest a new title.`;

  const userPrompt = `Current Contract Title: ${title}
  
Current Contract Content:
${currentContent}

Refinement Request:
${refinementPrompt}

Please refine this contract according to the request above.`;

  // Replace with your actual AI implementation
  return {
    content: currentContent + "\n\n[AI Refinement would be applied here based on: " + refinementPrompt + "]",
    title: title
  };
}