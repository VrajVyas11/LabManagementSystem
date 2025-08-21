using LabManagementBackend.DTOs;
using LabManagementBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Text;
using System.Globalization;
using System;
using System.IO;
using PdfSharpCore.Pdf;
using PdfSharpCore.Drawing;

namespace LabManagementBackend.Controllers
{
    [ApiController]
    [Route("api/attendance")]
    public class AttendanceController : ControllerBase
    {
        private readonly AttendanceService _attendanceService;

        public AttendanceController(AttendanceService attendanceService)
        {
            _attendanceService = attendanceService;
        }

        // Student clocks in with optional late reason
        [HttpPost("clockin")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> ClockIn([FromBody] ClockInDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.LabId))
                return BadRequest(new { message = "LabId is required." });

            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(studentId))
                return Unauthorized();

            var (success, message, attendance) = await _attendanceService.ClockInAsync(studentId, dto);
            if (!success) return BadRequest(new { message });
            return Ok(attendance);
        }

        // Student clocks out
        [HttpPost("clockout")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> ClockOut([FromBody] ClockOutDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.LabId))
                return BadRequest(new { message = "LabId is required." });

            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(studentId))
                return Unauthorized();

            var (success, message, attendance) = await _attendanceService.ClockOutAsync(studentId, dto.LabId);
            if (!success) return BadRequest(new { message });
            return Ok(attendance);
        }

        // Teacher gets attendance report for a lab, supports JSON, CSV, PDF
        [HttpGet("report/{labId}")]
        [Authorize(Roles = "Teacher")]
        public async Task<IActionResult> GetAttendanceReport(string labId, [FromQuery] string format = "json")
        {
            if (string.IsNullOrWhiteSpace(labId))
                return BadRequest(new { message = "LabId is required." });

            var report = await _attendanceService.GetAttendanceReportByLabAsync(labId);

            if (format?.ToLowerInvariant() == "csv")
            {
                var csv = GenerateCsv(report);
                var bom = Encoding.UTF8.GetPreamble();
                var csvBytes = Encoding.UTF8.GetBytes(csv);
                var bytesWithBom = new byte[bom.Length + csvBytes.Length];
                Buffer.BlockCopy(bom, 0, bytesWithBom, 0, bom.Length);
                Buffer.BlockCopy(csvBytes, 0, bytesWithBom, bom.Length, csvBytes.Length);

                return File(bytesWithBom, "text/csv; charset=utf-8", $"attendance_report_{labId}.csv");
            }
            else if (format?.ToLowerInvariant() == "pdf")
            {
                var pdfBytes = GeneratePdfSimple(report);
                return File(pdfBytes, "application/pdf", $"attendance_report_{labId}.pdf");
            }

            return Ok(report);
        }

        // ---------------- Helpers ----------------

        private string EscapeCsv(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            var escaped = s.Replace("\"", "\"\"");
            return $"\"{escaped}\"";
        }

        private string FormatDate(DateTime? dt)
        {
            if (!dt.HasValue) return "";
            return dt.Value.ToLocalTime().ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture);
        }

        private string GenerateCsv(List<AttendanceReportDto> report)
        {
            var sb = new StringBuilder();
            sb.AppendLine("StudentId,StudentName,Status,LateReason,ClockInTime,ClockOutTime");

            foreach (var r in report)
            {
                var studentId = EscapeCsv(r.StudentId ?? "");
                var studentName = EscapeCsv(r.StudentName ?? "");
                var status = EscapeCsv(r.Status.ToString());
                var lateReason = EscapeCsv(r.LateReason ?? "");
                var clockIn = EscapeCsv(FormatDate(r.ClockInTime));
                var clockOut = EscapeCsv(FormatDate(r.ClockOutTime));

                sb.AppendLine($"{studentId},{studentName},{status},{lateReason},{clockIn},{clockOut}");
            }

            return sb.ToString();
        }

        // Simple PDF generation using PdfSharpCore (plain text table-like output)
        private byte[] GeneratePdfSimple(List<AttendanceReportDto> report)
        {
            // Create PDF document
            using var ms = new MemoryStream();
            using var document = new PdfDocument();

            // Function to create a new page and graphics
            PdfPage CreatePage()
            {
                var p = document.AddPage();
                p.Size = PdfSharpCore.PageSize.A4;
                p.Orientation = PdfSharpCore.PageOrientation.Portrait;
                return p;
            }

            PdfPage page = CreatePage();
            XGraphics gfx = XGraphics.FromPdfPage(page);

            // Choose a font. If Arial not available, fall back.
            XFont baseFont;
            try { baseFont = new XFont("Arial", 9, XFontStyle.Regular); }
            catch { baseFont = new XFont("Verdana", 9, XFontStyle.Regular); }

            XFont headerFont = new XFont(baseFont.FontFamily.Name, 14, XFontStyle.Bold);
            XFont colHeaderFont = new XFont(baseFont.FontFamily.Name, 9, XFontStyle.Bold);
            XFont rowFont = new XFont(baseFont.FontFamily.Name, 9, XFontStyle.Regular);
            XFont footerFont = new XFont(baseFont.FontFamily.Name, 8, XFontStyle.Italic);

            const double margin = 40;
            double y = margin;
            double pageWidth = page.Width - 2 * margin;
            double lineSpacing = 4; // extra spacing between rows

            // Define relative widths but give more to StudentId and StudentName
            double[] rel = { 2.5, 4.0, 1.5, 3.5, 1.8, 1.8 }; // StudentId, StudentName, Status, LateReason, ClockIn, ClockOut
            double totalRel = 0;
            foreach (var r in rel) totalRel += r;

            double[] colWidths = new double[rel.Length];
            for (int i = 0; i < rel.Length; i++)
                colWidths[i] = pageWidth * (rel[i] / totalRel);

            // Helper to draw header row
            void DrawHeaderRow()
            {
                y += 0; // nothing
                        // Title
                gfx.DrawString("Attendance Report", headerFont, XBrushes.Black, new XRect(margin, y, page.Width - 2 * margin, 20), XStringFormats.TopCenter);
                y += 28;

                // Column headers
                var headers = new[] { "StudentId", "StudentName", "Status", "LateReason", "ClockIn", "ClockOut" };
                double x = margin;
                for (int i = 0; i < headers.Length; i++)
                {
                    gfx.DrawString(headers[i], colHeaderFont, XBrushes.Black, new XRect(x, y, colWidths[i], 16), XStringFormats.TopLeft);
                    x += colWidths[i] + 6;
                }
                y += 18;
            }

            // Initial header
            DrawHeaderRow();

            // XTextFormatter for wrapping text
            var tf = new PdfSharpCore.Drawing.Layout.XTextFormatter(gfx);

            // Iterate rows
            foreach (var r in report)
            {
                // Estimate required height for wrapped cells (StudentName and LateReason)
                double xPos = margin;
                double maxCellHeight = 0;
                // StudentId height estimate (single line)
                var sh = gfx.MeasureString(r.StudentId ?? "", rowFont).Height;
                maxCellHeight = Math.Max(maxCellHeight, sh);

                // StudentName wrapping height
                var nameRect = new XRect(xPos + colWidths[0] + 6, y, colWidths[1], 0);
                var nameHeight = MeasureWrappedHeight(gfx, rowFont, r.StudentName ?? "", colWidths[1]);
                maxCellHeight = Math.Max(maxCellHeight, nameHeight);

                // Status single line
                var statusHeight = gfx.MeasureString(r.Status.ToString(), rowFont).Height;
                maxCellHeight = Math.Max(maxCellHeight, statusHeight);

                // LateReason wrapping
                var lrWidthAccum = 0.0;
                for (int i = 0; i < 3; i++) lrWidthAccum += colWidths[i] + 6; // up to LateReason column start
                var lateRectWidth = colWidths[3];
                var lateHeight = MeasureWrappedHeight(gfx, rowFont, r.LateReason ?? "", lateRectWidth);
                maxCellHeight = Math.Max(maxCellHeight, lateHeight);

                // ClockIn, ClockOut heights
                var ciHeight = gfx.MeasureString(FormatDate(r.ClockInTime), rowFont).Height;
                var coHeight = gfx.MeasureString(FormatDate(r.ClockOutTime), rowFont).Height;
                maxCellHeight = Math.Max(maxCellHeight, Math.Max(ciHeight, coHeight));

                // Add some padding
                maxCellHeight += 6;

                // If not enough space on page for this row + footer, create new page
                if (y + maxCellHeight + margin + 30 > page.Height) // 30 for footer space
                {
                    // draw footer on existing page
                    gfx.DrawString($"Generated: {DateTime.Now:g}", footerFont, XBrushes.Gray, new XRect(margin, page.Height - margin + 5, page.Width - 2 * margin, 12), XStringFormats.TopLeft);

                    // start new page
                    page = CreatePage();
                    gfx.Dispose();
                    gfx = XGraphics.FromPdfPage(page);
                    y = margin;
                    // redraw header
                    DrawHeaderRow();
                    // recreate text formatter for new gfx
                    tf = new PdfSharpCore.Drawing.Layout.XTextFormatter(gfx);
                }

                // Draw cells
                double x = margin;
                // StudentId
                gfx.DrawString(r.StudentId ?? "", rowFont, XBrushes.Black, new XRect(x, y, colWidths[0], maxCellHeight), XStringFormats.TopLeft);
                x += colWidths[0] + 6;

                // StudentName (wrapped)
                var nameRectDraw = new XRect(x, y, colWidths[1], maxCellHeight);
                tf.DrawString(r.StudentName ?? "", rowFont, XBrushes.Black, nameRectDraw);
                x += colWidths[1] + 6;

                // Status
                gfx.DrawString(r.Status.ToString(), rowFont, XBrushes.Black, new XRect(x, y, colWidths[2], maxCellHeight), XStringFormats.TopLeft);
                x += colWidths[2] + 6;

                // LateReason (wrapped)
                var lateRectDraw = new XRect(x, y, colWidths[3], maxCellHeight);
                tf.DrawString(r.LateReason ?? "", rowFont, XBrushes.Black, lateRectDraw);
                x += colWidths[3] + 6;

                // ClockIn
                gfx.DrawString(FormatDate(r.ClockInTime), rowFont, XBrushes.Black, new XRect(x, y, colWidths[4], maxCellHeight), XStringFormats.TopLeft);
                x += colWidths[4] + 6;

                // ClockOut
                gfx.DrawString(FormatDate(r.ClockOutTime), rowFont, XBrushes.Black, new XRect(x, y, colWidths[5], maxCellHeight), XStringFormats.TopLeft);

                // Advance y
                y += maxCellHeight + lineSpacing;
            }

            // Footer on last page
            gfx.DrawString($"Generated: {DateTime.Now:g}", footerFont, XBrushes.Gray, new XRect(margin, page.Height - margin + 5, page.Width - 2 * margin, 12), XStringFormats.TopLeft);

            document.Save(ms, false);
            gfx.Dispose();

            return ms.ToArray();

            // Local helper: estimate wrapped text height using XTextFormatter by splitting lines roughly.
            // This is an approximation; it's good enough for simple tables.
            double MeasureWrappedHeight(XGraphics g, XFont f, string text, double width)
            {
                if (string.IsNullOrEmpty(text)) return g.MeasureString("A", f).Height; // baseline

                // Use XTextFormatter to measure by simulating line breaks
                var words = text.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                var line = "";
                double lineHeight = g.MeasureString("A", f).Height;
                int lines = 0;
                foreach (var w in words)
                {
                    var test = string.IsNullOrEmpty(line) ? w : (line + " " + w);
                    var size = g.MeasureString(test, f);
                    if (size.Width > width)
                    {
                        // commit current line
                        lines++;
                        line = w;
                    }
                    else
                    {
                        line = test;
                    }
                }
                if (!string.IsNullOrEmpty(line)) lines++;

                return Math.Max(lineHeight, lines * (lineHeight + 2));
            }
        }
    }
}