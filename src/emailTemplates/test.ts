import fs from "node:fs";
import path from "node:path";
import juice from "juice";

const cssPath = path.join(
  process.cwd(),
  'src/emailTemplates/email.css'
);
const emailCss = fs.readFileSync(cssPath, "utf-8");

export const testTemplate = (dataRecords: any[]) => {
  const rowsHtml =
    dataRecords?.length > 0
      ? dataRecords
        .map(
          (record) => `
              <tr>
                <td class="td">${record.clientId ?? ""}</td>
                <td class="td">${record.clientName ?? ""}</td>
              </tr>
            `
        )
        .join("")
      : `
          <tr>
            <td class="td" colspan="2">No records found.</td>
          </tr>
        `;

  const html = `
    <table id="login" width="100%" cellpadding="0" cellspacing="0" border="0" class="wrapper">
      <tr>
        <td class="body">


          <p class="p-wide">
            I'm reaching out to inform you about an error that occurred within our system.
            Below, you'll find the details regarding the error for further investigation and resolution:
          </p>

          <p class="p-wide2">
          Hey i am testing this for font size and color
          </p>

          <p class="p-wide2">
        para1 Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quod.
          </p>

          <p class="p-wide3">
          para 2 Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quod.
          </p>

          <p class="p-wide4">
          para 3Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quod.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" border="0" class="table">
            <tr>
              <th class="th">CLIENT ID</th>
              <th class="th">CLIENT</th>
            </tr>

            ${rowsHtml}
          </table>
        </td>
      </tr>
    </table>
  `;

  // Inline the external CSS into the HTML (email-client friendly)
  return juice.inlineContent(html, emailCss);
};  