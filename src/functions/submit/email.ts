import { SubmitSchema } from "./schema";
// For reference
// <mjml>
//   <mj-body>
//     <mj-section>
//       <mj-column>

//         <mj-image width="100px" src="https://giginthe.garden/images/gig-logo-small.png"></mj-image>

//         <mj-divider border-color="#236150"></mj-divider>

//         <mj-text font-size="20px" color="#236150" font-family="helvetica">Hey {{name}},</mj-text>

//         <mj-text font-size="16px" color="#333333" font-family="helvetica">
//           Thanks so much for signing up for Gig in the Garden! We're really excited to have you join us for a fun evening of live music, drinks, and a good time with mates.
//         </mj-text>

//         <mj-text font-size="16px" color="#333333" font-family="helvetica">
//           Here's a quick recap of your booking details:
//         </mj-text>

//         <mj-text font-size="16px" color="#333333" font-family="helvetica">
//           <b>Name:</b> {{name}} <br />
//           <b>Email:</b> {{email}} <br />
//           <b>Number of Adults:</b> {{num_adults}} <br />
//           <b>Number of Kids:</b> {{num_kids}} <br />
//           <b>Notes:</b> {{notes}} <br />
//           <b>Interested in Bell Tent:</b> {{bell_tent}} <br />
//           <b></b>
//         </mj-text>

//         <mj-divider border-color="#236150"></mj-divider>

//         <mj-text font-size="16px" color="#333333" font-family="helvetica">
//           To confirm your spot, please make sure to transfer £{{payment_amount}} to the following bank details:
//         </mj-text>

//         <mj-text font-size="16px" color="#333333" font-family="helvetica">
//           <b>Account Name:</b> Sam Smart<br />
//           <b>Sort Code:</b> 20-30-13<br />
//           <b>Account Number:</b> 13537803<br />
//         </mj-text>

//         <mj-text font-size="16px" color="#333333" font-family="helvetica">
//           We're really looking forward to seeing you there! If you have any questions or need to make changes, just give us a shout.
//         </mj-text>

//         <mj-text font-size="16px" color="#333333" font-family="helvetica">
//           Cheers, <br /> Sam & David
//         </mj-text>

//       </mj-column>
//     </mj-section>
//   </mj-body>
// </mjml>

const emailTemplate = `
<!doctype html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><title></title><!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]--><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style type="text/css">#outlook a { padding:0; }
          body { margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%; }
          table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
          img { border:0;height:auto;line-height:100%; outline:none;text-decoration:none;-ms-interpolation-mode:bicubic; }
          p { display:block;margin:13px 0; }</style><!--[if mso]>
        <noscript>
        <xml>
        <o:OfficeDocumentSettings>
          <o:AllowPNG/>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
        </xml>
        </noscript>
        <![endif]--><!--[if lte mso 11]>
        <style type="text/css">
          .mj-outlook-group-fix { width:100% !important; }
        </style>
        <![endif]--><style type="text/css">@media only screen and (min-width:480px) {
        .mj-column-per-100 { width:100% !important; max-width: 100%; }
      }</style><style media="screen and (min-width:480px)">.moz-text-html .mj-column-per-100 { width:100% !important; max-width: 100%; }</style><style type="text/css">@media only screen and (max-width:480px) {
      table.mj-full-width-mobile { width: 100% !important; }
      td.mj-full-width-mobile { width: auto !important; }
    }</style></head><body style="word-spacing:normal;"><div><!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]--><div style="margin:0px auto;max-width:600px;"><table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;"><tbody><tr><td style="direction:ltr;font-size:0px;padding:20px 0;text-align:center;"><!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:600px;" ><![endif]--><div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;"><table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%"><tbody><tr><td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;"><table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;"><tbody><tr><td style="width:100px;"><img height="auto" src="https://giginthe.garden/images/gig-logo-small.png" style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;" width="100"></td></tr></tbody></table></td></tr><tr><td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;"><p style="border-top:solid 4px #236150;font-size:1px;margin:0px auto;width:100%;"></p><!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" style="border-top:solid 4px #236150;font-size:1px;margin:0px auto;width:550px;" role="presentation" width="550px" ><tr><td style="height:0;line-height:0;"> &nbsp;
</td></tr></table><![endif]--></td></tr><tr><td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;"><div style="font-family:helvetica;font-size:20px;line-height:1;text-align:left;color:#236150;">Hey {{name}},</div></td></tr><tr><td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;"><div style="font-family:helvetica;font-size:16px;line-height:1;text-align:left;color:#333333;">Thanks so much for signing up for Gig in the Garden! We're really excited to have you join us for a fun evening of live music, drinks, and a good time with mates.</div></td></tr><tr><td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;"><div style="font-family:helvetica;font-size:16px;line-height:1;text-align:left;color:#333333;">Here's a quick recap of your booking details:</div></td></tr><tr><td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;"><div style="font-family:helvetica;font-size:16px;line-height:1;text-align:left;color:#333333;"><b>Name:</b> {{name}}<br><b>Email:</b> {{email}}<br><b>Number of Adults:</b> {{num_adults}}<br><b>Number of Kids:</b> {{num_kids}}<br><b>Notes:</b> {{notes}}<br><b>Interested in Bell Tent:</b> {{bell_tent}}<br><b></b></div></td></tr><tr><td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;"><p style="border-top:solid 4px #236150;font-size:1px;margin:0px auto;width:100%;"></p><!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" style="border-top:solid 4px #236150;font-size:1px;margin:0px auto;width:550px;" role="presentation" width="550px" ><tr><td style="height:0;line-height:0;"> &nbsp;
</td></tr></table><![endif]--></td></tr><tr><td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;"><div style="font-family:helvetica;font-size:16px;line-height:1;text-align:left;color:#333333;">To confirm your spot, please make sure to transfer £{{payment_amount}} to the following bank details:</div></td></tr><tr><td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;"><div style="font-family:helvetica;font-size:16px;line-height:1;text-align:left;color:#333333;"><b>Account Name:</b> Sam Smart<br><b>Sort Code:</b> 20-30-13<br><b>Account Number:</b> 13537803<br></div></td></tr><tr><td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;"><div style="font-family:helvetica;font-size:16px;line-height:1;text-align:left;color:#333333;">We're really looking forward to seeing you there! If you have any questions or need to make changes, just give us a shout.</div></td></tr><tr><td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;"><div style="font-family:helvetica;font-size:16px;line-height:1;text-align:left;color:#333333;">Cheers,<br>Sam & David</div></td></tr></tbody></table></div><!--[if mso | IE]></td></tr></table><![endif]--></td></tr></tbody></table></div><!--[if mso | IE]></td></tr></table><![endif]--></div></body></html>
`;

export function renderEmailTemplate(
  data: SubmitSchema & { paymentAmount: number }
) {
  return emailTemplate
    .replace(/{{name}}/g, data.name)
    .replace(/{{email}}/g, data.email)
    .replace(/{{num_adults}}/g, data.adults.toString())
    .replace(/{{num_kids}}/g, data.children.toString())
    .replace(/{{notes}}/g, data.anythingElse)
    .replace(/{{bell_tent}}/g, data.bellTent ? "Yes" : "No")
    .replace(/{{payment_amount}}/g, data.paymentAmount.toFixed(2));
}
