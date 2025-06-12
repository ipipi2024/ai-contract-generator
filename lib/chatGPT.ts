// lib/chatgpt.ts

import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Type definitions
export interface ContractGenerationParams {
  prompt: string;
  contractType?: string | null;
}

export interface ContractRefinementParams {
  currentContent: string;
  refinementPrompt: string;
  title: string;
}

export interface GeneratedContract {
  title: string;
  type: string;
  content: string;
  parties: Array<{
    name: string;
    email: string;
    role: string;
    signed: boolean;
  }>;
  extractedData?: any;
}

export interface RefinedContract {
  content: string;
  title: string;
}

export interface ReextractionParams {
  editedContent: string;
  editedTitle: string;
  originalRequirements: any;
  contractType: string;
}

export interface ReextractedData {
  requirements: any;
  parties: Array<{
    name: string;
    email: string;
    role: string;
  }>;
  changes: {
    added: string[];
    modified: string[];
    removed: string[];
  };
  confidence: number;
}

/**
 * Generate a contract from a natural language prompt
 */
export async function generateContractFromPrompt({
  prompt,
  contractType
}: ContractGenerationParams): Promise<GeneratedContract> {
  const systemPrompt = `You are a legal contract generation expert. Your task is to create professional, legally sound contracts based on user descriptions.

When generating a contract:
1. Extract key information from the prompt (parties, terms, obligations, etc.)
2. Create a properly structured legal document with standard sections
3. Use clear, precise legal language
4. Include all necessary clauses for the contract type
5. Add placeholder underscores (___________) for any missing information
6. Format the contract with clear sections and headers

IMPORTANT: When extracting party information:
- If an email address is provided in the prompt, include it
- If NO email address is provided, set the email field to an empty string ""
- Never use placeholder emails or make up email addresses

Standard contract structure:
- Title
- Date
- Parties and Background
- Scope and Terms
- Payment Terms (if applicable)
- Duration/Timeline
- Obligations and Responsibilities
- Confidentiality (if needed)
- Termination Clause
- Dispute Resolution
- Signatures

Return a JSON object with:
- title: A descriptive title for the contract
- type: The contract type (employment, service, NDA, lease, etc.)
- content: The full contract text
- parties: Array of party objects with name, email (empty string if not provided), role, and signed status
- extractedData: Any additional extracted information`;

  const userPrompt = `Generate a ${contractType || 'appropriate'} contract based on this description:

${prompt}

Return the complete contract in JSON format. Remember: if no email is provided for a party, set their email field to an empty string "".`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    const parsedResponse = JSON.parse(content);
    
    // Ensure all required fields are present and handle missing emails
    const parties = (parsedResponse.parties || []).map((party: any) => ({
      name: party.name || '',
      email: party.email || '', // Default to empty string if email is missing
      role: party.role || '',
      signed: party.signed || false
    }));
    
    return {
      title: parsedResponse.title || `Contract - ${new Date().toLocaleDateString()}`,
      type: parsedResponse.type || contractType || 'general',
      content: parsedResponse.content || '',
      parties,
      extractedData: parsedResponse.extractedData || {}
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('Failed to generate contract with AI');
  }
}

/**
 * Refine an existing contract based on user instructions
 */
export async function refineContractWithAI({
  currentContent,
  refinementPrompt,
  title
}: ContractRefinementParams): Promise<RefinedContract> {
  const systemPrompt = `You are a legal contract expert. You will be given an existing contract and a refinement request. 

Your task is to modify the contract according to the refinement request while:
1. Maintaining the overall structure and format (keep section headers like "PARTIES AND BACKGROUND", "SCOPE AND TERMS", etc.)
2. Preserving all existing important terms unless specifically asked to change
3. Ensuring legal validity and clarity
4. Adding the requested changes in the appropriate sections
5. Maintaining consistency throughout the document
6. Replacing placeholder underscores with the provided information where appropriate

IMPORTANT: 
- Return ONLY the refined contract content, no explanations or comments
- Keep all formatting including line breaks and section headers
- When replacing placeholders (like __________), use the exact information provided
- If asked to add a party name, find the appropriate placeholder and replace it`;

  const userPrompt = `Current Contract:
${currentContent}

Refinement Request: ${refinementPrompt}

Please apply the refinement to the contract above and return the complete updated contract.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 4000,
    });

    const refinedContent = response.choices[0]?.message?.content;
    
    if (!refinedContent) {
      throw new Error('No content received from OpenAI');
    }

    // Check if title should be updated based on the refinement
    let newTitle = title;
    if (refinementPrompt.toLowerCase().includes('title') || refinementPrompt.toLowerCase().includes('rename')) {
      // Extract potential new title from the refinement prompt
      const titleMatch = refinementPrompt.match(/(?:title|rename).*?["']([^"']+)["']/i);
      if (titleMatch && titleMatch[1]) {
        newTitle = titleMatch[1];
      }
    }

    return {
      content: refinedContent.trim(),
      title: newTitle
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('Failed to refine contract with AI');
  }
}

/**
 * Analyze a contract for potential issues or improvements
 */
export async function analyzeContract(contractContent: string): Promise<{
  issues: string[];
  suggestions: string[];
  riskLevel: 'low' | 'medium' | 'high';
}> {
  const systemPrompt = `You are a legal contract analyst. Analyze the provided contract for:
1. Potential legal issues or ambiguities
2. Missing important clauses
3. Unfair or one-sided terms
4. Clarity and completeness issues
5. Risk assessment

Return a JSON object with:
- issues: Array of identified problems
- suggestions: Array of improvement suggestions
- riskLevel: Overall risk assessment (low, medium, high)`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze this contract:\n\n${contractContent}` }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No analysis received from OpenAI');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('Contract analysis error:', error);
    throw new Error('Failed to analyze contract');
  }
}

/**
 * Extract key information from a contract
 */
export async function extractContractData(contractContent: string): Promise<{
  parties: Array<{ name: string; role: string }>;
  keyDates: Array<{ date: string; description: string }>;
  financialTerms: Array<{ amount: string; description: string }>;
  obligations: string[];
}> {
  const systemPrompt = `You are a contract data extraction specialist. Extract key information from the contract and return it in a structured JSON format.

Extract:
1. All parties involved (names and roles)
2. Important dates (deadlines, start dates, end dates)
3. Financial terms (payments, amounts, fees)
4. Key obligations and responsibilities

Return a JSON object with the extracted data.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extract data from this contract and return as JSON:\n\n${contractContent}` }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No data extracted from OpenAI');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('Data extraction error:', error);
    throw new Error('Failed to extract contract data');
  }
}

/**
 * Generate a contract summary
 */
export async function summarizeContract(contractContent: string): Promise<string> {
  const systemPrompt = `You are a legal document summarizer. Create a concise, clear summary of the contract that includes:
1. Type of contract
2. Parties involved
3. Main purpose/scope
4. Key terms and obligations
5. Important dates
6. Financial aspects (if any)

Keep the summary under 300 words and use bullet points for clarity.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Summarize this contract:\n\n${contractContent}` }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const summary = response.choices[0]?.message?.content;
    if (!summary) {
      throw new Error('No summary received from OpenAI');
    }

    return summary.trim();
  } catch (error) {
    console.error('Summary generation error:', error);
    throw new Error('Failed to generate contract summary');
  }
}

/**
 * Re-extract requirements from edited contract content
 */
export async function reextractContractRequirements({
  editedContent,
  editedTitle,
  originalRequirements,
  contractType
}: ReextractionParams): Promise<ReextractedData> {
  const systemPrompt = `You are a contract analysis expert. Your task is to extract structured data from an edited contract while preserving important information from the original requirements.

CRITICAL RULES:
1. Extract ALL party names and emails found in the contract
2. If an email address exists in the edited content, extract it
3. If NO email address is provided, return empty string "" for email
4. NEVER make up or invent email addresses
5. Preserve special terms and custom provisions exactly as written
6. Identify what has changed from the original requirements

Extract and return a JSON object containing:
- All parties with their names, emails (empty string if not found), and roles
- Key dates and deadlines
- Financial terms and amounts
- Main obligations and deliverables
- Special conditions or custom clauses
- Jurisdiction and governing law
- Any other critical contract elements

Compare with original requirements and identify:
- What's been added
- What's been modified  
- What's been removed

Return a JSON object with a confidence score (0-1) indicating how confident you are in the extraction accuracy.`;

  const userPrompt = `Analyze this edited contract and extract updated requirements:

CONTRACT TITLE: ${editedTitle}
CONTRACT TYPE: ${contractType}

EDITED CONTRACT CONTENT:
${editedContent}

ORIGINAL REQUIREMENTS (for reference):
${JSON.stringify(originalRequirements, null, 2)}

Extract all requirements and identify changes. Remember: if no email is found for a party, set email to empty string "".

Return your analysis as a JSON object with the following structure:
{
  "requirements": { ... },
  "parties": [ ... ],
  "changes": { "added": [...], "modified": [...], "removed": [...] },
  "confidence": 0.0-1.0
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 3000,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    const parsedResponse = JSON.parse(content);
    
    // Ensure proper structure
    return {
      requirements: {
        extractedData: parsedResponse.extractedData || {},
        keyDates: parsedResponse.keyDates || [],
        financialTerms: parsedResponse.financialTerms || [],
        obligations: parsedResponse.obligations || [],
        specialConditions: parsedResponse.specialConditions || [],
        ...parsedResponse.requirements
      },
      parties: (parsedResponse.parties || []).map((party: any) => ({
        name: party.name || '',
        email: party.email || '', // Empty string if no email found
        role: party.role || 'party'
      })),
      changes: {
        added: parsedResponse.changes?.added || [],
        modified: parsedResponse.changes?.modified || [],
        removed: parsedResponse.changes?.removed || []
      },
      confidence: parsedResponse.confidence || 0.8
    };
  } catch (error) {
    console.error('OpenAI Re-extraction Error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('OpenAI API key configuration error');
      }
      if (error.message.includes('rate limit')) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      }
      if (error.message.includes('json')) {
        throw new Error('Invalid response format from AI service');
      }
    }
    
    throw new Error('Failed to re-extract contract requirements');
  }
}

/**
 * Check if OpenAI API is configured and working
 */
export async function checkOpenAIConnection(): Promise<boolean> {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key is not configured');
    return false;
  }

  try {
    // Make a simple test call
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Test" }],
      max_tokens: 5,
    });

    return !!response.choices[0]?.message?.content;
  } catch (error) {
    console.error('OpenAI connection test failed:', error);
    return false;
  }
}