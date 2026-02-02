export const getEmailFooter = () => {
  return `
        </div>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
          <div style="margin-bottom: 15px;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              Need help? Contact our support team: 
              <a href="mailto:support@group8a.com" style="color: #4CAF50; text-decoration: none;">
                support@group8a.com
              </a>
            </p>
          </div>
          
          <div style="color: #999; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="margin: 0;">© ${new Date().getFullYear()} Group8a Reporting Portal. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">
              This is an automated message. Please do not reply to this email.
            </p>
            <p style="margin: 5px 0 0 0; font-size: 11px;">
              <a href="https://reports.group8a.com" style="color: #999; text-decoration: none;">
                https://reports.group8a.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};