export const getOTPEmailContent = (otp: string) => {
  return `
    <h2 style="color: #333; margin-top: 0; text-align: center;">🔒 Authentication Required</h2>
    
    <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 25px 0; text-align: center;">
      <p style="color: #555; margin-bottom: 15px; font-size: 16px;">
        Your One-Time Password (OTP) for login is:
      </p>
      
      <div style="background-color: white; border: 2px dashed #4CAF50; padding: 20px; border-radius: 8px; display: inline-block; margin: 15px 0;">
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333; font-family: monospace;">
          ${otp}
        </div>
      </div>
      
      <p style="color: #777; margin-top: 20px; font-size: 14px;">
        ⏱️ This OTP is valid for <strong>5 minutes</strong>.
      </p>
    </div>
    
    <div style="background-color: #fff8e1; border-left: 4px solid #ff9800; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <h3 style="color: #333; margin-top: 0;">⚠️ Security Tips:</h3>
      <ul style="color: #555; line-height: 1.8; padding-left: 20px;">
        <li>Never share your OTP with anyone</li>
        <li>Group8a staff will never ask for your OTP</li>
        <li>If you didn't request this OTP, please ignore this email</li>
        <li>For security, OTPs expire after 5 minutes</li>
      </ul>
    </div>
  `;
};