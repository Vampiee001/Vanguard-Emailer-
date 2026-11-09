import { RealEstateProject } from '../types';

export const INITIAL_PROJECTS: RealEstateProject[] = [
  {
    id: 'proj_offplan_aurora',
    title: 'The Aurora Sky Residences',
    type: 'off-plan',
    category: 'tower',
    developer: 'Omniyat Prestige & Foster + Partners',
    location: 'Dubai Water Canal & Business Bay',
    city: 'Dubai, UAE',
    price: 4950000,
    priceFormatted: 'AED 4,950,000',
    currency: 'AED',
    beds: '2 - 4 Bedroom Sky Suites',
    baths: 3,
    areaSqFt: 2150,
    handoverOrStatus: 'Q4 2028 Scheduled Handover',
    paymentPlan: '60/40 Plan (10% Booking · 50% During Construction · 40% On Handover)',
    projectedRoi: '9.4% Projected Net Yield',
    capitalGrowth: '+35% Capital Appreciation by Handover',
    description: 'An iconic 72-storey sculptural tower with cantilevered infinity pools, cascading private sky gardens, and uninhibited 360-degree canal and Burj Khalifa skyline vistas. 10-year UAE Golden Visa eligible with 0% property tax.',
    highlights: [
      '10-Year UAE Golden Visa eligible (threshold AED 2,000,000)',
      'Flexible 60/40 developer milestone schedule with 10% booking',
      'Private elevator foyer for all residence wings and Burj Khalifa views',
      'Estimated net rental yield of 9.4% in high-demand Dubai Canal corridor'
    ],
    amenities: [
      'Cantilevered Sky Pool & Sun Deck',
      'Private Yacht Berth on Dubai Canal',
      'Bespoke Concierge & Valet Services',
      'Technogym Wellness Spa & Steam Suites',
      'Michelin-Star In-Residence Private Dining'
    ],
    imageUrl: '/src/assets/images/project_offplan_tower_1792245021106.jpg',
    isFeatured: true
  },
  {
    id: 'proj_offplan_solaria',
    title: 'Palm Jumeirah Beachfront Signature Villa',
    type: 'off-plan',
    category: 'villa',
    developer: 'Vanguard Architectural Atelier & SAOTA',
    location: 'Frond G Billionaires Row, Palm Jumeirah',
    city: 'Dubai, UAE',
    price: 38500000,
    priceFormatted: 'AED 38,500,000',
    currency: 'AED',
    beds: '5 En-Suite Master Bedrooms + Maid & Driver',
    baths: 7,
    areaSqFt: 8200,
    handoverOrStatus: 'Q3 2027 Handover',
    paymentPlan: '50/50 Milestones (20% Booking · 30% Structural Top-out · 50% Handover)',
    projectedRoi: '11.2% Luxury Seasonal Yield',
    capitalGrowth: '+28% Anticipated Market Upside',
    description: 'An ultra-prime pre-construction architectural masterpiece directly on the private sands of Palm Jumeirah. Features a 25-meter zero-edge swimming pool overlooking the Arabian Gulf, private yacht slip, floor-to-ceiling glass, and custom marble finishes.',
    highlights: [
      'Prime beachfront plot with 120ft private Arabian Gulf frontage',
      'Direct private access to secluded calm water & private boat mooring',
      'Bespoke Italian Poliform kitchen & Gaggenau appliances included',
      'Substantial pre-construction launch allocation for private advisory clients'
    ],
    amenities: [
      'Private 25m Zero-Edge Beachfront Pool',
      'Subterranean Wine Cellar (1,200 bottles)',
      'Private Home Cinema with Dolby Atmos',
      'Smart Home Solar Energy Storage',
      'Private 4-Car Air-Conditioned Showroom'
    ],
    imageUrl: '/src/assets/images/project_offplan_villa_1792245021859.jpg',
    isFeatured: true
  },
  {
    id: 'proj_sec_penthouse',
    title: 'The Royal Penthouse at DIFC Gate',
    type: 'secondary',
    category: 'penthouse',
    developer: 'Resale · Private Ultra-HNW Owner',
    location: 'DIFC Financial Center & Downtown Corridor',
    city: 'Dubai, UAE',
    price: 28000000,
    priceFormatted: 'AED 28,000,000',
    currency: 'AED',
    beds: '4 Bedrooms + Staff Quarters',
    baths: 6,
    areaSqFt: 6400,
    handoverOrStatus: 'Ready / Vacant on Transfer',
    paymentPlan: 'Cash or Pre-approved UAE Mortgage (Immediate Title Deed Transfer)',
    rentalYield: '7.8% In-Place Executive Rental Yield (AED 2.18M/yr)',
    capitalGrowth: 'Trophy Asset · Finite Downtown Skyline Supply',
    description: 'A turnkey secondary market trophy residence. Soaring 24-foot double-height ceilings, floor-to-ceiling acoustic glass wrapping three exposures, custom Minotti and B&B Italia furnishings included, and direct views of the Museum of the Future & Burj Khalifa.',
    highlights: [
      'Ready to move in immediately or lease out at AED 180,000/month',
      'Turnkey luxury: curated Minotti and B&B Italia furnishings included',
      'Clear title deed registered with Dubai Land Department (DLD)',
      'Motivated seller relocating internationally; priced 8% below recent appraisal'
    ],
    amenities: [
      '24/7 White-Glove Doorman & Valet',
      'Private Keyed Elevator Directly to Living Room',
      'Custom Temperature-Controlled Cigar & Wine Room',
      'Integrated Crestron & Lutron Automation',
      'Three Reserved Covered Basement Parking Bays'
    ],
    imageUrl: '/src/assets/images/project_secondary_penthouse_1792245022082.jpg',
    isFeatured: true
  },
  {
    id: 'proj_sec_townhouse',
    title: 'Emirates Hills Golf Course Villa',
    type: 'secondary',
    category: 'villa',
    developer: 'Resale · Fully Renovated Freehold',
    location: 'Sector V, Emirates Hills',
    city: 'Dubai, UAE',
    price: 18500000,
    priceFormatted: 'AED 18,500,000',
    currency: 'AED',
    beds: '5 Bedrooms, 3 Reception Salons',
    baths: 6,
    areaSqFt: 7850,
    handoverOrStatus: 'Ready / Vacant on Transfer',
    paymentPlan: 'Freehold Sale (Immediate DLD Transfer Upon Settlement)',
    rentalYield: '7.2% Current Annual Rental Yield',
    capitalGrowth: 'Prime Freehold Community with High Scarcity Premium',
    description: 'A newly renovated Mediterranean villa situated directly on the championship Montgomerie Golf Course. Features private mature landscaped gardens, large private heated swimming pool, outdoor barbecue pavilion, and double-height entrance rotunda.',
    highlights: [
      'Unobstructed frontline golf course and Dubai Marina skyline views',
      'Fully upgraded in 2025 with German Schuco glazing and Italian marble',
      'Private 15,000 sq ft plot with manicured gardens and heated pool',
      'Vacant on transfer with instant tenancy demand from corporate CEOs'
    ],
    amenities: [
      'Private Heated Swimming Pool & Jacuzzi',
      'Outdoor Shaded Dining & BBQ Pavilion',
      'Custom Poggenpohl Chef Kitchen',
      'Staff Accommodations (Maid & Driver En-Suite)',
      'Gated Community with 24/7 Roving Security'
    ],
    imageUrl: '/src/assets/images/project_secondary_townhouse_1792245022882.jpg',
    isFeatured: false
  },
  {
    id: 'proj_offplan_oasis',
    title: 'Creek Waters Horizon Residences',
    type: 'off-plan',
    category: 'residence',
    developer: 'Emaar Properties PJSC',
    location: 'Creek Island, Dubai Creek Harbour',
    city: 'Dubai, UAE',
    price: 2850000,
    priceFormatted: 'AED 2,850,000',
    currency: 'AED',
    beds: '2 Bedroom Luxury Waterfront Apartment',
    baths: 2,
    areaSqFt: 1350,
    handoverOrStatus: 'Q2 2028 Handover',
    paymentPlan: '70/30 Plan (10% Booking · 60% Construction Linked · 30% Handover)',
    projectedRoi: '9.8% Projected Net ROI',
    capitalGrowth: '+40% Area Infrastructure Value Lift',
    description: 'A premier waterfront investment by Emaar along Dubai Creek Harbour. Offers expansive views of the historic creek, downtown skyline, and Ras Al Khor Flamingo Sanctuary. 10% down payment secures locked developer tier-1 pricing.',
    highlights: [
      'Accessible entry point under AED 3,000,000 with 10-Year Golden Visa qualification',
      'Developed by master builder Emaar with proven handover track record',
      'Short-term holiday home licensed operator options for 10%+ net yield',
      '10% booking secures locked pre-construction tier-1 pricing'
    ],
    amenities: [
      'Infinity Pool Overlooking Creek Promenade & Marina',
      'Co-Working Executive Pods & Resident Business Lounge',
      'Padel Tennis Courts & State-of-the-art Gym',
      'Direct Access to 500m Creek Beach & Marina Boardwalk',
      'Children Adventure Water Play Park'
    ],
    imageUrl: '/src/assets/images/hero_realestate_banner_1792245020982.jpg',
    isFeatured: false
  }
];
