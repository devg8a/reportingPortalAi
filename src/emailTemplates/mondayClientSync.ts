export const noFoundClientTemplate = (dataRecords: any[]) => {

  const rowsHtml = dataRecords.map(record => `
    <tr>
      <td style="padding:8px 10px; font-size:13px;">
        ${record.clientId ?? ""}
      </td>
      <td style="padding:8px 10px; font-size:13px;">
        ${record.clientName ?? ""}
      </td>
    </tr>
  `).join("");

  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:700px; margin:0 auto; padding:20px;">
    <tr>
      <td style="font-size:14px; color:#000000; line-height:1.6;">

        <p style="margin:0 0 10px 0;">Hi Dev Team,</p>

        <p style="margin:0 0 20px 0;">
          I'm reaching out to inform you about an error that occurred within our system.
          Below, you'll find the details regarding the error for further investigation and resolution:
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">

          <tr>
            <th align="left" style="background-color:#000000; color:#ffffff; padding:10px; font-size:13px;">
              CLIENT ID
            </th>
            <th align="left" style="background-color:#000000; color:#ffffff; padding:10px; font-size:13px;">
              CLIENT
            </th>
          </tr>

          ${rowsHtml}

        </table>

        <p style="margin:20px 0 0 0;">
          Thank you for your understanding and cooperation.
        </p>

      </td>
    </tr>
  </table>`;
};