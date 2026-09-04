# How the per-row PDF icons actually deliver the file (Estado vs Prueba de Exportación)

Both are READ actions and were clicked for real (`docs-estado-pdf.ts`, `docs-prueba.ts`).
They behave differently, which matters for anyone automating the download:

| Screen | Click target | Mechanism | File name | URL |
|---|---|---|---|---|
| Estado.aspx | `div#cpBody_gvDatos_cell{N}_0_iPrint_{N}` (ASPxClientButton, autoPostBack, hidden `input[type=submit]`) | full postback (POST Estado.aspx 200, ~4 s, DevExpress loading panel) → the response opens an auxiliary window (`page` event, about:blank) → Chromium `download` event | GUID (`a7f01673-….pdf`) | `https://clientes.domipack.com//rep/Export/<guid>.pdf` (note the double slash) |
| PruebaExportacion.aspx | `a#cpBody_gvDatos_DXCBtn{0,3,6,9}` (grid CustomButton 'Clone') | grid callback/postback (POST PruebaExportacion.aspx) whose **response itself** is the PDF attachment | `<tracking>.pdf` (`TBA333722866266.pdf`) | same page URL |

Verification used: `download.saveAs()`, then magic bytes `%PDF` + `pdftotext`/`pdfinfo`
(Crystal Reports, 1 page each). Estado PDFs are the invoices (FT33-… totals match the grid);
Prueba PDFs are the Air Waybill per tracking.

Playwright tips: listen to `page.waitForEvent('download')` **and**
`context.waitForEvent('page')` before clicking; the Estado popup page has no URL and can be
closed after the download event fires. Reload Estado.aspx between rows — after the postback
the grid re-renders and the button ids stay stable but the page is a new document.
