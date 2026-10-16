export type Per100g = [sodium: number | null, potassium: number | null, phosphorus: number | null, protein: number | null];

export interface SampleFood {
  ref: string;
  name: string;
  localNames: string[];
  category: string;
  per100g: Per100g;
  portions?: Record<string, number>;
}

export interface SampleRecipe {
  ref: string;
  name: string;
  localNames: string[];
  category: 'dish' | 'condiment';
  ingredients: Record<string, number>;
  portions?: Record<string, number>;
}

export const SAMPLE_FOODS: SampleFood[] = [
  { ref: 'kanin', name: 'Kanin', localNames: ['rice', 'white rice', 'cooked rice', 'steamed rice', 'plain rice'], category: 'grain', per100g: [1, 35, 43, 2.7], portions: { tasa: 160, sandok: 80, mangkok: 200, serving: 160 } },
  { ref: 'sinangag', name: 'Sinangag', localNames: ['garlic rice', 'garlic fried rice', 'fried rice'], category: 'grain', per100g: [250, 40, 45, 3], portions: { tasa: 170, sandok: 85, serving: 170 } },
  { ref: 'brown-rice', name: 'Brown rice', localNames: ['pinawa', 'kanin na pinawa'], category: 'grain', per100g: [5, 79, 83, 2.6], portions: { tasa: 195, sandok: 95, serving: 195 } },
  { ref: 'lugaw', name: 'Lugaw', localNames: ['arroz caldo', 'congee', 'rice porridge', 'goto'], category: 'grain', per100g: [250, 30, 25, 1.5], portions: { mangkok: 300, tasa: 240, serving: 300 } },
  { ref: 'pandesal', name: 'Pandesal', localNames: ['pan de sal', 'bread roll'], category: 'bread', per100g: [450, 110, 95, 8.5], portions: { piraso: 30 } },
  { ref: 'tinapay', name: 'Tinapay', localNames: ['bread', 'white bread', 'loaf bread', 'sliced bread'], category: 'bread', per100g: [480, 115, 100, 9], portions: { hiwa: 25, piraso: 25 } },
  { ref: 'oatmeal', name: 'Oatmeal', localNames: ['oats', 'oatmeal with water'], category: 'grain', per100g: [5, 70, 77, 2.5], portions: { tasa: 234, mangkok: 250, serving: 234 } },
  { ref: 'instant-noodles', name: 'Instant noodles', localNames: ['instant mami', 'cup noodles', 'ramen'], category: 'grain', per100g: [600, 60, 45, 3.5], portions: { pakete: 250, mangkok: 250, serving: 250 } },
  { ref: 'bihon', name: 'Bihon', localNames: ['rice noodles', 'rice vermicelli'], category: 'grain', per100g: [19, 4, 20, 1.8], portions: { tasa: 175, serving: 175 } },
  { ref: 'kamote', name: 'Kamote', localNames: ['sweet potato', 'camote', 'nilagang kamote'], category: 'starch', per100g: [27, 230, 32, 1.4], portions: { piraso: 130, tasa: 200, serving: 130 } },
  { ref: 'mais', name: 'Mais', localNames: ['corn', 'boiled corn', 'nilagang mais'], category: 'starch', per100g: [1, 218, 77, 3.4], portions: { piraso: 90, tasa: 165, serving: 90 } },
  { ref: 'patatas', name: 'Patatas', localNames: ['potato', 'boiled potato'], category: 'starch', per100g: [5, 328, 40, 1.9], portions: { piraso: 150, tasa: 156, serving: 150 } },

  { ref: 'saging', name: 'Saging', localNames: ['banana', 'lakatan', 'latundan'], category: 'fruit', per100g: [1, 358, 22, 1.1], portions: { piraso: 100, serving: 100 } },
  { ref: 'saba', name: 'Saging na saba', localNames: ['saba', 'nilagang saba', 'boiled saba'], category: 'fruit', per100g: [4, 465, 28, 0.8], portions: { piraso: 90, serving: 90 } },
  { ref: 'mansanas', name: 'Mansanas', localNames: ['apple'], category: 'fruit', per100g: [1, 107, 11, 0.3], portions: { piraso: 180, hiwa: 20, serving: 180 } },
  { ref: 'mangga', name: 'Mangga', localNames: ['mango', 'ripe mango', 'hinog na mangga'], category: 'fruit', per100g: [1, 168, 14, 0.8], portions: { piraso: 200, hiwa: 100, serving: 100 } },
  { ref: 'pakwan', name: 'Pakwan', localNames: ['watermelon'], category: 'fruit', per100g: [1, 112, 11, 0.6], portions: { hiwa: 150, tasa: 150, serving: 150 } },
  { ref: 'papaya', name: 'Papaya', localNames: ['ripe papaya'], category: 'fruit', per100g: [8, 182, 10, 0.5], portions: { hiwa: 150, tasa: 145, serving: 150 } },
  { ref: 'dalandan', name: 'Dalandan', localNames: ['orange', 'dalanghita'], category: 'fruit', per100g: [0, 181, 14, 0.9], portions: { piraso: 130, serving: 130 } },
  { ref: 'calamansi', name: 'Calamansi', localNames: ['calamansi juice', 'kalamansi', 'calamondin'], category: 'fruit', per100g: [2, 104, 8, 0.4], portions: { piraso: 10 } },

  { ref: 'itlog-nilaga', name: 'Nilagang itlog', localNames: ['itlog', 'egg', 'boiled egg', 'hard boiled egg'], category: 'egg', per100g: [124, 126, 172, 12.6], portions: { piraso: 50, serving: 50 } },
  { ref: 'itlog-prito', name: 'Pritong itlog', localNames: ['fried egg', 'sunny side up', 'itlog na prito'], category: 'egg', per100g: [207, 152, 197, 13.6], portions: { piraso: 46, serving: 46 } },
  { ref: 'scrambled-egg', name: 'Scrambled egg', localNames: ['itlog na binati', 'binating itlog'], category: 'egg', per100g: [145, 138, 165, 10], portions: { piraso: 61, serving: 61, tasa: 220 } },
  { ref: 'manok', name: 'Manok', localNames: ['chicken', 'chicken meat'], category: 'meat', per100g: [80, 240, 200, 27], portions: { piraso: 100, serving: 100 } },
  { ref: 'inihaw-manok', name: 'Inihaw na manok', localNames: ['grilled chicken', 'chicken inasal', 'inasal'], category: 'meat', per100g: [400, 230, 190, 25], portions: { piraso: 100, serving: 100 } },
  { ref: 'pritong-manok', name: 'Pritong manok', localNames: ['fried chicken'], category: 'meat', per100g: [300, 220, 190, 24], portions: { piraso: 100, serving: 100 } },
  { ref: 'baboy', name: 'Baboy', localNames: ['pork', 'pork meat'], category: 'meat', per100g: [60, 350, 230, 27], portions: { hiwa: 30, serving: 100 } },
  { ref: 'liempo', name: 'Inihaw na liempo', localNames: ['liempo', 'grilled pork belly'], category: 'meat', per100g: [300, 250, 170, 20], portions: { piraso: 100, hiwa: 50, serving: 100 } },
  { ref: 'lechon-kawali', name: 'Lechon kawali', localNames: ['crispy pork belly', 'bagnet'], category: 'meat', per100g: [550, 250, 150, 18], portions: { piraso: 30, serving: 100 } },
  { ref: 'baka', name: 'Baka', localNames: ['beef', 'beef meat'], category: 'meat', per100g: [60, 320, 200, 28], portions: { serving: 100 } },
  { ref: 'tapa', name: 'Tapa', localNames: ['beef tapa', 'tapang baka'], category: 'meat', per100g: [900, 300, 200, 25], portions: { piraso: 20, serving: 80 } },
  { ref: 'longganisa', name: 'Longganisa', localNames: ['longanisa', 'sausage'], category: 'meat', per100g: [1000, 280, 160, 18], portions: { piraso: 40, serving: 80 } },
  { ref: 'tocino', name: 'Tocino', localNames: ['tosino', 'pork tocino'], category: 'meat', per100g: [800, 250, 150, 17], portions: { piraso: 30, hiwa: 30, serving: 80 } },
  { ref: 'hotdog', name: 'Hotdog', localNames: ['hot dog', 'frankfurter'], category: 'meat', per100g: [1000, 160, 150, 11], portions: { piraso: 45, serving: 45 } },
  { ref: 'corned-beef', name: 'Corned beef', localNames: ['canned corned beef'], category: 'meat', per100g: [900, 140, 110, 25], portions: { lata: 150, sandok: 60, serving: 60 } },
  { ref: 'luncheon-meat', name: 'Luncheon meat', localNames: ['spam', 'meat loaf'], category: 'meat', per100g: [1300, 400, 150, 13], portions: { hiwa: 40, serving: 40 } },
  { ref: 'tuyo', name: 'Tuyo', localNames: ['dried herring', 'dried fish'], category: 'fish', per100g: [2500, 500, 600, 50], portions: { piraso: 10, serving: 30 } },
  { ref: 'daing-bangus', name: 'Daing na bangus', localNames: ['marinated milkfish', 'bangus daing'], category: 'fish', per100g: [1000, 350, 250, 25], portions: { piraso: 120, serving: 120 } },
  { ref: 'bangus', name: 'Bangus', localNames: ['milkfish', 'pritong bangus', 'inihaw na bangus'], category: 'fish', per100g: [70, 290, 230, 26], portions: { piraso: 120, serving: 120 } },
  { ref: 'tilapia', name: 'Tilapia', localNames: ['pritong tilapia', 'fried tilapia', 'inihaw na tilapia'], category: 'fish', per100g: [60, 380, 200, 26], portions: { piraso: 120, serving: 120 } },
  { ref: 'galunggong', name: 'Galunggong', localNames: ['round scad', 'pritong galunggong'], category: 'fish', per100g: [100, 350, 250, 24], portions: { piraso: 60, serving: 60 } },
  { ref: 'sardinas', name: 'Sardinas', localNames: ['sardines', 'canned sardines', 'sardines in tomato sauce'], category: 'fish', per100g: [410, 340, 365, 18], portions: { lata: 155, piraso: 40, serving: 80 } },
  { ref: 'tuna-canned', name: 'Tuna in water', localNames: ['canned tuna', 'tuna flakes', 'tuna'], category: 'fish', per100g: [250, 237, 217, 26], portions: { lata: 140, serving: 75 } },
  { ref: 'hipon', name: 'Hipon', localNames: ['shrimp', 'prawns'], category: 'fish', per100g: [110, 170, 210, 24], portions: { piraso: 8, tasa: 145, serving: 80 } },
  { ref: 'tokwa', name: 'Tokwa', localNames: ['tofu', 'firm tofu'], category: 'legume', per100g: [12, 150, 190, 15], portions: { piraso: 85, serving: 85 } },

  { ref: 'pechay', name: 'Pechay', localNames: ['bok choy', 'petsay'], category: 'vegetable', per100g: [34, 371, 29, 1.6], portions: { tasa: 170, serving: 85 } },
  { ref: 'kangkong', name: 'Kangkong', localNames: ['water spinach'], category: 'vegetable', per100g: [113, 284, 40, 2.1], portions: { tasa: 100, serving: 100 } },
  { ref: 'sitaw', name: 'Sitaw', localNames: ['string beans', 'yardlong beans'], category: 'vegetable', per100g: [4, 290, 57, 2.5], portions: { tasa: 105, serving: 105 } },
  { ref: 'ampalaya', name: 'Ampalaya', localNames: ['bitter gourd', 'bitter melon'], category: 'vegetable', per100g: [6, 319, 36, 0.8], portions: { tasa: 125, serving: 125 } },
  { ref: 'talong', name: 'Talong', localNames: ['eggplant'], category: 'vegetable', per100g: [1, 123, 15, 0.8], portions: { piraso: 80, tasa: 100, serving: 100 } },
  { ref: 'kalabasa', name: 'Kalabasa', localNames: ['squash', 'pumpkin'], category: 'vegetable', per100g: [1, 230, 23, 0.7], portions: { tasa: 150, serving: 150 } },
  { ref: 'sayote', name: 'Sayote', localNames: ['chayote'], category: 'vegetable', per100g: [1, 173, 29, 0.6], portions: { tasa: 160, serving: 160 } },
  { ref: 'malunggay', name: 'Malunggay', localNames: ['moringa', 'moringa leaves'], category: 'vegetable', per100g: [9, 337, 112, 9.4], portions: { tasa: 21 } },
  { ref: 'kamatis', name: 'Kamatis', localNames: ['tomato'], category: 'vegetable', per100g: [5, 237, 24, 0.9], portions: { piraso: 120, hiwa: 20, serving: 120 } },
  { ref: 'pipino', name: 'Pipino', localNames: ['cucumber'], category: 'vegetable', per100g: [2, 147, 24, 0.7], portions: { tasa: 120, hiwa: 10, serving: 120 } },
  { ref: 'karot', name: 'Karot', localNames: ['carrot'], category: 'vegetable', per100g: [58, 235, 30, 0.8], portions: { tasa: 156, piraso: 60, serving: 78 } },
  { ref: 'repolyo', name: 'Repolyo', localNames: ['cabbage'], category: 'vegetable', per100g: [8, 196, 15, 1.3], portions: { tasa: 150, serving: 75 } },
  { ref: 'sibuyas', name: 'Sibuyas', localNames: ['onion'], category: 'vegetable', per100g: [4, 146, 29, 1.1], portions: { piraso: 110 } },
  { ref: 'bawang', name: 'Bawang', localNames: ['garlic'], category: 'vegetable', per100g: [17, 401, 153, 6.4], portions: { piraso: 3 } },
  { ref: 'monggo', name: 'Monggo', localNames: ['mung beans', 'boiled mung beans'], category: 'legume', per100g: [2, 266, 99, 7], portions: { tasa: 200, serving: 200 } },

  { ref: 'tubig', name: 'Tubig', localNames: ['water', 'drinking water'], category: 'drink', per100g: [2, 0, 0, 0], portions: { baso: 240, tasa: 240 } },
  { ref: 'kape', name: 'Kape', localNames: ['coffee', 'black coffee', 'brewed coffee'], category: 'drink', per100g: [2, 49, 3, 0.1], portions: { tasa: 240, baso: 240 } },
  { ref: 'kape-3in1', name: '3-in-1 coffee', localNames: ['coffee mix', 'kape 3 in 1', 'instant coffee mix'], category: 'drink', per100g: [40, 80, 40, 0.8], portions: { tasa: 200, baso: 200, pakete: 200 } },
  { ref: 'tsaa', name: 'Tsaa', localNames: ['tea', 'brewed tea'], category: 'drink', per100g: [3, 37, 1, 0], portions: { tasa: 240, baso: 240 } },
  { ref: 'softdrinks', name: 'Softdrinks', localNames: ['soda', 'cola', 'soft drink', 'softdrink'], category: 'drink', per100g: [4, 2, 10, 0], portions: { baso: 240, lata: 330 } },
  { ref: 'orange-juice', name: 'Orange juice', localNames: ['juice', 'fruit juice'], category: 'drink', per100g: [1, 200, 17, 0.7], portions: { baso: 240, tasa: 240 } },
  { ref: 'buko-juice', name: 'Buko juice', localNames: ['coconut water', 'sabaw ng buko'], category: 'drink', per100g: [105, 250, 20, 0.7], portions: { baso: 240, tasa: 240 } },
  { ref: 'gatas', name: 'Gatas', localNames: ['milk', 'fresh milk', 'whole milk'], category: 'drink', per100g: [43, 150, 84, 3.2], portions: { baso: 245, tasa: 245 } },
  { ref: 'milk-tea', name: 'Milk tea', localNames: ['bubble tea', 'pearl milk tea', 'boba'], category: 'drink', per100g: [40, 120, 60, 1], portions: { baso: 400, serving: 400 } },

  { ref: 'toyo', name: 'Toyo', localNames: ['soy sauce'], category: 'condiment', per100g: [5500, 220, 125, 8] },
  { ref: 'patis', name: 'Patis', localNames: ['fish sauce'], category: 'condiment', per100g: [7850, 290, 7, 5] },
  { ref: 'bagoong', name: 'Bagoong alamang', localNames: ['bagoong', 'shrimp paste'], category: 'condiment', per100g: [5000, 500, 300, 15] },
  { ref: 'suka', name: 'Suka', localNames: ['vinegar', 'cane vinegar', 'sukang iloko'], category: 'condiment', per100g: [2, 2, 4, 0] },
  { ref: 'asin', name: 'Asin', localNames: ['salt', 'table salt', 'iodized salt'], category: 'condiment', per100g: [38758, 8, 0, 0] },
  { ref: 'ketchup', name: 'Ketchup', localNames: ['tomato ketchup', 'catsup'], category: 'condiment', per100g: [907, 281, 26, 1] },
  { ref: 'banana-ketchup', name: 'Banana ketchup', localNames: ['banana catsup'], category: 'condiment', per100g: [1000, 120, 15, 0.3] },
  { ref: 'sarsa', name: 'Sarsa', localNames: ['lechon sauce', 'liver sauce', 'sarsa ng lechon'], category: 'condiment', per100g: [1100, 150, 50, 1.5] },
  { ref: 'mayonnaise', name: 'Mayonnaise', localNames: ['mayo'], category: 'condiment', per100g: [635, 20, 28, 1] },
  { ref: 'chili-sauce', name: 'Chili sauce', localNames: ['sili', 'hot sauce'], category: 'condiment', per100g: [1800, 140, 25, 0.9] },
  { ref: 'oyster-sauce', name: 'Oyster sauce', localNames: [], category: 'condiment', per100g: [2733, 54, 22, 1.4] },
  { ref: 'mantika', name: 'Mantika', localNames: ['cooking oil', 'vegetable oil'], category: 'fat', per100g: [0, 0, 0, 0], portions: { tbsp: 14 } },

  { ref: 'banana-cue', name: 'Banana cue', localNames: ['bananacue', 'banana q'], category: 'snack', per100g: [3, 400, 25, 1], portions: { piraso: 100, serving: 100 } },
  { ref: 'turon', name: 'Turon', localNames: ['banana turon'], category: 'snack', per100g: [60, 300, 30, 2], portions: { piraso: 80, serving: 80 } },
  { ref: 'crackers', name: 'Crackers', localNames: ['saltine crackers', 'biskwit'], category: 'snack', per100g: [1000, 130, 100, 9], portions: { pakete: 25, piraso: 3, serving: 25 } },
  { ref: 'french-fries', name: 'French fries', localNames: ['fries', 'potato fries'], category: 'snack', per100g: [210, 580, 130, 3.4], portions: { serving: 117 } },
  { ref: 'cheeseburger', name: 'Cheeseburger', localNames: ['burger', 'hamburger'], category: 'dish', per100g: [650, 230, 200, 15], portions: { piraso: 120, serving: 120 } },
  { ref: 'spaghetti', name: 'Spaghetti, Filipino-style', localNames: ['spaghetti', 'sweet spaghetti'], category: 'dish', per100g: [500, 250, 90, 6], portions: { serving: 250, tasa: 220 } },
  { ref: 'pizza', name: 'Pizza', localNames: ['cheese pizza'], category: 'dish', per100g: [600, 170, 220, 11], portions: { hiwa: 107, serving: 107 } },
];

export const SAMPLE_RECIPES: SampleRecipe[] = [
  {
    ref: 'adobong-manok', name: 'Adobong manok', localNames: ['adobo', 'chicken adobo'], category: 'dish',
    ingredients: { manok: 55, toyo: 7, suka: 6, bawang: 2, mantika: 3, tubig: 27 },
    portions: { piraso: 90, sandok: 75, tasa: 200, serving: 150 },
  },
  {
    ref: 'adobong-baboy', name: 'Adobong baboy', localNames: ['pork adobo'], category: 'dish',
    ingredients: { baboy: 55, toyo: 7, suka: 6, bawang: 2, mantika: 3, tubig: 27 },
    portions: { sandok: 75, tasa: 200, serving: 150 },
  },
  {
    ref: 'sinigang-baboy', name: 'Sinigang na baboy', localNames: ['sinigang', 'pork sinigang'], category: 'dish',
    ingredients: { baboy: 20, kangkong: 8, sitaw: 6, talong: 6, kamatis: 5, sibuyas: 3, patis: 1.5, tubig: 50.5 },
    portions: { mangkok: 350, tasa: 240, sandok: 120, serving: 350 },
  },
  {
    ref: 'pinakbet', name: 'Pinakbet', localNames: ['pakbet'], category: 'dish',
    ingredients: { kalabasa: 20, sitaw: 15, ampalaya: 15, talong: 15, kamatis: 10, bagoong: 3, baboy: 10, sibuyas: 5, mantika: 2, tubig: 5 },
    portions: { tasa: 200, sandok: 100, serving: 200 },
  },
  {
    ref: 'tinola', name: 'Tinolang manok', localNames: ['tinola', 'chicken tinola'], category: 'dish',
    ingredients: { manok: 30, sayote: 20, malunggay: 3, patis: 1.5, sibuyas: 3, tubig: 42.5 },
    portions: { mangkok: 350, tasa: 240, sandok: 120, serving: 350 },
  },
  {
    ref: 'nilagang-baka', name: 'Nilagang baka', localNames: ['nilaga', 'beef nilaga'], category: 'dish',
    ingredients: { baka: 25, repolyo: 10, patatas: 10, pechay: 8, patis: 1, sibuyas: 3, tubig: 43 },
    portions: { mangkok: 350, tasa: 240, sandok: 120, serving: 350 },
  },
  {
    ref: 'ginisang-monggo', name: 'Ginisang monggo', localNames: ['monggo guisado', 'mung bean stew'], category: 'dish',
    ingredients: { monggo: 60, kamatis: 5, bawang: 1, sibuyas: 3, malunggay: 2, mantika: 2, asin: 0.4, baboy: 5, tubig: 21.6 },
    portions: { tasa: 220, mangkok: 250, sandok: 110, serving: 220 },
  },
  {
    ref: 'pancit-bihon', name: 'Pancit bihon', localNames: ['pancit', 'bihon guisado'], category: 'dish',
    ingredients: { bihon: 50, manok: 15, repolyo: 15, karot: 8, toyo: 3, mantika: 3, sibuyas: 3, bawang: 1, tubig: 2 },
    portions: { tasa: 150, serving: 200 },
  },
  {
    ref: 'tortang-talong', name: 'Tortang talong', localNames: ['eggplant omelette'], category: 'dish',
    ingredients: { talong: 60, 'itlog-nilaga': 35, mantika: 4.6, asin: 0.4 },
    portions: { piraso: 120, serving: 120 },
  },
  {
    ref: 'toyo-mansi', name: 'Toyo-mansi', localNames: ['toyomansi', 'soy sauce with calamansi'], category: 'condiment',
    ingredients: { toyo: 60, calamansi: 40 },
  },
];
