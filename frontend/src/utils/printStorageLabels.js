export const printStorageLabels = ({ storage_no, items, business_name }) => {
  const win = window.open("", "PRINT", "width=900,height=700");

  let html = `
    <html>
      <head>
        <title>Storage Labels</title>
        <style>
          @page {
            size: 50mm 25mm;
            margin: 0;
          }

          body {
            margin: 0;
            font-family: Arial, sans-serif;
          }

          .label {
            width: 50mm;
            height: 25mm;
            padding: 2mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            page-break-after: always;
          }

          .barcode {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 2px;
          }

          .name {
            font-size: 9px;
            margin-bottom: 2px;
          }

          .qty {
            font-size: 8px;
          }

          .biz {
            font-size: 6px;
            margin-top: 2px;
          }
        </style>
      </head>
      <body>
  `;

  items.forEach((item) => {
    for (let i = 1; i <= Number(item.quantity); i++) {
      html += `
        <div class="label">
          <div class="barcode">*${storage_no}*</div>
          <div class="name">${item.product_name}</div>
          <div class="qty">Item ${i} of ${item.quantity}</div>
          <div class="biz">${business_name}</div>
        </div>
      `;
    }
  });

  html += `
      </body>
    </html>
  `;

  win.document.write(html);
  win.document.close();
  win.focus();

  setTimeout(() => {
    win.print();
  }, 500);
};
