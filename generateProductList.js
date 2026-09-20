function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function shuffle(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const PRODUCT_NAMES = [
  "Wireless Mouse", "USB-C Cable", "Bluetooth Speaker", "Laptop Stand", "Desk Lamp",
  "Mechanical Keyboard", "Webcam", "Phone Case", "Screen Protector", "Power Bank",
  "Noise Cancelling Headphones", "HDMI Adapter", "Wireless Charger", "Monitor Arm",
  "Cable Organizer", "External Hard Drive", "SD Card Reader", "Laptop Sleeve",
  "Ergonomic Mouse Pad", "Portable SSD", "USB Hub", "Graphics Tablet", "Ring Light",
  "Microphone Stand", "Laptop Cooling Pad", "Webcam Cover", "Tablet Stand",
  "Bluetooth Adapter", "Screen Cleaner Kit", "Cable Ties Pack", "Docking Station",
  "Wireless Earbuds", "Laptop Backpack", "Surge Protector", "Keyboard Wrist Rest",
  "USB Flash Drive", "Monitor Light Bar", "Anti-Glare Filter", "Cooling Fan Pad",
  "Wireless Presenter",
];

function generateProductList(numItems, seed = 42, distractorDistance = 'close', structureType = 'table', mode = 'single', clusterSize = 5, askDirection = 'name-to-price') {
  const rng = seededRandom(seed);

  if (numItems > PRODUCT_NAMES.length) {
    throw new Error(`Nur ${PRODUCT_NAMES.length} Produktnamen verfügbar, ${numItems} angefragt.`);
  }

  const names = shuffle(PRODUCT_NAMES, rng).slice(0, numItems);
  const targetPrice = Math.round((10 + rng() * 40) * 100) / 100;

  const usedPrices = new Set([targetPrice]);
  const products = [];

  names.forEach((name, index) => {
    if (index === 0) {
      products.push({ id: `item-${index}`, name, price: targetPrice, isTarget: true });
      return;
    }

    let price;
    if (askDirection === 'find-cheapest') {
      if (index <= clusterSize) {
        do {
          const gap = 0.01 + rng() * 0.49;
          price = Math.round((targetPrice + gap) * 100) / 100;
        } while (usedPrices.has(price));
      } else {
        do {
          price = Math.round((targetPrice + 3 + rng() * 40) * 100) / 100;
        } while (usedPrices.has(price));
      }
    } else if (mode === 'cluster' && index <= clusterSize) {
      do {
        const gap = 0.01 + rng() * 0.49;
        const sign = rng() < 0.5 ? -1 : 1;
        price = Math.round((targetPrice + sign * gap) * 100) / 100;
      } while (usedPrices.has(price) || price <= 0);
    } else {
      const gapRanges = { far: [5.0, 20.0], close: [0.5, 2.0], very_close: [0.01, 0.3] };
      const [minGap, maxGap] = gapRanges[distractorDistance];
      do {
        const gap = minGap + rng() * (maxGap - minGap);
        const sign = rng() < 0.5 ? -1 : 1;
        price = Math.round((targetPrice + sign * gap) * 100) / 100;
      } while (usedPrices.has(price) || price <= 0);
    }
    usedPrices.add(price);
    products.push({ id: `item-${index}`, name, price, isTarget: false });
  });

  const shuffledProducts = shuffle(products, rng);
  const target = shuffledProducts.find((p) => p.isTarget);

  let bodyContent;
  if (structureType === 'table') {
    const tableRows = shuffledProducts
      .map((p) => `      <tr id="${p.id}"><td>${p.name}</td><td>$${p.price.toFixed(2)}</td></tr>`)
      .join('\n');
    bodyContent = `  <table>
    <thead><tr><th>Product</th><th>Price</th></tr></thead>
    <tbody>
${tableRows}
    </tbody>
  </table>`;
  } else {
    const listItems = shuffledProducts
      .map((p) => `    <li id="${p.id}">${p.name}: $${p.price.toFixed(2)}</li>`)
      .join('\n');
    bodyContent = `  <ul>\n${listItems}\n  </ul>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Product List (${numItems} items)</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; }
    table { border-collapse: collapse; width: 100%; max-width: 500px; }
    th, td { border: 1px solid #ccc; padding: 6px 12px; text-align: left; }
    th { background: #f0f0f0; }
    ul { list-style: none; padding: 0; max-width: 500px; }
    li { border-bottom: 1px solid #ccc; padding: 6px 12px; }
  </style>
</head>
<body>
  <h1>Product Catalog</h1>
${bodyContent}
</body>
</html>
`;

  const question = askDirection === 'price-to-name'
    ? `Which product costs exactly $${target.price.toFixed(2)}? Answer with ONLY the product name, nothing else.`
    : askDirection === 'find-cheapest'
    ? `Which product is the cheapest (has the lowest price)? Answer with ONLY the product name, nothing else.`
    : `What is the price of the ${target.name}?`;

  const expectedAnswer = askDirection === 'find-cheapest' || askDirection === 'price-to-name'
    ? target.name
    : target.price;

  const groundTruth = {
    task: 'product-price-lookup',
    askDirection,
    mode,
    numItems,
    seed,
    targetProduct: target.name,
    targetPrice: target.price,
    question,
    expectedAnswer,
  };

  return { html, groundTruth };
}

module.exports = { generateProductList };
