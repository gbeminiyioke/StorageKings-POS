import bwipjs from "bwip-js";

/*
 * ============================================================
 * StorageKings Barcode Label Printer
 * ============================================================
 *
 * Printer:
 *   XPrinter XP-365B
 *
 * Printer resolution:
 *   203 DPI
 *
 * Label:
 *   60mm x 40mm
 *
 * Barcode:
 *   Code 128
 *
 * Important:
 *   - The StorageKings barcode value is NEVER modified.
 *   - No SVG is used.
 *   - No CDN is used.
 *   - No CSS transform scaling is used.
 *   - Barcode is generated from bwip-js RAW Code 128 data.
 *   - Barcode is rasterized directly onto a printer-oriented canvas.
 *
 * Example:
 *
 *   SGV-00000016/SC001/018
 *
 * ============================================================
 */

const PRINTER_DPI = 203;

const LABEL_WIDTH_MM = 60;
const LABEL_HEIGHT_MM = 40;

// Native printer dots for the complete label.
const LABEL_WIDTH_DOTS = Math.round((LABEL_WIDTH_MM / 25.4) * PRINTER_DPI);

const LABEL_HEIGHT_DOTS = Math.round((LABEL_HEIGHT_MM / 25.4) * PRINTER_DPI);

/*
 * Target physical barcode width.
 *
 * We deliberately target approximately 52mm rather than 48mm.
 *
 * Why?
 *
 * Code 128:
 *
 *   255 symbol modules
 *   + 10X quiet zone each side
 *   = approximately 275 modules
 *
 * At approximately 0.19mm/module:
 *
 *   275 × 0.19 = 52.25mm
 *
 * This gives us a practical barcode width while retaining
 * the required quiet zone.
 */
const BARCODE_WIDTH_MM = 52.25;

const BARCODE_WIDTH_DOTS = Math.round((BARCODE_WIDTH_MM / 25.4) * PRINTER_DPI);

/*
 * Barcode height.
 *
 * 15mm gives the MS9520 a healthy scan height while leaving
 * sufficient room for the human-readable information below.
 */
const BARCODE_HEIGHT_MM = 15;

const BARCODE_HEIGHT_DOTS = Math.round(
  (BARCODE_HEIGHT_MM / 25.4) * PRINTER_DPI,
);

/*
 * Code 128 quiet zone.
 *
 * 10X minimum.
 *
 * This is expressed in logical Code 128 modules and is converted
 * into printer dots after the symbol width is calculated.
 */
const QUIET_ZONE_MODULES = 10;

/*
 * Convert millimetres to printer dots.
 */
const mmToDots = (mm) => Math.round((mm / 25.4) * PRINTER_DPI);

/*
 * Convert printer dots back to millimetres.
 */
const dotsToMm = (dots) => (dots / PRINTER_DPI) * 25.4;

/**
 * ------------------------------------------------------------
 * Convert Code 128 raw BWIPP data into a binary module array.
 * ------------------------------------------------------------
 *
 * bwip-js.raw() returns the low-level BWIPP representation.
 *
 * For linear barcodes:
 *
 *   sbs = alternating bar/space widths.
 *
 * Example:
 *
 *   [2,1,1,2,...]
 *
 * means:
 *
 *   2 modules black
 *   1 module white
 *   1 module black
 *   2 modules white
 *
 * We convert that into:
 *
 *   [1,1,0,1,0,0,...]
 *
 * where:
 *
 *   1 = black
 *   0 = white
 */
const getCode128Modules = (value) => {
  if (!value) {
    throw new Error("Barcode value is empty.");
  }

  const raw = bwipjs.raw({
    bcid: "code128",
    text: value,
  });

  if (!raw || !raw.length) {
    throw new Error("bwip-js returned no raw barcode data.");
  }

  const linear = raw.find((entry) => Array.isArray(entry.sbs));

  if (!linear) {
    throw new Error("Unable to locate Code 128 bar/space data.");
  }

  const { sbs } = linear;

  const modules = [];

  let isBar = true;

  for (const width of sbs) {
    const moduleWidth = Math.round(Number(width));

    if (!Number.isFinite(moduleWidth) || moduleWidth <= 0) {
      throw new Error(`Invalid Code 128 module width: ${width}`);
    }

    for (let i = 0; i < moduleWidth; i++) {
      modules.push(isBar ? 1 : 0);
    }

    isBar = !isBar;
  }

  return {
    modules,
    sbs,
    raw,
  };
};

/**
 * ------------------------------------------------------------
 * Rasterize logical Code 128 modules onto printer dots.
 * ------------------------------------------------------------
 *
 * This is the important part.
 *
 * We DON'T resize a completed barcode bitmap.
 *
 * Instead, we map the logical barcode modules directly onto
 * the target printer raster.
 *
 * This prevents the previous 550px -> smaller-image scaling
 * problem.
 */
const rasterizeBarcode = ({ ctx, modules, x, y, widthDots, heightDots }) => {
  if (!modules.length) {
    throw new Error("Barcode contains no modules.");
  }

  /*
   * Add 10X quiet zones.
   *
   * We include the quiet zones inside the target barcode area.
   */
  const totalModuleCount = modules.length + QUIET_ZONE_MODULES * 2;

  /*
   * Calculate the width represented by one logical module
   * in printer dots.
   *
   * Example:
   *
   *   275 modules
   *   418 dots
   *
   *   ≈ 1.52 dots/module
   */
  const moduleWidthDots = widthDots / totalModuleCount;

  /*
   * Turn off anti-aliasing.
   *
   * Canvas itself is being used as a binary raster surface.
   */
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = "#000000";

  /*
   * Draw only the black modules.
   *
   * The left quiet zone is represented by the starting offset.
   */
  let moduleIndex = QUIET_ZONE_MODULES;

  for (const module of modules) {
    if (module === 1) {
      /*
       * Calculate both edges from the cumulative logical
       * module position.
       *
       * This distributes rounding error across the entire
       * barcode instead of accumulating it.
       */
      const left = x + Math.round(moduleIndex * moduleWidthDots);

      const right = x + Math.round((moduleIndex + 1) * moduleWidthDots);

      const barWidth = right - left;

      if (barWidth > 0) {
        ctx.fillRect(left, y, barWidth, heightDots);
      }
    }

    moduleIndex++;
  }
};

/**
 * ------------------------------------------------------------
 * Generate a complete barcode canvas.
 * ------------------------------------------------------------
 */
const generateBarcodeCanvas = (value) => {
  const { modules, sbs } = getCode128Modules(value);

  const canvas = document.createElement("canvas");

  /*
   * We create the barcode canvas at the printer's native
   * 203-DPI raster dimensions.
   */
  canvas.width = BARCODE_WIDTH_DOTS;
  canvas.height = BARCODE_HEIGHT_DOTS;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to create barcode canvas context.");
  }

  /*
   * White background.
   */
  ctx.fillStyle = "#ffffff";

  ctx.fillRect(0, 0, canvas.width, canvas.height);

  /*
   * Calculate barcode symbol dimensions.
   */
  const totalModules = modules.length + QUIET_ZONE_MODULES * 2;

  const moduleWidth = BARCODE_WIDTH_DOTS / totalModules;

  const moduleWidthMm = dotsToMm(moduleWidth);

  /*
   * Barcode starts at the top of the barcode canvas.
   */
  rasterizeBarcode({
    ctx,
    modules,
    x: 0,
    y: 0,
    widthDots: BARCODE_WIDTH_DOTS,
    heightDots: BARCODE_HEIGHT_DOTS,
  });

  /*
   * Diagnostic information.
   */
  /*
  console.log("========== STORAGE BARCODE RAW RASTER DIAGNOSTIC ==========");
  console.log("VALUE:", value);
  console.log("SYMBOL: Code 128 AUTO");
  console.log("LOGICAL BARCODE MODULES:", modules.length);
  console.log("QUIET ZONE:", `${QUIET_ZONE_MODULES}X each side`);
  console.log("TOTAL MODULES INCLUDING QUIET ZONES:", totalModules);
  console.log("PRINTER:", "XPrinter XP-365B");
  console.log("PRINTER DPI:", PRINTER_DPI);
  console.log("LABEL:", `${LABEL_WIDTH_MM} × ${LABEL_HEIGHT_MM} mm`);
  console.log("LABEL DOTS:", `${LABEL_WIDTH_DOTS} × ${LABEL_HEIGHT_DOTS}`);
  console.log("TARGET BARCODE WIDTH:", `${BARCODE_WIDTH_MM} mm`);
  console.log("BARCODE WIDTH:", `${BARCODE_WIDTH_DOTS} dots`);
  console.log("BARCODE HEIGHT:", `${BARCODE_HEIGHT_MM} mm`);
  console.log("BARCODE HEIGHT:", `${BARCODE_HEIGHT_DOTS} dots`);
  console.log(
    "AVERAGE MODULE WIDTH:",
    `${moduleWidth.toFixed(3)} printer dots`,
  );
  console.log("AVERAGE MODULE WIDTH:", `${moduleWidthMm.toFixed(3)} mm`);
  console.log("BWIP RAW RUNS:", sbs);
  console.log("===========================================================");
*/
  return canvas;
};

/**
 * ------------------------------------------------------------
 * Escape HTML
 * ------------------------------------------------------------
 */
const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * ------------------------------------------------------------
 * Convert canvas to PNG data URL.
 * ------------------------------------------------------------
 */
const canvasToDataUrl = (canvas) => {
  return canvas.toDataURL("image/png");
};

/**
 * ------------------------------------------------------------
 * Print StorageKings barcode labels.
 * ------------------------------------------------------------
 */
export const printStorageLabels = ({ items = [], business_name = "" }) => {
  if (!items.length) {
    alert("There are no barcode labels to print.");
    return;
  }

  const win = window.open("", "_blank", "width=1000,height=800");

  if (!win) {
    alert("Unable to open print window. Please allow popups for this site.");

    return;
  }

  try {
    /*
     * --------------------------------------------------------
     * Generate barcode images first.
     * --------------------------------------------------------
     */
    const labels = items.map((item, index) => {
      const barcodeValue = item.generated_barcode || "";
      //const barcodeValue = "SGV-00000016/SC001/018";
      //const barcodeValue = "SGV-00000034/WM001/001";
      //const barcodeValue = "SGA-00000002/BF004/006";
      //const barcodeValue = "SGV-00000034/WM001/001";

      if (!barcodeValue) {
        throw new Error(`Barcode value is missing for item ${index + 1}.`);
      }

      //console.log("STORAGE BARCODE:", barcodeValue);

      const barcodeCanvas = generateBarcodeCanvas(barcodeValue);

      return {
        item,
        index,
        barcodeValue,
        barcodeImage: canvasToDataUrl(barcodeCanvas),
      };
    });

    /*
     * --------------------------------------------------------
     * Build printable HTML.
     * --------------------------------------------------------
     *
     * The barcode itself is already rasterized.
     *
     * We do NOT apply:
     *
     *   transform: scale()
     *
     *   SVG
     *
     *   CSS barcode resizing
     *
     *   CDN
     *
     * The complete label is defined as 60mm x 40mm.
     */
    const labelsHtml = labels
      .map(({ item, barcodeValue, barcodeImage, index }) => {
        return `
            <div class="label">

              <img
                class="barcode-image"
                src="${barcodeImage}"
                alt="Barcode ${escapeHtml(barcodeValue)}"
              />

              <div class="barcode-text">
                ${escapeHtml(barcodeValue)}
              </div>

              <div class="product-name">
                ${escapeHtml(item.product_name || "")}
              </div>

              <div class="item-position">
                Item ${item.product_sequence || index + 1}
                of ${item.total_for_product || 1}
              </div>

              <div class="company-name">
                ${escapeHtml(business_name)}
              </div>

            </div>
          `;
      })
      .join("");

    /*
     * --------------------------------------------------------
     * Printable document
     * --------------------------------------------------------
     */
    win.document.open();

    win.document.write(`
      <!DOCTYPE html>

      <html>

        <head>

          <meta charset="UTF-8">

          <title>
            StorageKings Barcode Labels
          </title>

          <style>

            @page {
              size: 60mm 40mm;
              margin: 0;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              width: 60mm;
              background: #ffffff;
            }

            body {
              font-family: Arial, sans-serif;
            }

            .label {

              width: 60mm;
              height: 40mm;

              box-sizing: border-box;

              padding:
                2mm
                2mm
                1.5mm
                2mm;

              position: relative;

              overflow: hidden;

              page-break-after: always;

              break-after: page;

              background: #ffffff;
            }

            /*
             * IMPORTANT:
             *
             * The barcode image already contains the final
             * 203-DPI raster.
             *
             * We only place it into the label.
             */
            .barcode-image {

              display: block;

              width: 52.25mm;

              height: 15mm;

              margin: 0 auto;

              object-fit: contain;

              image-rendering: pixelated;
            }

            .barcode-text {

              font-size: 7px;

              line-height: 1;

              text-align: center;

              white-space: nowrap;

              margin-top: 1mm;

              margin-bottom: 1.5mm;
            }

            .product-name {

              font-size: 9px;

              line-height: 1.1;

              font-weight: bold;

              text-align: center;

              overflow: hidden;

              white-space: nowrap;

              text-overflow: ellipsis;

              margin-bottom: 0.5mm;
            }

            .item-position {

              font-size: 8px;

              line-height: 1;

              text-align: center;
            }

            .company-name {

              position: absolute;

              right: 2mm;

              bottom: 1mm;

              font-size: 6px;

              color: #444;

              text-align: right;

              max-width: 70%;

              overflow: hidden;

              white-space: nowrap;

              text-overflow: ellipsis;
            }

            /*
             * Prevent the browser from trying to apply
             * grayscale/optimization to the barcode.
             */
            .barcode-image {

              filter: none;

              opacity: 1;
            }

            @media print {

              html,
              body {

                width: 60mm;

                margin: 0;

                padding: 0;
              }

              .label {

                page-break-after: always;

                break-after: page;
              }

            }

          </style>

        </head>

        <body>

          ${labelsHtml}

        </body>

      </html>
    `);

    win.document.close();

    /*
     * Give the browser enough time to decode all PNG
     * data URLs before invoking print.
     */
    setTimeout(() => {
      win.focus();

      win.print();
    }, 500);
  } catch (error) {
    console.error("Storage barcode generation failed:", error);

    try {
      win.close();
    } catch {
      // Ignore close errors.
    }

    alert(
      `Unable to generate storage barcode labels.\n\n${
        error?.message || "Unknown error"
      }`,
    );
  }
};
