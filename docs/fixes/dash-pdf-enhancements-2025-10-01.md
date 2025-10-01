# Dash PDF Generation Enhancements (2025-10-01)

Summary
- Improved PDF generation from Dash with better formatting and optional attachment to conversations.
- Markdown content is now converted to styled HTML before PDF export for higher quality output.
- Added URI-only PDF creation methods (no auto share sheet) to support uploads and attachments.

Changes
1) EducationalPDFService
- Added createPDFFile(html) to return a PDF URI without opening the share dialog (web: data URI; native: file URI)
- generateTextPDFUri now uses createPDFFile (no implicit sharing)
- Added generateHTMLPDFUri(title, html) for HTML-based exports with URI returned

2) DashAIAssistant
- exportTextAsPDF and exportTextAsPDFForDownload now detect markdown and convert to HTML with basic styles before export
- Added addAttachmentMessage(content, attachments, conversationId?) to store a PDF as an attachment message in the current conversation

3) DashAssistant UI
- When Dash proposes an export_pdf action, the dialog now offers:
  - Download Only
  - Download + Attach (uploads to Supabase Storage and saves as a message attachment)

Why this helps
- PDFs generated from AI content (often markdown) look clean and structured
- Users can persist PDFs in the conversation, making them easy to find later
- Web users get a data URI, enabling quick download and upload flows

Security & Rules Compliance
- No service role keys exposed; uses client-authenticated Supabase storage
- No database schema changes
- All AI calls continue to route via ai-proxy/ai-gateway

Testing steps
- In Dash Assistant, ask: "Create a PDF worksheet with 10 addition problems."
- Accept the PDF prompt
- Try both Download Only and Download + Attach
- Verify an attachment message appears after uploading (Download + Attach)

Notes
- For large PDFs on web, data URI upload relies on fetch(dataUri). If the browser blocks it, we can extend AttachmentService to decode data URIs explicitly.
