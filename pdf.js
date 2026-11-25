/*
 * Minimal, dependency-free PDF writer for the result report.
 *
 * Uses the base-14 Helvetica fonts with WinAnsiEncoding and writes a valid
 * PDF 1.4 byte stream. No canvas, no external library, no server and no
 * printer dialog. The layout is a simple paginated text/table report, which
 * stays readable when opened in any PDF viewer.
 */
(function (global) {
  "use strict";

  var PAGE_W = 595.28;   // A4 in points
  var PAGE_H = 841.89;
  var MARGIN = 45;
  var BOTTOM = 58;

  // Unicode code points that need an explicit Windows-1252 byte. Characters
  // between 00A0 and 00FF are covered by the range fallback in encodeText().
  var WINANSI = {
    0x20ac: 0x80, // €
    0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
    0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89,
    0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e,
    0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94,
    0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98,
    0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
    0x017e: 0x9e, 0x0178: 0x9f
  };

  function encodeText(text) {
    var source = String(text === undefined || text === null ? "" : text);
    source = source.replace(/[\u2212\u2010\u2011]/g, "-")
      .replace(/[\u00d7]/g, "×")
      .replace(/[\u00f7]/g, "÷");
    var bytes = [];
    for (var i = 0; i < source.length; i++) {
      var cp = source.charCodeAt(i);
      var byte = WINANSI[cp];
      if (byte === undefined && cp >= 0xa0 && cp <= 0xff) byte = cp;
      if (byte === undefined && cp >= 0x20 && cp <= 0x7e) byte = cp;
      if (byte === undefined) {
        if (cp === 0x2192) byte = 0x3e;       // → becomes >
        else if (cp === 0x2264) byte = 0x3c;  // ≤ becomes <
        else if (cp === 0x2265) byte = 0x3e;  // ≥ becomes >
        else byte = 0x3f;                     // unsupported glyph
      }
      bytes.push(byte);
    }
    return bytes;
  }

  function hexText(text) {
    return "<" + encodeText(text).map(function (byte) {
      return ("0" + byte.toString(16)).slice(-2);
    }).join("") + ">";
  }

  function fmt(value) {
    return Number(value).toFixed(2);
  }

  function pad10(value) {
    var text = String(value);
    while (text.length < 10) text = "0" + text;
    return text;
  }

  function wrap(text, maxChars) {
    var words = String(text === undefined || text === null ? "" : text)
      .replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    var lines = [];
    var line = "";
    words.forEach(function (word) {
      while (word.length > maxChars) {
        if (line) { lines.push(line); line = ""; }
        lines.push(word.slice(0, maxChars));
        word = word.slice(maxChars);
      }
      if (!line) line = word;
      else if (line.length + 1 + word.length <= maxChars) line += " " + word;
      else { lines.push(line); line = word; }
    });
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  function PdfDoc() {
    this.pages = [];
    this.ops = [];
    this.images = [];
    this.y = 0;
    this.labels = {
      header: "Verkehrswert-Rechner Ratingen",
      footer: "Verkehrswert-Rechner Ratingen · Orientierung, keine amtliche Wertermittlung",
      page: "Seite",
      continued: "Rechenweg (Fortsetzung)",
      position: "Position",
      approach: "Ansatz",
      result: "Ergebnis",
      steps: "Schritte im Wizard"
    };
    this.newPage();
  }

  PdfDoc.prototype.text = function (text, x, y, font, size, color) {
    this.ops.push(
      "BT",
      "/" + (font || "F1") + " " + (size || 9) + " Tf",
      (color || "0.10 0.10 0.10") + " rg",
      "1 0 0 1 " + fmt(x) + " " + fmt(y) + " Tm",
      hexText(text) + " Tj",
      "ET"
    );
  };

  PdfDoc.prototype.line = function (x1, y1, x2, y2, color, width) {
    this.ops.push(
      "q",
      (color || "0.75 0.75 0.75") + " RG",
      (width || 0.5) + " w",
      fmt(x1) + " " + fmt(y1) + " m",
      fmt(x2) + " " + fmt(y2) + " l",
      "S",
      "Q"
    );
  };

  PdfDoc.prototype.rect = function (x, y, width, height, color) {
    this.ops.push(
      (color || "0.97 0.97 0.97") + " rg",
      fmt(x) + " " + fmt(y) + " " + fmt(width) + " " + fmt(height) + " re f"
    );
  };

  // Embed a baseline JPEG data URL (from the locally rendered map canvas) as
  // a DCTDecode XObject. No external image library is needed.
  PdfDoc.prototype.image = function (dataUrl, x, y, width, height, pixelWidth, pixelHeight) {
    var match = /^data:image\/jpeg;base64,(.+)$/.exec(String(dataUrl || ""));
    if (!match) return false;
    var binary;
    try { binary = atob(match[1]); } catch (e) { return false; }
    var name = "Im" + this.images.length;
    this.images.push({
      name: name,
      binary: binary,
      width: pixelWidth || 1,
      height: pixelHeight || 1
    });
    this.ops.push(
      "q",
      fmt(width) + " 0 0 " + fmt(height) + " " + fmt(x) + " " + fmt(y) + " cm",
      "/" + name + " Do",
      "Q"
    );
    return true;
  };

  PdfDoc.prototype.footer = function (pageNumber) {
    this.line(MARGIN, 38, PAGE_W - MARGIN, 38, "0.82 0.82 0.82", 0.5);
    this.text(this.labels.footer, MARGIN, 25, "F1", 7, "0.42 0.42 0.42");
    this.text(this.labels.page + " " + pageNumber, PAGE_W - MARGIN - 30, 25, "F1", 7, "0.42 0.42 0.42");
  };

  PdfDoc.prototype.newPage = function () {
    if (this.ops.length) {
      this.footer(this.pages.length + 1);
      this.pages.push(this.ops.join("\n"));
    }
    this.ops = [];
    this.y = PAGE_H - 50;
    this.text(this.labels.header, MARGIN, PAGE_H - 27, "F1", 8, "0.45 0.45 0.45");
    this.line(MARGIN, PAGE_H - 32, PAGE_W - MARGIN, PAGE_H - 32, "0.75 0.75 0.75", 0.6);
  };

  PdfDoc.prototype.ensure = function (height) {
    if (this.y - height < BOTTOM) this.newPage();
  };

  PdfDoc.prototype.titleBlock = function (title, subtitle) {
    this.y -= 5;
    this.text(title, MARGIN, this.y, "F2", 19, "0.10 0.29 0.37");
    this.y -= 20;
    this.text(subtitle || "", MARGIN, this.y, "F1", 9, "0.35 0.35 0.35");
    this.y -= 16;
    this.line(MARGIN, this.y, PAGE_W - MARGIN, this.y, "0.10 0.29 0.37", 1.2);
    this.y -= 16;
  };

  PdfDoc.prototype.heading = function (text, size) {
    this.ensure(38);
    this.y -= 12;
    this.text(text, MARGIN, this.y, "F2", size || 12, "0.10 0.29 0.37");
    this.y -= 7;
    this.line(MARGIN, this.y, PAGE_W - MARGIN, this.y, "0.78 0.78 0.78", 0.6);
    this.y -= 11;
  };

  PdfDoc.prototype.paragraph = function (text, size) {
    var lines = wrap(text, 105);
    var height = lines.length * ((size || 9) + 3) + 6;
    this.ensure(height);
    lines.forEach(function (line, index) {
      this.text(line, MARGIN, this.y - 9 - index * ((size || 9) + 3), "F1", size || 9, "0.16 0.16 0.16");
    }, this);
    this.y -= height;
  };

  PdfDoc.prototype.keyValue = function (label, value) {
    var labels = wrap(label, 34);
    var values = wrap(value, 52);
    var lines = Math.max(labels.length, values.length);
    var height = lines * 11 + 7;
    this.ensure(height);
    labels.forEach(function (line, index) {
      this.text(line, MARGIN, this.y - 9 - index * 11, "F2", 9, "0.20 0.20 0.20");
    }, this);
    values.forEach(function (line, index) {
      this.text(line, MARGIN + 245, this.y - 9 - index * 11, "F1", 9.5, "0.08 0.08 0.08");
    }, this);
    this.y -= height;
  };

  PdfDoc.prototype.table = function (rows) {
    var self = this;
    var x1 = MARGIN + 3, x2 = MARGIN + 240, x3 = PAGE_W - MARGIN - 3;

    function drawHeader() {
      self.ensure(25);
      self.rect(MARGIN, self.y - 19, PAGE_W - 2 * MARGIN, 19, "0.10 0.29 0.37");
      self.text(self.labels.position, x1, self.y - 13, "F2", 8.5, "1 1 1");
      self.text(self.labels.approach, x2, self.y - 13, "F2", 8.5, "1 1 1");
      self.text(self.labels.result, x3 - 42, self.y - 13, "F2", 8.5, "1 1 1");
      self.y -= 19;
    }

    this.ensure(45);
    drawHeader();
    (rows || []).forEach(function (row, index) {
      var cells = [
        wrap(row[0], 40),
        wrap(row[1], 34),
        wrap(row[2], 15)
      ];
      var lineCount = Math.max(cells[0].length, cells[1].length, cells[2].length);
      var height = lineCount * 11 + 8;
      if (self.y - height < BOTTOM) {
        self.newPage();
        self.heading(self.labels.continued);
        drawHeader();
      }
      var top = self.y;
      if (index % 2 === 0) {
        self.rect(MARGIN, top - height + 3, PAGE_W - 2 * MARGIN, height, "0.97 0.97 0.97");
      }
      cells.forEach(function (cellLines, column) {
        var x = column === 0 ? x1 : (column === 1 ? x2 : x3 - Math.min(15, cellLines[0].length) * 4.6);
        cellLines.forEach(function (line, lineIndex) {
          self.text(line, x, top - 10 - lineIndex * 11, "F1", 8.5,
            column === 2 ? "0.08 0.08 0.08" : "0.16 0.16 0.16");
        });
      });
      self.line(MARGIN, top - height, PAGE_W - MARGIN, top - height, "0.86 0.86 0.86", 0.4);
      self.y = top - height;
    });
  };

  // Generic wrapping table for the tables shown inside the wizard steps.
  PdfDoc.prototype.grid = function (rows, options) {
    rows = (rows || []).filter(function (row) { return row && row.length; });
    if (!rows.length) return;
    var widths = (options && options.widths) || rows[0].map(function () { return 1; });
    var total = widths.reduce(function (sum, w) { return sum + (Number(w) || 1); }, 0) || 1;
    var available = PAGE_W - 2 * MARGIN - 6;
    var xs = [], cursor = MARGIN + 3;
    widths.forEach(function (w) {
      xs.push(cursor);
      cursor += available * (Number(w) || 1) / total;
    });
    xs.push(MARGIN + 3 + available);

    function drawHeader(self, cells) {
      self.ensure(23);
      self.rect(MARGIN, self.y - 19, PAGE_W - 2 * MARGIN, 19, "0.10 0.29 0.37");
      cells.forEach(function (cell, index) {
        self.text(cell, xs[index] + 2, self.y - 13, "F2", 8, "1 1 1");
      });
      self.y -= 19;
    }

    var header = !options || options.header !== false;
    var dataRows = header ? rows.slice(1) : rows;
    if (header) drawHeader(this, rows[0].map(function (cell) { return String(cell || ""); }));

    dataRows.forEach(function (row, index) {
      var cells = row.map(function (cell, column) {
        var width = xs[column + 1] - xs[column] - 5;
        return wrap(cell, Math.max(6, Math.floor(width / 4.4)));
      });
      var lines = Math.max.apply(null, cells.map(function (cell) { return cell.length; }));
      var rowHeight = lines * 10 + 7;
      if (this.y - rowHeight < BOTTOM) {
        this.newPage();
        if (header) drawHeader(this, rows[0].map(function (cell) { return String(cell || ""); }));
      }
      var top = this.y;
      if (index % 2 === 0) {
        this.rect(MARGIN, top - rowHeight + 3, PAGE_W - 2 * MARGIN, rowHeight, "0.975 0.975 0.975");
      }
      cells.forEach(function (lines2, column) {
        lines2.forEach(function (line, lineIndex) {
          this.text(line, xs[column] + 2, top - 9 - lineIndex * 10, "F1", 7.7, "0.16 0.16 0.16");
        }, this);
      }, this);
      this.line(MARGIN, top - rowHeight, PAGE_W - MARGIN, top - rowHeight, "0.87 0.87 0.87", 0.4);
      this.y = top - rowHeight;
    }, this);
  };

  // Vector chart for the plots rendered in the wizard. Coordinates are
  // normalised (0..1, y=0 at the bottom), so the same config drives SVG and PDF.
  PdfDoc.prototype.chart = function (config) {
    config = config || {};
    var height = config.height || 135;
    this.ensure(height + 34);

    var topY = this.y - 10;
    var bottomY = topY - height + 20;
    var leftX = MARGIN + 34;
    var rightX = PAGE_W - MARGIN - 10;
    var plotW = rightX - leftX;
    var plotH = topY - bottomY;
    var X = function (nx) { return leftX + Math.max(0, Math.min(1, Number(nx) || 0)) * plotW; };
    var Y = function (ny) { return bottomY + Math.max(0, Math.min(1, Number(ny) || 0)) * plotH; };

    this.rect(leftX, bottomY, plotW, plotH, config.background || "0.985 0.985 0.985");
    (config.grid || [0, 0.5, 1]).forEach(function (share) {
      this.line(leftX, bottomY + share * plotH, rightX, bottomY + share * plotH, "0.86 0.86 0.86", 0.4);
    }, this);
    this.line(leftX, bottomY, rightX, bottomY, "0.58 0.58 0.58", 0.6);
    this.line(leftX, bottomY, leftX, topY, "0.58 0.58 0.58", 0.6);

    (config.plots || []).forEach(function (plot) {
      var color = plot.color || "0.10 0.29 0.37";
      if (plot.type === "bars") {
        (plot.bars || []).forEach(function (bar) {
          var width = Math.max(1, (bar.width || 0.08) * plotW);
          this.rect(X(bar.x || 0) - width / 2, bottomY, width, Y(bar.y || 0) - bottomY, bar.color || color);
        }, this);
      } else if (plot.type === "hbars") {
        (plot.items || []).forEach(function (item) {
          var x1 = X(item.start || 0), x2 = X(item.end || 0);
          var y = Y(item.row === undefined ? 0.5 : item.row) - 4;
          this.rect(x1, y, Math.max(1, x2 - x1), 8, item.color || color);
          if (item.label) {
            this.text(item.label, (x1 + x2) / 2 - String(item.label).length * 2.1, y + 6,
              "F1", 6.5, "0.16 0.16 0.16");
          }
        }, this);
      } else if (plot.type === "line" || plot.type === "hline") {
        var points = plot.type === "hline"
          ? [[0, plot.y || 0], [1, plot.y || 0]]
          : (plot.points || []);
        if (points.length > 1) {
          if (plot.dash && plot.dash.length) this.ops.push("[" + plot.dash.join(" ") + "] 0 d");
          else this.ops.push("[] 0 d");
          this.ops.push((color) + " RG", (plot.width || 1) + " w");
          points.forEach(function (point, index) {
            this.ops.push(fmt(X(point[0])) + " " + fmt(Y(point[1])) + " " + (index ? "l" : "m"));
          }, this);
          this.ops.push("S", "[] 0 d");
        }
      } else if (plot.type === "vline") {
        if (plot.dash && plot.dash.length) this.ops.push("[" + plot.dash.join(" ") + "] 0 d");
        else this.ops.push("[] 0 d");
        this.line(X(plot.x), bottomY, X(plot.x), topY, color, plot.width || 0.8);
        this.ops.push("[] 0 d");
      } else if (plot.type === "dots") {
        (plot.points || []).forEach(function (point) {
          var size = plot.size || 4;
          if (plot.halo) this.rect(X(point[0]) - size / 2 - 1, Y(point[1]) - size / 2 - 1, size + 2, size + 2, plot.halo);
          this.rect(X(point[0]) - size / 2, Y(point[1]) - size / 2, size, size, color);
        }, this);
      } else if (plot.type === "labels") {
        (plot.items || []).forEach(function (item) {
          this.text(item.text, X(item.x) - String(item.text).length * 2.1, Y(item.y) + 3,
            "F1", item.size || 7, item.color || "0.20 0.20 0.20");
        }, this);
      }
    }, this);

    (config.xLabels || []).forEach(function (label) {
      this.text(label.text, X(label.x) - String(label.text).length * 2.1, bottomY - 9,
        "F1", 6.8, "0.36 0.36 0.36");
    }, this);
    (config.yLabels || []).forEach(function (label) {
      this.text(label.text, leftX - 5 - String(label.text).length * 2.3, Y(label.y) + 2,
        "F1", 6.8, "0.36 0.36 0.36");
    }, this);

    this.y = bottomY - 17;
  };

  PdfDoc.prototype.blob = function (title, labels) {
    if (labels) Object.keys(labels).forEach(function (key) { this.labels[key] = labels[key]; }, this);
    this.footer(this.pages.length + 1);
    this.pages.push(this.ops.join("\n"));

    var objects = [];
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = "<< /Type /Pages /Kids [" + this.pages.map(function (_, index) {
      return (6 + index * 2) + " 0 R";
    }).join(" ") + "] /Count " + this.pages.length + " >>";
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    objects[5] = "<< /Title " + hexText(title || "Bericht") +
      " /Author " + hexText("Verkehrswert-Rechner Ratingen") +
      " /Subject " + hexText("Sachwertverfahren, Ratingen") + " >>";

    var imageStart = 6 + this.pages.length * 2;
    var xobjects = this.images.map(function (image, index) {
      return "/" + image.name + " " + (imageStart + index) + " 0 R";
    }).join(" ");
    var resources = "/Resources << /Font << /F1 3 0 R /F2 4 0 R >>" +
      (xobjects ? " /XObject << " + xobjects + " >>" : "") + " >>";

    this.pages.forEach(function (stream, index) {
      var pageNum = 6 + index * 2;
      var contentNum = pageNum + 1;
      objects[pageNum] = "<< /Type /Page /Parent 2 0 R " +
        "/MediaBox [0 0 " + fmt(PAGE_W) + " " + fmt(PAGE_H) + "] " +
        resources + " /Contents " + contentNum + " 0 R >>";
      objects[contentNum] = "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream";
    });

    this.images.forEach(function (image, index) {
      objects[imageStart + index] = "<< /Type /XObject /Subtype /Image /Width " + image.width +
        " /Height " + image.height + " /ColorSpace /DeviceRGB /BitsPerComponent 8 " +
        "/Filter /DCTDecode /Length " + image.binary.length + " >>\nstream\n" +
        image.binary + "\nendstream";
    });

    var out = "%PDF-1.4\n%" + String.fromCharCode(0xe2, 0xe3, 0xcf, 0xd3) + "\n";
    var offsets = ["0000000000"];
    for (var num = 1; num < objects.length; num++) {
      offsets[num] = pad10(out.length);
      out += num + " 0 obj\n" + objects[num] + "\nendobj\n";
    }
    var xrefOffset = out.length;
    out += "xref\n0 " + objects.length + "\n";
    for (var i = 0; i < objects.length; i++) {
      out += offsets[i] + (i === 0 ? " 65535 f \n" : " 00000 n \n");
    }
    out += "trailer\n<< /Size " + objects.length +
      " /Root 1 0 R /Info 5 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF\n";

    var bytes = new Uint8Array(out.length);
    for (var j = 0; j < out.length; j++) bytes[j] = out.charCodeAt(j) & 0xff;
    return new Blob([bytes], { type: "application/pdf" });
  };

  function buildReport(report) {
    var doc = new PdfDoc();
    var labels = report.labels || {};
    var title = report.title || labels.reportTitle || "Verkehrswert-Bericht";
    doc.titleBlock(title, report.subtitle || "");

    if (report.meta && report.meta.length) {
      doc.heading(labels.object || "Objekt und Wertermittlungsstichtag");
      report.meta.forEach(function (item) { doc.keyValue(item[0], item[1]); });
    }
    if (report.summary && report.summary.length) {
      doc.heading(labels.result || "Ergebnis");
      report.summary.forEach(function (item) { doc.keyValue(item[0], item[1]); });
    }
    if (report.rows && report.rows.length) {
      doc.heading(labels.calculation || "Rechenweg");
      doc.table(report.rows);
    }
    if (report.warnings && report.warnings.length) {
      doc.heading(labels.notes || "Hinweise");
      report.warnings.forEach(function (warning) { doc.paragraph(warning); });
    }
    if (report.mapImage) {
      var map = report.mapImage;
      doc.heading(map.heading || labels.map || "Kartenübersicht");
      var maxWidth = PAGE_W - 2 * MARGIN;
      var width = Math.min(maxWidth, map.width || maxWidth);
      var height = width * (Number(map.height) || 1) / (Number(map.width) || 1);
      if (height > 220) { height = 220; width = height * Number(map.width) / Number(map.height); }
      doc.ensure(height + 30);
      var x = MARGIN + (maxWidth - width) / 2;
      var y = doc.y - height;
      if (doc.image(map.dataUrl, x, y, width, height, map.width, map.height)) {
        doc.line(x, y, x + width, y, "0.55 0.55 0.55", 0.6);
        doc.line(x, y + height, x + width, y + height, "0.55 0.55 0.55", 0.6);
        doc.line(x, y, x, y + height, "0.55 0.55 0.55", 0.6);
        doc.line(x + width, y, x + width, y + height, "0.55 0.55 0.55", 0.6);
        doc.y = y - 8;
      }
      if (map.caption) doc.paragraph(map.caption, 8);
    }
    if (report.charts && report.charts.length) {
      doc.heading(labels.charts || "Diagramme");
      report.charts.forEach(function (chart) {
        doc.heading(chart.title || labels.charts || "Diagramm");
        doc.chart(chart);
        if (chart.caption) doc.paragraph(chart.caption, 8);
      });
    }
    if (report.glossary && report.glossary.length) {
      doc.heading(labels.glossary || "Begriffe und Abkürzungen");
      report.glossary.forEach(function (item) { doc.keyValue(item[0], item[1]); });
    }
    if (report.sections && report.sections.length) {
      report.sections.forEach(function (section) {
        doc.heading(section.heading);
        (section.paragraphs || []).forEach(function (paragraph) {
          doc.paragraph(paragraph, section.size || 8.5);
        });
        (section.kv || []).forEach(function (item) { doc.keyValue(item[0], item[1]); });
        (section.rows || []).forEach(function (rows) { doc.grid(rows); });
      });
    }
    if (report.stepSections && report.stepSections.length) {
      doc.heading(labels.steps || "Schritte im Wizard");
      report.stepSections.forEach(function (section) {
        doc.heading(section.heading, 10);
        (section.paragraphs || []).forEach(function (paragraph) {
          doc.paragraph(paragraph, 8);
        });
        (section.rows || []).forEach(function (rows) { doc.grid(rows); });
      });
    }
    if (report.notes && report.notes.length) {
      doc.heading(labels.sources || "Quellen und Hinweis");
      report.notes.forEach(function (note) { doc.paragraph(note); });
    }
    return doc.blob(title, labels);
  }

  global.VW_PDF = { buildReport: buildReport };
})(window);
