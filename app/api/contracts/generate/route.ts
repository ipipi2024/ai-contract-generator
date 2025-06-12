  // app/api/contracts/generate/route.ts
  import { NextRequest, NextResponse } from "next/server";
  import { getServerSession } from "next-auth/next";
  import { Types } from "mongoose";
  import { authOptions } from "@/lib/auth";
  import { generateContractFromPrompt } from "@/lib/chatGPT";
  import { connectToDatabase } from "@/lib/mongodb";
  import Contract from "@/models/Contract";
  import User from "@/models/User";
  import { canUserCreateContract } from '@/lib/utils';

  export async function POST(request: NextRequest) {
    try {
      // Get the session using NextAuth
      const session = await getServerSession(authOptions);

      // Check if user is authenticated
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "You must be logged in to generate contracts" },
          { status: 401 }
        );
      }

      const body = await request.json();
      const { prompt, contractType, parties } = body;

      // Validate input
      if (!prompt || prompt.trim() === "") {
        return NextResponse.json(
          { error: "Contract description is required" },
          { status: 400 }
        );
      }

      // Validate contract type
      const validTypes = ["service", "nda", "employment", "lease", "custom"];
      const type =
        contractType && validTypes.includes(contractType)
          ? contractType
          : "custom";

      // Connect to database
      await connectToDatabase();

      // Check user's plan limits
      const user = await User.findById(session.user.id);

      // console.log("user:", user);
      // console.log("canCreateContract:", typeof user.canCreateContract);

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Check if user can create more contracts
      if (!canUserCreateContract(user)) {
        const limits = {
          free: 5,
          pro: 50,
          enterprise: Infinity,
        };

        return NextResponse.json(
          {
            error: `You've reached your monthly contract limit (${
              limits[user.plan]
            } contracts for ${user.plan} plan)`,
            upgradeRequired: true,
            currentPlan: user.plan,
          },
          { status: 403 }
        );
      }

      // Generate contract using AI
      const contractData = await generateContractFromPrompt({
        prompt: prompt.trim(),
        contractType: type,
      });

      // Prepare parties array from AI response or from request body
      const contractParties = parties || contractData.parties || [];

      // Ensure parties have the correct structure for MongoDB
      const formattedParties = contractParties.map((party: any) => ({
        name: party.name || "",
        email: party.email || "",
        role: party.role || "party",
        signed: false,
        signedAt: null,
      }));

      // Create the contract
      const contract = await Contract.create({
        userId: session.user.id,
        title:
          contractData.title ||
          `${
            type.charAt(0).toUpperCase() + type.slice(1)
          } Agreement - ${new Date().toLocaleDateString()}`,
        type,
        requirements: {
          originalPrompt: prompt.trim(),
          contractType: type,
          extractedData: contractData.extractedData || {},
          generatedBy: session.user.email,
          timestamp: new Date(),
        },
        content: contractData.content,
        parties: formattedParties,
        status: "draft",
      });

      // Increment user's contract count
      await User.findByIdAndUpdate(session.user.id, {
        $inc: { contractsCreated: 1 },
      });

      // Return the created contract (without sensitive data)
      return NextResponse.json(
        {
          contract: {
            id: (contract._id as Types.ObjectId).toString(),
            title: contract.title,
            type: contract.type,
            content: contract.content,
            parties: contract.parties,
            status: contract.status,
            createdAt: contract.createdAt,
          },
          message: "Contract generated successfully",
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error generating contract:", error);

      // Handle specific errors
      if (error instanceof Error) {
        // Check for AI service errors
        if (
          error.message.includes("AI service") ||
          error.message.includes("OpenAI")
        ) {
          return NextResponse.json(
            {
              error:
                "AI service temporarily unavailable. Please try again later.",
            },
            { status: 503 }
          );
        }

        // Check for validation errors
        if (error.name === "ValidationError") {
          return NextResponse.json(
            { error: "Invalid contract data provided" },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        { error: "An unexpected error occurred while generating the contract" },
        { status: 500 }
      );
    }
  }

  export async function GET(request: NextRequest) {
    try {
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "You must be logged in to view contracts" },
          { status: 401 }
        );
      }

      await connectToDatabase();

      // Get query parameters
      const { searchParams } = new URL(request.url);
      const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
      const limit = Math.min(
        50,
        Math.max(1, parseInt(searchParams.get("limit") || "10"))
      );
      const status = searchParams.get("status");
      const type = searchParams.get("type");
      const search = searchParams.get("search");

      const skip = (page - 1) * limit;

      // Build query
      const query: any = { userId: session.user.id };

      if (
        status &&
        ["draft", "pending", "signed", "completed"].includes(status)
      ) {
        query.status = status;
      }

      if (
        type &&
        ["service", "nda", "employment", "lease", "custom"].includes(type)
      ) {
        query.type = type;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { "parties.name": { $regex: search, $options: "i" } },
          { "parties.email": { $regex: search, $options: "i" } },
        ];
      }

      // Fetch contracts with selected fields only
      const contracts = await Contract.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("title type status parties createdAt updatedAt")
        .lean();

      const total = await Contract.countDocuments(query);

      // Format response
      const formattedContracts = contracts.map((contract) => ({
        id: contract._id.toString(),
        title: contract.title,
        type: contract.type,
        status: contract.status,
        partiesCount: contract.parties.length,
        signedCount: contract.parties.filter((p: any) => p.signed).length,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt,
      }));

      return NextResponse.json({
        contracts: formattedContracts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page < Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching contracts:", error);
      return NextResponse.json(
        { error: "Failed to fetch contracts" },
        { status: 500 }
      );
    }
  }
