export const sendUserLoginInfo = (email: string, password: string) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
      <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4CAF50; margin: 0; font-size: 28px;">🎉 Welcome to Group8a!</h1>
          <p style="color: #666; margin-top: 10px; font-size: 16px;">Your account has been successfully created.</p>
        </div>

        <!-- Main Content -->
        <div style="background-color: #f0f7ff; border-left: 4px solid #4CAF50; padding: 20px; margin: 25px 0; border-radius: 4px;">
          <h3 style="color: #333; margin-top: 0;">Your Login Credentials</h3>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; width: 120px;"><strong>Portal URL:</strong></td>
                <td style="padding: 8px 0;">
                  <a href="https://reports.group8a.com" style="color: #2196F3; text-decoration: none;">
                    https://reports.group8a.com
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Username:</strong></td>
                <td style="padding: 8px 0; font-family: monospace;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Password:</strong></td>
                <td style="padding: 8px 0; font-family: monospace; letter-spacing: 1px;">${password}</td>
              </tr>
            </table>
          </div>

          <!-- Login Button -->
          <div style="text-align: center; margin: 25px 0;">
            <a href="https://reports.group8a.com" 
               style="background-color: #4CAF50; color: white; padding: 14px 35px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold; 
                      display: inline-block; font-size: 16px;">
              Login to Portal
            </a>
          </div>
        </div>

  `;
};