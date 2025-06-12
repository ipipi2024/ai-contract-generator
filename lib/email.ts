// lib/email.ts
import nodemailer from 'nodemailer';
import { Types } from 'mongoose';

// Create reusable transporter
const createTransporter = () => {
  // Using Gmail as an example - you can change this to any email service
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD, // Use app-specific password for Gmail
    },
  });
};

// Alternative configuration for custom SMTP
const createCustomSMTPTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

interface EmailParty {
  name: string;
  email: string;
  role: string;
}

interface SendSignatureRequestParams {
  contractId: string | Types.ObjectId;
  contractTitle: string;
  party: EmailParty;
  senderName: string;
  baseUrl: string;
}

export async function sendSignatureRequest({
  contractId,
  contractTitle,
  party,
  senderName,
  baseUrl,
}: SendSignatureRequestParams) {
  const transporter = createTransporter();
  
  // Create unique signature link
  const signatureLink = `${baseUrl}/contracts/sign/${contractId}?email=${encodeURIComponent(party.email)}`;
  
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME || 'Contract Manager'} <${process.env.EMAIL_USER}>`,
    to: party.email,
    subject: `Signature Request: ${contractTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Signature Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${party.name},</h2>
              <p>${senderName} has requested your signature on the following contract:</p>
              
              <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <strong>Contract:</strong> ${contractTitle}<br>
                <strong>Your Role:</strong> ${party.role}
              </div>
              
              <p>Please review and sign the contract by clicking the button below:</p>
              
              <a href="${signatureLink}" class="button">Review & Sign Contract</a>
              
              <div class="footer">
                <p><strong>Security Notice:</strong> This link is unique to you. Please do not share it with others.</p>
                <p>If you did not expect this email, please ignore it or contact ${senderName}.</p>
                <p>This email was sent by Contract Manager. If you have questions, please contact the sender directly.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Signature Request for: ${contractTitle}
      
      Hello ${party.name},
      
      ${senderName} has requested your signature on a contract.
      
      Contract: ${contractTitle}
      Your Role: ${party.role}
      
      Please review and sign the contract by visiting:
      ${signatureLink}
      
      Security Notice: This link is unique to you. Please do not share it with others.
      
      If you did not expect this email, please ignore it.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send signature request email');
  }
}

interface SendCompletedContractParams {
  contractId: string | Types.ObjectId;
  contractTitle: string;
  parties: EmailParty[];
  contractPdfBuffer?: Buffer; // Optional PDF attachment
  baseUrl: string;
}

export async function sendCompletedContract({
  contractId,
  contractTitle,
  parties,
  contractPdfBuffer,
  baseUrl,
}: SendCompletedContractParams) {
  const transporter = createTransporter();
  
  // Send to all parties
  const sendPromises = parties.map(async (party) => {
    const viewLink = `${baseUrl}/contracts/${contractId}`;
    
    const mailOptions: any = {
      from: `${process.env.EMAIL_FROM_NAME || 'Contract Manager'} <${process.env.EMAIL_USER}>`,
      to: party.email,
      subject: `Contract Completed: ${contractTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 30px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
              .party-list { background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✓ Contract Completed</h1>
              </div>
              <div class="content">
                <h2>Hello ${party.name},</h2>
                <p>All parties have successfully signed the contract:</p>
                
                <div class="party-list">
                  <strong>Contract:</strong> ${contractTitle}<br><br>
                  <strong>Signed by:</strong>
                  <ul>
                    ${parties.map(p => `<li>${p.name} (${p.role})</li>`).join('')}
                  </ul>
                </div>
                
                <p>The contract is now legally binding and complete. ${contractPdfBuffer ? 'A PDF copy is attached to this email for your records.' : ''}</p>
                
                <a href="${viewLink}" class="button">View Contract Online</a>
                
                <div class="footer">
                  <p>Please keep this email and any attachments for your records.</p>
                  <p>This is an automated notification from Contract Manager.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        Contract Completed: ${contractTitle}
        
        Hello ${party.name},
        
        All parties have successfully signed the contract.
        
        Contract: ${contractTitle}
        
        Signed by:
        ${parties.map(p => `- ${p.name} (${p.role})`).join('\n')}
        
        The contract is now legally binding and complete.
        
        View the contract online at: ${viewLink}
        
        Please keep this email for your records.
      `,
    };

    // Add PDF attachment if provided
    if (contractPdfBuffer) {
      mailOptions.attachments = [
        {
          filename: `${contractTitle.replace(/[^a-z0-9]/gi, '_')}_signed.pdf`,
          content: contractPdfBuffer,
          contentType: 'application/pdf',
        },
      ];
    }

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${party.email}:`, info.messageId);
      return { success: true, email: party.email, messageId: info.messageId };
    } catch (error) {
      console.error(`Error sending email to ${party.email}:`, error);
      return { success: false, email: party.email, error };
    }
  });

  const results = await Promise.all(sendPromises);
  return results;
}

// Test email configuration
export async function testEmailConfiguration(): Promise<boolean> {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
}