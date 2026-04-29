export const printStorageLabels = ({ items = [], business_name = "" }) => {
  const win = window.open("", "_blank", "width=900,height=700");

  if (!win) {
    alert("Unable to open print window. Please allow popups for this site.");
    return;
  }

  const labelsHtml = items
    .map((item, index) => {
      return `
        <div class="label">
          <div class="barcode-wrapper">
            <svg id="barcode-${index}"></svg>
          </div>

          <div class="barcode-text">
            ${item.generated_barcode || ""}
          </div>

          <div class="product-name">
            ${item.product_name || ""}
          </div>

          <div class="item-position">
            Item ${
              item.product_sequence || index + 1
            } of ${item.total_for_product || 1}
          </div>

          <div class="company-name">
            ${business_name}
          </div>
        </div>
      `;
    })
    .join("");

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Storage Barcode Labels</title>

        <style>
          @page {
            size: 50mm 25mm;
            margin: 0;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background: #fff;
          }

          body {
            display: flex;
            flex-wrap: wrap;
          }

          .label {
            width: 50mm;
            height: 25mm;
            box-sizing: border-box;
            padding: 1.5mm 2mm;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            border: 0;
            overflow: hidden;
            page-break-after: always;
            position: relative;
          }

          .barcode-wrapper {
            width: 100%;
            height: 10mm;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 1mm;
          }

          .barcode-wrapper svg {
            width: 100%;
            height: 100%;
          }

          .barcode-text {
            font-size: 7px;
            line-height: 1;
            text-align: center;
            word-break: break-all;
            margin-bottom: 1mm;
          }

          .product-name {
            font-size: 9px;
            line-height: 1.1;
            font-weight: bold;
            text-align: center;
            margin-bottom: 0.5mm;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .item-position {
            font-size: 8px;
            text-align: center;
            margin-bottom: auto;
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
        </style>
      </head>

      <body>
        ${labelsHtml}
      </body>
    </html>
  `);

  win.document.close();

  const script = win.document.createElement("script");
  script.src =
    "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js";

  script.onload = () => {
    items.forEach((item, index) => {
      const el = win.document.getElementById(`barcode-${index}`);

      if (!el) return;

      win.JsBarcode(el, item.generated_barcode || "", {
        format: "CODE128",
        displayValue: false,
        width: 1.1,
        height: 26,
        margin: 0,
      });
    });

    setTimeout(() => {
      win.focus();
      win.print();
    }, 500);
  };

  script.onerror = () => {
    alert(
      "Unable to load barcode generator library. Please check your internet connection.",
    );
  };

  win.document.body.appendChild(script);
};
