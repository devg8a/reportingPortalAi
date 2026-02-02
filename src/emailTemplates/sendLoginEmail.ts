export const getLoginEmail = (email: string, newPassword: string) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Login Credentials Reset</h2>
      <p>Your login password has been reset. Here are your new credentials:</p>
      
      <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #4CAF50;">
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>New Password:</strong> ${newPassword}</p>
      </div>
      
      <p style="color: #d32f2f; font-weight: bold;">
        Please change your password after first login for security.
      </p>
      
      <div style="margin-top: 30px; padding: 15px; background-color: #e8f4fd; border-radius: 5px;">
        <p><strong>Security Tips:</strong></p>
        <ul>
          <li>Change your password immediately after login</li>
          <li>Use a strong, unique password</li>
          <li>Never share your credentials</li>
        </ul>
      </div>
      
      <hr>
      <p style="color: #666; font-size: 12px;">
        This is an automated message. Please do not reply.
      </p>
    </div>
  `;
};