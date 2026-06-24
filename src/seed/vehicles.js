require('dotenv').config();

const connectDB = require('../config/db');
const Category = require('../models/Category');
const Vehicle = require('../models/Vehicle');

const vehiclesSeed = [
  {
    name: 'BMW i7 xDrive60',
    brand: 'BMW',
    model: 'i7 xDrive60',
    year: 2024,
    dailyRate: 65000,
    images: [
      'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'Berline électrique premium avec un intérieur luxueux et une autonomie longue distance.',
    isAvailable: true,
    licensePlate: 'AB-102-CD',
    mileage: 1200,
    fuelType: 'electrique',
    transmission: 'automatique',
    salePrice: 26500000,
    isAvailableForSale: true,
    isSold: false,
  },
  {
    name: 'Mercedes-Benz GLE 450',
    brand: 'Mercedes-Benz',
    model: 'GLE 450',
    year: 2023,
    dailyRate: 48000,
    images: [
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'SUV élégant et spacieux, parfait pour les trajets urbains et les escapades.',
    isAvailable: true,
    licensePlate: 'CD-203-EF',
    mileage: 8600,
    fuelType: 'hybride',
    transmission: 'automatique',
    salePrice: 18900000,
    isAvailableForSale: true,
    isSold: false,
  },
  {
    name: 'Porsche 911 Carrera',
    brand: 'Porsche',
    model: '911 Carrera',
    year: 2022,
    dailyRate: 95000,
    images: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'Sportive de prestige, dynamique et ultra soignée pour une expérience unique.',
    isAvailable: true,
    licensePlate: 'GH-304-IJ',
    mileage: 5400,
    fuelType: 'essence',
    transmission: 'automatique',
    salePrice: 32000000,
    isAvailableForSale: true,
    isSold: false,
  },
  {
    name: 'Audi A6 Avant Prestige',
    brand: 'Audi',
    model: 'A6 Avant',
    year: 2024,
    dailyRate: 43000,
    images: [
      'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'Berline premium confortable avec un design moderne et un intérieur raffiné.',
    isAvailable: true,
    licensePlate: 'KL-405-MN',
    mileage: 3100,
    fuelType: 'diesel',
    transmission: 'automatique',
    salePrice: 15500000,
    isAvailableForSale: true,
    isSold: false,
  },
  {
    name: 'Tesla Model Y Performance',
    brand: 'Tesla',
    model: 'Model Y',
    year: 2024,
    dailyRate: 39000,
    images: [
      'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1579820011238-0c3cbf9bfd86?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'SUV électrique à la fois performant, moderne et économique en usage urbain.',
    isAvailable: true,
    licensePlate: 'OP-506-QR',
    mileage: 2100,
    fuelType: 'electrique',
    transmission: 'automatique',
    salePrice: 14500000,
    isAvailableForSale: true,
    isSold: false,
  },
  {
    name: 'Range Rover Evoque',
    brand: 'Land Rover',
    model: 'Range Rover Evoque',
    year: 2023,
    dailyRate: 52000,
    images: [
      'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'SUV compact chic, parfait pour les déplacements premium et les sorties.',
    isAvailable: true,
    licensePlate: 'ST-607-UV',
    mileage: 7100,
    fuelType: 'diesel',
    transmission: 'automatique',
    salePrice: 17200000,
    isAvailableForSale: true,
    isSold: false,
  },
  {
    name: 'Lexus ES 300h',
    brand: 'Lexus',
    model: 'ES 300h',
    year: 2022,
    dailyRate: 36000,
    images: [
      'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'Berline hybride moderne, silencieuse et très confortable pour les longs trajets.',
    isAvailable: true,
    licensePlate: 'WX-708-YZ',
    mileage: 12300,
    fuelType: 'hybride',
    transmission: 'automatique',
    salePrice: 11800000,
    isAvailableForSale: true,
    isSold: false,
  },
  {
    name: 'Volkswagen Tiguan R-Line',
    brand: 'Volkswagen',
    model: 'Tiguan R-Line',
    year: 2024,
    dailyRate: 41000,
    images: [
      'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'SUV compact polyvalent, idéal pour un usage quotidien avec style.',
    isAvailable: true,
    licensePlate: 'AA-809-BC',
    mileage: 4700,
    fuelType: 'essence',
    transmission: 'automatique',
    salePrice: 13500000,
    isAvailableForSale: true,
    isSold: false,
  },
  {
    name: 'Ferrari Roma',
    brand: 'Ferrari',
    model: 'Roma',
    year: 2023,
    dailyRate: 125000,
    images: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'Voiture de sport italienne, élégante et très performante pour un rendu spectaculaire.',
    isAvailable: true,
    licensePlate: 'ZZ-909-AA',
    mileage: 2800,
    fuelType: 'essence',
    transmission: 'automatique',
    salePrice: 48000000,
    isAvailableForSale: true,
    isSold: false,
  },
  {
    name: 'Rolls-Royce Cullinan',
    brand: 'Rolls-Royce',
    model: 'Cullinan',
    year: 2024,
    dailyRate: 180000,
    images: [
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'SUV de luxe ultra raffiné pour un style premium et un confort incomparable.',
    isAvailable: true,
    licensePlate: 'RR-111-XX',
    mileage: 1500,
    fuelType: 'essence',
    transmission: 'automatique',
    salePrice: 72000000,
    isAvailableForSale: true,
    isSold: false,
  },
];

const categoriesSeed = [
  { name: 'SUV' },
  { name: 'Berline' },
  { name: 'Sport' },
  { name: 'Électrique' },
  { name: 'Hybride' },
];

const mapCategory = async () => {
  const createdCategories = [];

  for (const category of categoriesSeed) {
    const existingCategory = await Category.findOne({ name: category.name });
    if (existingCategory) {
      createdCategories.push(existingCategory);
    } else {
      const newCategory = await Category.create(category);
      createdCategories.push(newCategory);
    }
  }

  return createdCategories;
};

const buildVehiclePayloads = (categories) => {
  const categoryByName = Object.fromEntries(categories.map((category) => [category.name, category._id]));

  return vehiclesSeed.map((vehicle) => {
    const categoryName = vehicle.brand === 'Tesla' || vehicle.brand === 'BMW' || vehicle.brand === 'Audi' || vehicle.brand === 'Lexus'
      ? 'Électrique'
      : vehicle.name.includes('Porsche') || vehicle.brand === 'Ferrari'
        ? 'Sport'
        : vehicle.name.includes('Mercedes') || vehicle.name.includes('Range') || vehicle.name.includes('Volkswagen') || vehicle.brand === 'Rolls-Royce'
          ? 'SUV'
          : 'Berline';

    return {
      ...vehicle,
      category: categoryByName[categoryName],
    };
  });
};

const seedVehicles = async () => {
  await connectDB();

  await Vehicle.deleteMany({});
  await Category.deleteMany({});

  const categories = await mapCategory();
  const vehicles = buildVehiclePayloads(categories);
  await Vehicle.insertMany(vehicles);

  console.log(`Seed terminé : ${vehicles.length} véhicules ajoutés.`);
  process.exit(0);
};

seedVehicles().catch((err) => {
  console.error('Erreur lors du seed des véhicules :', err);
  process.exit(1);
});
