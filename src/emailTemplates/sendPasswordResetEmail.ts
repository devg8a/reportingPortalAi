export const passwordResendEmail = (email: string, resetLink: string) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>You have requested to reset your password. Click the link below to reset your password:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" 
           style="background-color: #4CAF50; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 5px; font-weight: bold;">
          Reset Password
        </a>
      </div>
      
      <p>Or copy and paste this link in your browser:</p>
      <div style="background-color: #f4f4f4; padding: 10px; border-radius: 5px; word-break: break-all;">
        ${resetLink}
      </div>
      
      <p style="color: #d32f2f; margin-top: 20px;">
        <strong>This link will expire in 1 hour.</strong>
      </p>
      
      <p>If you didn't request this password reset, please ignore this email.</p>
      
      <hr>
      <p style="color: #666; font-size: 12px;">
        This is an automated message. Please do not reply.
      </p>
    </div>
  `;
};