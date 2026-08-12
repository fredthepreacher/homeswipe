import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { listingsTable, swipesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetListingsResponse,
  GetSavedListingsResponse,
  SwipeListingBody,
  SwipeListingResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/listings", async (req, res) => {
  try {
    // Scoped to Manhattan, NY for launch
    const listings = await db
      .select()
      .from(listingsTable)
      .where(eq(listingsTable.city, "Manhattan"))
      .orderBy(listingsTable.id);

    const allSwipes = await db.select().from(swipesTable);
    const savedIds = new Set(
      allSwipes
        .filter((s) => s.direction === "right")
        .map((s) => s.listingId)
    );

    const result = listings.map((l) => ({
      id: l.id,
      price: Number(l.price),
      address: l.address,
      city: l.city,
      state: l.state,
      bedrooms: l.bedrooms,
      bathrooms: Number(l.bathrooms),
      sqft: l.sqft,
      imageUrl: l.imageUrl,
      propertyType: l.propertyType,
      subtype: l.subtype ?? null,
      description: l.description,
      saved: savedIds.has(l.id),
    }));

    const parsed = GetListingsResponse.parse(result);
    return res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch listings");
    return res.status(500).json({ error: "Failed to fetch listings" });
  }
});

router.post("/listings/:id/swipe", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = SwipeListingBody.parse(req.body);

    await db.insert(swipesTable).values({
      listingId: id,
      direction: body.direction,
    });

    const saved = body.direction === "right";
    const parsed = SwipeListingResponse.parse({ success: true, saved });
    return res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Failed to record swipe");
    return res.status(500).json({ error: "Failed to record swipe" });
  }
});

router.get("/saved", async (req, res) => {
  try {
    const savedSwipes = await db
      .select()
      .from(swipesTable)
      .where(eq(swipesTable.direction, "right"));

    const savedIds = [...new Set(savedSwipes.map((s) => s.listingId))];

    if (savedIds.length === 0) {
      return res.json([]);
    }

    const listings = await db.select().from(listingsTable);
    const savedListings = listings.filter((l) => savedIds.includes(l.id));

    const result = savedListings.map((l) => ({
      id: l.id,
      price: Number(l.price),
      address: l.address,
      city: l.city,
      state: l.state,
      bedrooms: l.bedrooms,
      bathrooms: Number(l.bathrooms),
      sqft: l.sqft,
      imageUrl: l.imageUrl,
      propertyType: l.propertyType,
      subtype: l.subtype ?? null,
      description: l.description,
      saved: true,
    }));

    const parsed = GetSavedListingsResponse.parse(result);
    return res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch saved listings");
    return res.status(500).json({ error: "Failed to fetch saved listings" });
  }
});

export default router;
