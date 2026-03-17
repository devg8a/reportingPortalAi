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


type EmailFooterOptions = {
  supportEmail: string;
  supportLinkColor: string;

  footerBg: string;
  footerBorderTop: string;

  textColor: string;
  mutedTextColor: string;

  fontSize: string;
  smallFontSize: string;
  tinyFontSize: string;

  portalName: string;
  portalUrl: string;
  year: number;
};

export const getEmailFooterTest = (overrides: Partial<EmailFooterOptions> = {}) => {
  const opts: EmailFooterOptions = {
    supportEmail: "support@group8a.com",
    supportLinkColor: "#a34cafff",

    footerBg: "#f4f4f4",
    footerBorderTop: "#e0e0e0",

    textColor: "#666",
    mutedTextColor: "#999",

    fontSize: "14px",
    smallFontSize: "12px",
    tinyFontSize: "11px",

    portalName: "Group8a Reporting Portal",
    portalUrl: "https://reports.group8a.com",
    year: new Date().getFullYear(),

    ...overrides,
  };

  const styles = {
    footer: `background-color:${opts.footerBg}; padding:20px; text-align:center; border-top:1px solid ${opts.footerBorderTop};`,
    helpText: `margin:0; color:${opts.textColor}; font-size:${opts.fontSize};`,
    supportLink: `color:${opts.supportLinkColor}; text-decoration:none;`,
    legal: `color:${opts.mutedTextColor}; font-size:${opts.smallFontSize}; margin-top:20px; padding-top:20px; border-top:1px solid #ddd;`,
    p0: `margin:0;`,
    p5: `margin:5px 0 0 0;`,
    portalLink: `color:${opts.mutedTextColor}; text-decoration:none;`,
    portalLinkWrap: `margin:5px 0 0 0; font-size:${opts.tinyFontSize};`,
  };

  return `
        </div>
        <div style="${styles.footer}">
          <div style="margin-bottom:15px;">
            <p style="${styles.helpText}">
              Need help? Contact our support team:
              <a href="mailto:${opts.supportEmail}" style="${styles.supportLink}">
                ${opts.supportEmail}
              </a>
            </p>
          </div>

          <div style="${styles.legal}">
            <p style="${styles.p0}">© ${opts.year} ${opts.portalName}. All rights reserved.</p>
            <p style="${styles.p5}">
              This is an automated message. Please do not reply to this email.
            </p>
            <p style="${styles.portalLinkWrap}">
              <a href="${opts.portalUrl}" style="${styles.portalLink}">
                ${opts.portalUrl}
              </a>
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};