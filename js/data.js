// ============================================
// DATA.JS - Game Data Definitions
// ============================================

const PRODUCTS = {
  fruits: [
    { id: 'apple', name: 'Apple', emoji: '🍎', category: 'fruits', wholesale: 1.2, defaultPrice: 2.5, demand: 9, weight: 0.3 },
    { id: 'banana', name: 'Banana', emoji: '🍌', category: 'fruits', wholesale: 0.8, defaultPrice: 1.8, demand: 8, weight: 0.2 },
    { id: 'orange', name: 'Orange', emoji: '🍊', category: 'fruits', wholesale: 1.0, defaultPrice: 2.2, demand: 7, weight: 0.25 },
    { id: 'mango', name: 'Mango', emoji: '🥭', category: 'fruits', wholesale: 1.5, defaultPrice: 3.5, demand: 6, weight: 0.4 },
    { id: 'grapes', name: 'Grapes', emoji: '🍇', category: 'fruits', wholesale: 2.0, defaultPrice: 4.5, demand: 7, weight: 0.5 },
    { id: 'strawberry', name: 'Strawberries', emoji: '🍓', category: 'fruits', wholesale: 2.5, defaultPrice: 5.0, demand: 8, weight: 0.3 },
    { id: 'watermelon', name: 'Watermelon', emoji: '🍉', category: 'fruits', wholesale: 3.0, defaultPrice: 6.0, demand: 6, weight: 3.0 },
    { id: 'pineapple', name: 'Pineapple', emoji: '🍍', category: 'fruits', wholesale: 2.2, defaultPrice: 4.8, demand: 7, weight: 1.2 },
    { id: 'peach', name: 'Peach', emoji: '🍑', category: 'fruits', wholesale: 1.6, defaultPrice: 3.8, demand: 7, weight: 0.3 },
    { id: 'avocado', name: 'Avocado', emoji: '🥑', category: 'fruits', wholesale: 1.8, defaultPrice: 4.0, demand: 8, weight: 0.3 },
    { id: 'lemon', name: 'Lemon', emoji: '🍋', category: 'fruits', wholesale: 0.6, defaultPrice: 1.5, demand: 7, weight: 0.2 },
    { id: 'cherry', name: 'Cherries', emoji: '🍒', category: 'fruits', wholesale: 3.2, defaultPrice: 7.0, demand: 8, weight: 0.4 },
  ],
  vegetables: [
    { id: 'potato', name: 'Potato', emoji: '🥔', category: 'vegetables', wholesale: 0.6, defaultPrice: 1.5, demand: 9, weight: 0.4 },
    { id: 'tomato', name: 'Tomato', emoji: '🍅', category: 'vegetables', wholesale: 0.9, defaultPrice: 2.0, demand: 8, weight: 0.2 },
    { id: 'onion', name: 'Onion', emoji: '🧅', category: 'vegetables', wholesale: 0.7, defaultPrice: 1.6, demand: 8, weight: 0.3 },
    { id: 'carrot', name: 'Carrot', emoji: '🥕', category: 'vegetables', wholesale: 0.8, defaultPrice: 1.8, demand: 7, weight: 0.2 },
    { id: 'cucumber', name: 'Cucumber', emoji: '🥒', category: 'vegetables', wholesale: 0.7, defaultPrice: 1.5, demand: 6, weight: 0.3 },
  ],
  drinks: [
    { id: 'water', name: 'Water', emoji: '💧', category: 'drinks', wholesale: 0.5, defaultPrice: 1.5, demand: 10, weight: 0.5 },
    { id: 'juice', name: 'Juice', emoji: '🧃', category: 'drinks', wholesale: 1.2, defaultPrice: 3.0, demand: 8, weight: 0.5 },
    { id: 'soda', name: 'Soda', emoji: '🥤', category: 'drinks', wholesale: 0.8, defaultPrice: 2.5, demand: 9, weight: 0.4 },
    { id: 'energy', name: 'Energy Drink', emoji: '⚡', category: 'drinks', wholesale: 1.5, defaultPrice: 4.0, demand: 7, weight: 0.3 },
  ],
  snacks: [
    { id: 'chips', name: 'Chips', emoji: '🥨', category: 'snacks', wholesale: 1.0, defaultPrice: 2.8, demand: 9, weight: 0.2 },
    { id: 'cookies', name: 'Cookies', emoji: '🍪', category: 'snacks', wholesale: 1.2, defaultPrice: 3.2, demand: 8, weight: 0.3 },
    { id: 'chocolate', name: 'Chocolate', emoji: '🍫', category: 'snacks', wholesale: 1.5, defaultPrice: 3.5, demand: 9, weight: 0.2 },
  ],
  dairy: [
    { id: 'milk', name: 'Milk', emoji: '🥛', category: 'dairy', wholesale: 1.0, defaultPrice: 2.5, demand: 9, weight: 1.0 },
    { id: 'cheese', name: 'Cheese', emoji: '🧀', category: 'dairy', wholesale: 2.0, defaultPrice: 4.5, demand: 7, weight: 0.3 },
    { id: 'butter', name: 'Butter', emoji: '🧈', category: 'dairy', wholesale: 1.5, defaultPrice: 3.5, demand: 6, weight: 0.25 },
    { id: 'yogurt', name: 'Yogurt', emoji: '🍦', category: 'dairy', wholesale: 1.2, defaultPrice: 2.8, demand: 7, weight: 0.2 },
  ],
  frozen: [
    { id: 'icecream', name: 'Ice Cream', emoji: '🍨', category: 'frozen', wholesale: 2.0, defaultPrice: 4.5, demand: 8, weight: 0.5 },
    { id: 'pizza', name: 'Frozen Pizza', emoji: '🍕', category: 'frozen', wholesale: 3.0, defaultPrice: 6.5, demand: 7, weight: 0.8 },
  ],
  household: [
    { id: 'soap', name: 'Soap', emoji: '🧼', category: 'household', wholesale: 0.8, defaultPrice: 2.5, demand: 8, weight: 0.2 },
    { id: 'detergent', name: 'Detergent', emoji: '🫧', category: 'household', wholesale: 2.0, defaultPrice: 5.0, demand: 7, weight: 1.0 },
    { id: 'shampoo', name: 'Shampoo', emoji: '🧴', category: 'household', wholesale: 2.5, defaultPrice: 6.0, demand: 6, weight: 0.4 },
  ],
  electronics: [
    { id: 'batteries', name: 'Batteries', emoji: '🔋', category: 'electronics', wholesale: 2.0, defaultPrice: 5.0, demand: 6, weight: 0.1 },
    { id: 'charger', name: 'Charger', emoji: '🔌', category: 'electronics', wholesale: 5.0, defaultPrice: 12.0, demand: 5, weight: 0.2 },
    { id: 'earbuds', name: 'Earbuds', emoji: '🎧', category: 'electronics', wholesale: 8.0, defaultPrice: 20.0, demand: 5, weight: 0.1 },
  ],
  cosmetics: [
    { id: 'lipstick', name: 'Lipstick', emoji: '💄', category: 'cosmetics', wholesale: 3.0, defaultPrice: 8.0, demand: 5, weight: 0.05 },
    { id: 'perfume', name: 'Perfume', emoji: '🌸', category: 'cosmetics', wholesale: 5.0, defaultPrice: 15.0, demand: 4, weight: 0.1 },
  ],
  pets: [
    { id: 'petfood', name: 'Pet Food', emoji: '🐾', category: 'pets', wholesale: 3.0, defaultPrice: 7.0, demand: 6, weight: 1.5 },
    { id: 'pettoy', name: 'Pet Toy', emoji: '🦴', category: 'pets', wholesale: 2.0, defaultPrice: 5.0, demand: 4, weight: 0.2 },
  ],
};

const SUPPLIERS = [
  { id: 'freshmart', name: '🌿 FreshMart Wholesale', categories: ['fruits', 'vegetables'], specialty: 'Fresh Produce', discount: 0.05 },
  { id: 'drinkdepot', name: '💧 DrinkDepot Co.', categories: ['drinks'], specialty: 'Beverages', discount: 0.03 },
  { id: 'snackking', name: '🥨 SnackKing Ltd.', categories: ['snacks', 'dairy'], specialty: 'Snacks & Dairy', discount: 0.04 },
  { id: 'globalgoods', name: '🌐 GlobalGoods Inc.', categories: ['household', 'cosmetics', 'electronics', 'pets', 'frozen'], specialty: 'General Goods', discount: 0.02 },
];

const EMPLOYEE_ROLES = [
  { id: 'cashier', name: 'Cashier', emoji: '💳', salary: 80, effect: 'Faster checkout speed', max: 5 },
  { id: 'stocker', name: 'Shelf Stocker', emoji: '📦', salary: 70, effect: 'Auto-restocks shelves', max: 4 },
  { id: 'cleaner', name: 'Cleaner', emoji: '🧹', salary: 60, effect: 'Boosts customer satisfaction', max: 3 },
  { id: 'security', name: 'Security Guard', emoji: '👮', salary: 90, effect: 'Prevents shoplifting', max: 2 },
  { id: 'manager', name: 'Manager', emoji: '👔', salary: 150, effect: 'Boosts overall efficiency', max: 2 },
  { id: 'warehouse', name: 'Warehouse Worker', emoji: '🏭', salary: 75, effect: 'Faster delivery processing', max: 3 },
];

const EXPANSIONS = [
  { id: 'shelf_produce_island', name: 'Produce Display Stand', desc: 'Construct a central rustic wooden fruit display island in the store.', cost: 450, effect: '+shelf', category: 'shelves' },
  { id: 'shelf_cold_cooler', name: 'Cold Beverage Cooler', desc: 'Install an illuminated glass-door refrigerated cooler rack.', cost: 650, effect: '+shelf', category: 'shelves' },
  { id: 'floor_polisher', name: 'Commercial Floor Polisher', desc: 'Gives the supermarket floor high-end mirror polish gloss and raises store rating.', cost: 800, effect: '+rating', category: 'upgrades' },
  { id: 'shopping_carts', name: 'Deluxe Rolling Carts', desc: 'Equips customers with roomy carts; they purchase +50% more items.', cost: 950, effect: '+basket', category: 'upgrades' },
  { id: 'climate_ac', name: 'A/C Climate Control', desc: 'Optimal cooling keeps customers comfortable; patience increased by +40%.', cost: 1200, effect: '+patience', category: 'upgrades' },
  { id: 'store_neon', name: 'Grand Neon Storefront Sign', desc: 'Vibrant outdoor neon sign attracts +35% more foot traffic from the boulevard.', cost: 1500, effect: '+traffic', category: 'upgrades' },
  { id: 'ext1', name: 'Expand Store Area', desc: 'Add 40% more floor space for shelves and products.', cost: 3500, effect: '+shelves', category: 'expansions' },
  { id: 'ext2', name: 'Warehouse Upgrade', desc: 'Build a heavy industrial warehouse with 3x storage capacity.', cost: 5000, effect: '+storage', category: 'expansions' },
  { id: 'ext3', name: 'Second Checkout Lane', desc: 'Serve twice as many customers with Lane 2 Express POS.', cost: 2500, effect: '+checkout', category: 'expansions' },
  { id: 'ext4', name: 'LED Lighting System', desc: 'Overhead architectural LED strip lighting creates high visibility.', cost: 1800, effect: '+customers', category: 'expansions' },
  { id: 'ext5', name: 'Bakery Department', desc: 'Add fresh artisan bakery section with high profit margins.', cost: 4500, effect: '+bakery', category: 'expansions' },
  { id: 'ext6', name: 'Electronics Section', desc: 'High-tech glass showcase with high-value premium goods.', cost: 7500, effect: '+electronics', category: 'expansions' },
];

const MARKETING_CAMPAIGNS = [
  { id: 'local_ads', name: '📺 Local TV Ads', desc: 'Advertise on local television', effect: '+30% customers for 3 days', cost: 500, duration: 3 },
  { id: 'social', name: '📱 Social Media', desc: 'Run social media campaigns', effect: '+15% customers for 7 days', cost: 200, duration: 7 },
  { id: 'flyers', name: '📄 Flyer Campaign', desc: 'Distribute flyers in the city', effect: '+10% customers for 5 days', cost: 100, duration: 5 },
  { id: 'discount', name: '🏷️ Weekend Discount', desc: 'Special weekend sales event', effect: '+50% customers, -10% margins', cost: 0, duration: 2 },
  { id: 'loyalty', name: '💳 Loyalty Program', desc: 'Launch loyalty card program', effect: '+25% returning customers', cost: 350, duration: 30 },
  { id: 'grand', name: '🎉 Grand Reopening', desc: 'Big reopening event with gifts', effect: '+100% customers for 1 day', cost: 1000, duration: 1 },
];

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'First Delivery',
    desc: 'Press F to pick up the fruit crate.',
    icon: '🏪',
    keys: ['F - Pick Up / Interact'],
    objective: 'pickupCrate',
  },
  {
    id: 'walk_outside',
    title: 'Step Outside',
    desc: 'Walk forward to exit through the front door of your shop. The delivery crate is waiting outside.',
    icon: '🚶',
    keys: ['Arrow Keys - Move', 'Mouse - Look'],
    objective: 'exitShop',
  },
  {
    id: 'find_crate',
    title: 'Find the Delivery Crate',
    desc: 'Walk to the fruit crate near the entrance. It was just delivered by our supplier FreshMart!',
    icon: '📦',
    keys: ['Arrow Keys - Move', 'Mouse - Look'],
    objective: 'nearCrate',
  },
  {
    id: 'pickup_crate',
    title: 'Pick Up the Crate',
    desc: 'Walk up to the crate and press F to pick it up. You can carry items using F.',
    icon: '🤲',
    keys: ['F - Pick Up / Interact'],
    objective: 'pickupCrate',
  },
  {
    id: 'carry_inside',
    title: 'Carry It Inside',
    desc: 'Now carry the crate back into the store. Walk through the front door.',
    icon: '🚪',
    keys: ['Arrow Keys - Move while carrying'],
    objective: 'enterShop',
  },
  {
    id: 'find_shelf',
    title: 'Find the Fruit Shelf',
    desc: 'Walk to the fruit shelf section (marked with green). Time to stock the shelves!',
    icon: '🛒',
    keys: ['F - Place fruit crate'],
    objective: 'nearShelf',
  },
  {
    id: 'stock_shelf',
    title: 'Stock the Shelves',
    desc: 'Press E near the fruit shelf to open it and place items manually. Fill up those shelves!',
    icon: '📋',
    keys: ['F - Stock shelf'],
    objective: 'stockShelf',
  },
  {
    id: 'recycle_box',
    title: 'Dispose of Empty Crate',
    desc: 'Pick up the empty crate and throw it into the recycling bin (blue bin near the wall).',
    icon: '♻️',
    keys: ['F - Pick up / recycle'],
    objective: 'recycleCrate',
  },
  {
    id: 'computer',
    title: 'Use the Store Computer',
    desc: 'Head to the office and interact with the computer (press E). This is your business hub!',
    icon: '💻',
    keys: ['F - Use reception computer'],
    objective: 'useComputer',
  },
  {
    id: 'order_products',
    title: 'Order More Products',
    desc: 'In the computer, open Product Ordering → Select FreshMart → Add items → Confirm Order.',
    icon: '🛒',
    keys: ['Click to navigate computer apps'],
    objective: 'placeOrder',
  },
  {
    id: 'set_prices',
    title: 'Set Product Prices',
    desc: 'Open Pricing Management in the computer. Set prices for your stocked products to maximize profit!',
    icon: '🏷️',
    keys: ['Click Pricing app in computer'],
    objective: 'setPrices',
  },
  {
    id: 'open_store',
    title: 'Open Your Store!',
    desc: 'Click the "Open Store" button at the top of your screen to welcome your first customers!',
    icon: '🎉',
    keys: ['Click OPEN STORE button'],
    objective: 'openStore',
  },
  {
    id: 'first_customers',
    title: 'Serve Your First Customers',
    desc: 'Customers are entering! Walk to the checkout desk and press E to serve them. Scan items and collect payment.',
    icon: '👥',
    keys: ['E - Checkout customer'],
    objective: 'firstSale',
  },
];

const CUSTOMER_TYPES = [
  { type: 'budget', name: 'Budget Shopper', emoji: '👜', spend: 0.6, sensitivity: 0.9, patience: 0.7, items: 3 },
  { type: 'family', name: 'Family Shopper', emoji: '👨‍👩‍👧', spend: 1.4, sensitivity: 0.5, patience: 0.8, items: 8 },
  { type: 'premium', name: 'Executive Shopper', emoji: '👔', spend: 2.2, sensitivity: 0.2, patience: 0.9, items: 6 },
  { type: 'impulse', name: 'Impulse Buyer', emoji: '🛍️', spend: 1.1, sensitivity: 0.3, patience: 0.6, items: 5 },
  { type: 'health', name: 'Organic Foodie', emoji: '🥑', spend: 1.8, sensitivity: 0.35, patience: 0.85, items: 7 },
  { type: 'student', name: 'College Student', emoji: '🎒', spend: 0.7, sensitivity: 0.85, patience: 0.75, items: 4 },
  { type: 'chef', name: 'Gourmet Chef', emoji: '👨‍🍳', spend: 2.5, sensitivity: 0.15, patience: 0.95, items: 10 },
];
