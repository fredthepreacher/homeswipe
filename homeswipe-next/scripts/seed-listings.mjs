/**
 * Seeds demo Manhattan listings so the swipe feed has content.
 *
 * Idempotent: every row it creates is owned by SEED_BROKER_ID, and the script
 * clears those rows (and anything referencing them) before re-inserting, so it
 * can be run repeatedly without piling up duplicates.
 *
 * Run: npm run db:seed
 */
import { Client } from "pg";

const SEED_BROKER_ID = "seed_broker_demo";

const LISTINGS = [
  { price: 1250000, address: "310 W 52nd St, Apt 14B", bedrooms: 2, bathrooms: 2,   sqft: 1100, propertyType: "Condo",     subtype: "High-Rise",  description: "Sun-drenched corner unit in Hell's Kitchen with floor-to-ceiling windows, chef's kitchen, and skyline views from every room.", imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80" },
  { price: 895000,  address: "45 E 9th St, Apt 3C",    bedrooms: 1, bathrooms: 1,   sqft: 720,  propertyType: "Condo",     subtype: "Pre-War",    description: "Classic Greenwich Village pre-war with original moldings, hardwood floors, and a quiet garden outlook.", imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&q=80" },
  { price: 2400000, address: "1 Morton Sq, Apt 8W",    bedrooms: 3, bathrooms: 2.5, sqft: 1850, propertyType: "Condo",     subtype: "Loft",       description: "Expansive West Village loft with 12-ft ceilings, private terrace, and full-service doorman building.", imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=80" },
  { price: 3100,    address: "500 W 43rd St, Apt 22K", bedrooms: 1, bathrooms: 1,   sqft: 650,  propertyType: "Apartment", subtype: "Rental",     description: "Modern rental with in-unit laundry, rooftop pool, and gym. Steps from the A/C/E at 42nd St.", imageUrl: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&q=80" },
  { price: 4250,    address: "205 E 85th St, Apt 6F",  bedrooms: 2, bathrooms: 1,   sqft: 880,  propertyType: "Apartment", subtype: "Rental",     description: "Bright Upper East Side two-bedroom with renovated kitchen, generous closets, and elevator building.", imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=80" },
  { price: 1875000, address: "88 Greenwich St, Apt 31A", bedrooms: 2, bathrooms: 2, sqft: 1240, propertyType: "Condo",     subtype: "High-Rise",  description: "FiDi tower residence with Hudson River views, marble baths, and 24-hour concierge.", imageUrl: "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=900&q=80" },
  { price: 5600,    address: "150 Sullivan St, Apt 2R", bedrooms: 2, bathrooms: 2,  sqft: 1050, propertyType: "Apartment", subtype: "Rental",     description: "SoHo walk-up with exposed brick, skylight, and a private roof cabana. Pet friendly.", imageUrl: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900&q=80" },
  { price: 4750000, address: "12 E 88th St, Townhouse", bedrooms: 5, bathrooms: 4.5, sqft: 4200, propertyType: "Townhouse", subtype: "Historic",  description: "Rare Carnegie Hill townhouse steps from Central Park. Five floors, elevator, landscaped garden.", imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80" },
  { price: 2950,    address: "620 W 153rd St, Apt 4A", bedrooms: 1, bathrooms: 1,   sqft: 700,  propertyType: "Apartment", subtype: "Rental",     description: "Hamilton Heights charmer with high ceilings, tons of natural light, and easy 1-train access.", imageUrl: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=900&q=80" },
  { price: 1495000, address: "225 Rector Pl, Apt 11H", bedrooms: 2, bathrooms: 2,   sqft: 1150, propertyType: "Condo",     subtype: "Waterfront", description: "Battery Park City home overlooking the marina, with pool, gym, and playground on site.", imageUrl: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=900&q=80" },
];

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DIRECT_URL or DATABASE_URL must be set.");
  process.exit(1);
}

const client = new Client({ connectionString: url });

try {
  await client.connect();

  await client.query(
    `insert into users (id, role, name, email)
     values ($1, 'broker', 'Demo Brokerage', 'demo-broker@homeswipe.local')
     on conflict (id) do nothing`,
    [SEED_BROKER_ID]
  );

  // Clear prior seed rows plus anything referencing them, so FKs stay valid.
  await client.query(
    `delete from messages where conversation_id in (
       select c.id from conversations c
       join listings l on l.id = c.listing_id
       where l.owner_id = $1)`,
    [SEED_BROKER_ID]
  );
  await client.query(
    `delete from conversations where listing_id in (select id from listings where owner_id = $1)`,
    [SEED_BROKER_ID]
  );
  await client.query(
    `delete from inquiries where listing_id in (select id from listings where owner_id = $1)`,
    [SEED_BROKER_ID]
  );
  await client.query(
    `delete from swipes where listing_id in (select id from listings where owner_id = $1)`,
    [SEED_BROKER_ID]
  );
  await client.query(`delete from listings where owner_id = $1`, [SEED_BROKER_ID]);

  for (const l of LISTINGS) {
    await client.query(
      `insert into listings
         (owner_id, price, address, city, state, bedrooms, bathrooms, sqft, image_url, property_type, subtype, description)
       values ($1,$2,$3,'Manhattan','NY',$4,$5,$6,$7,$8,$9,$10)`,
      [
        SEED_BROKER_ID,
        l.price,
        l.address,
        l.bedrooms,
        l.bathrooms,
        l.sqft,
        l.imageUrl,
        l.propertyType,
        l.subtype,
        l.description,
      ]
    );
  }

  const { rows } = await client.query(
    `select count(*)::int n from listings where owner_id = $1`,
    [SEED_BROKER_ID]
  );
  console.log(`Seeded ${rows[0].n} Manhattan listings (owner: ${SEED_BROKER_ID}).`);
} catch (err) {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
