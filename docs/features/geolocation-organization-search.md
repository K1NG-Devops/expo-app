# Geolocation-Based Organization Search

**Date**: 2025-10-29  
**Status**: Proposed  
**Priority**: High (Improves UX significantly)

## Problem Statement

Parents currently see **all** public organizations in alphabetical order, regardless of location. This makes it hard to find nearby organizations, especially in areas with many options.

## Proposed Solution: Hybrid Search with Optional Geolocation

### User Flow Options

#### Option A: Parent with Invitation Code (Fastest)
```
1. Parent receives invitation link/code
2. Click link → Auto-fills organization
3. Complete registration (no search needed)
```

#### Option B: Parent Searching by Location (Recommended)
```
1. Parent enters their address/postal code/suburb
2. System geocodes address
3. Shows organizations sorted by distance (closest first)
4. Parent selects from nearby options
```

#### Option C: Parent Browsing All (Fallback)
```
1. Parent skips address input
2. Shows all organizations alphabetically
3. Can search by name/type
4. Parent selects any organization
```

## Technical Implementation

### Phase 1: Add Address Field (Quick Win)

**Update Parent Signup Form**:
```typescript
// Add before organization selector
<div>
  <label>Your Address (Optional)</label>
  <input 
    type="text"
    placeholder="e.g., Sandton, Johannesburg or 2196"
    value={userAddress}
    onChange={(e) => setUserAddress(e.target.value)}
  />
  <p style={{ fontSize: 12, color: "#9CA3AF" }}>
    Help us find organizations near you
  </p>
</div>
```

### Phase 2: Geocoding & Distance Calculation

**Two Approaches**:

#### Approach A: Client-Side (Google Maps API)
```typescript
// Pros: Fast, real-time
// Cons: Requires API key, client-side exposure

import { Loader } from '@googlemaps/js-api-loader';

async function geocodeAddress(address: string) {
  const loader = new Loader({
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    version: 'weekly',
  });
  
  const google = await loader.load();
  const geocoder = new google.maps.Geocoder();
  
  const result = await geocoder.geocode({ address });
  if (result.results[0]) {
    return {
      lat: result.results[0].geometry.location.lat(),
      lng: result.results[0].geometry.location.lng(),
    };
  }
  throw new Error('Address not found');
}

// Calculate distance using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}
```

#### Approach B: Server-Side (PostGIS + Supabase)
```sql
-- Add geometry columns to organizations table
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Create spatial index
CREATE INDEX IF NOT EXISTS idx_organizations_location 
  ON organizations USING gist (ll_to_earth(latitude, longitude));

-- Function to get organizations by distance
CREATE OR REPLACE FUNCTION get_nearby_organizations(
  user_lat DECIMAL,
  user_lng DECIMAL,
  max_distance_km INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  type TEXT,
  description TEXT,
  address TEXT,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.type::TEXT,
    o.description,
    o.address_line1 || ', ' || o.city AS address,
    earth_distance(
      ll_to_earth(o.latitude, o.longitude),
      ll_to_earth(user_lat, user_lng)
    ) / 1000 AS distance_km
  FROM organizations o
  WHERE 
    o.is_public = TRUE
    AND o.accepting_registrations = TRUE
    AND o.is_active = TRUE
    AND o.latitude IS NOT NULL
    AND o.longitude IS NOT NULL
    AND earth_distance(
      ll_to_earth(o.latitude, o.longitude),
      ll_to_earth(user_lat, user_lng)
    ) <= (max_distance_km * 1000)
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Phase 3: Enhanced UI

**Organization Card with Distance**:
```typescript
<div>
  <div>
    {organization.name}
    <span>({formatOrgType(organization.type)})</span>
  </div>
  <div>{organization.address}</div>
  {organization.distance && (
    <div style={{ color: "#00f5ff", fontSize: 11 }}>
      📍 {organization.distance.toFixed(1)} km away
    </div>
  )}
</div>
```

## South African Context

### Popular Geocoding Options

1. **Google Maps Geocoding API** (Most Accurate)
   - Cost: $5 per 1,000 requests (after free tier)
   - Accuracy: Excellent for SA addresses
   - Supports postal codes, suburbs, street addresses

2. **OpenCage Geocoding** (Open Source Friendly)
   - Cost: Free up to 2,500/day
   - Good SA coverage
   - API: https://opencagedata.com/

3. **Mapbox Geocoding** (Developer Friendly)
   - Cost: Free up to 100,000/month
   - Good SA coverage
   - API: https://docs.mapbox.com/api/search/geocoding/

### South African Address Formats

```
Format 1: Full Address
123 Main Road, Sandton, Johannesburg, 2196

Format 2: Suburb + City
Sandton, Johannesburg

Format 3: Postal Code
2196

Format 4: Province
Gauteng
```

## Recommended Implementation: **3-Tiered Approach**

### Tier 1: Invitation Code (No Search)
- Parent has invitation → Skip search entirely
- Directly link to organization
- **Fastest path**

### Tier 2: Address-Based Search (Best UX)
- Parent enters address/suburb/postal code
- Geocode address (Google Maps API)
- Show organizations sorted by distance
- Display distance on each card
- **Recommended for most users**

### Tier 3: Browse All (Fallback)
- "Skip" or "See all organizations" button
- Show all organizations alphabetically
- Search by name still works
- **For users without specific location preference**

## Database Changes Required

```sql
-- Add geolocation columns
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS geocoded_address TEXT,
  ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;

-- Geocode existing organizations (one-time task)
-- Use Google Maps Geocoding API or manual entry

-- Example for Young Eagles
UPDATE organizations
SET 
  latitude = -26.1076,
  longitude = 28.0567,
  geocoded_address = 'Sandton, Johannesburg',
  geocoded_at = NOW()
WHERE name = 'Young Eagles';
```

## Updated Component Structure

```
ParentSignUpPage
├── AddressInput (optional)
│   ├── Text input
│   └── "Skip" button
├── OrganizationSelector
│   ├── Search input (name/type)
│   ├── Organization list
│   │   ├── Organization card
│   │   │   ├── Name + Type badge
│   │   │   ├── Address
│   │   │   └── Distance (if geocoded)
```

## Cost Estimate (Google Maps API)

**Monthly Estimates**:
- 1,000 parent signups/month × 1 geocode request each = 1,000 requests
- Cost: $5/month (within free tier of $200/month)

**Yearly Estimate**: $60/year (minimal cost)

## Invitation Code System

**Invitation Link Format**:
```
https://edudashpro.org.za/sign-up/parent?invite=ABC123XYZ
```

**Backend**:
```typescript
// Auto-populate organization from invitation
const inviteCode = searchParams.get('invite');
if (inviteCode) {
  const { data: invitation } = await supabase
    .from('invitations')
    .select('organization_id, organizations(id, name, type)')
    .eq('code', inviteCode)
    .eq('status', 'pending')
    .single();
  
  if (invitation) {
    setSelectedOrganization(invitation.organizations);
    setHasInvitation(true); // Hide organization selector
  }
}
```

## Next Steps

### Immediate (This Week)
1. ✅ Fix "No organizations found" issue (DONE)
2. ⬜ Add optional address input field
3. ⬜ Implement client-side geocoding (Google Maps API)
4. ⬜ Sort organizations by distance if address provided

### Short-term (Next 2 Weeks)
1. ⬜ Add invitation code system
2. ⬜ Geocode existing organizations (add lat/lng)
3. ⬜ Display distance on organization cards

### Medium-term (Next Month)
1. ⬜ Implement PostGIS distance queries
2. ⬜ Add "Browse all" fallback option
3. ⬜ Add radius filter (5km, 10km, 20km, 50km)
4. ⬜ Save user's address for future reference

## User Testing Questions

Before implementing, ask parents:
1. Would you prefer to enter your address to see nearby organizations?
2. How important is seeing distance on organization cards?
3. Would you use an invitation code if provided by the organization?
4. What search radius feels right? (5km, 10km, 20km, 50km, any)

## Success Metrics

- **Conversion Rate**: % of parents who complete signup after finding organization
- **Search Abandonment**: % of parents who leave without selecting organization
- **Distance Correlation**: Average distance of selected organization
- **Invitation Usage**: % of signups via invitation vs manual search

## References

- Google Maps Geocoding API: https://developers.google.com/maps/documentation/geocoding
- PostGIS earthdistance: https://www.postgresql.org/docs/current/earthdistance.html
- Haversine Formula: https://en.wikipedia.org/wiki/Haversine_formula
