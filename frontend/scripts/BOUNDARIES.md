# Boundary shapefiles (local only)

GitHub rejects `.shp` / `.zip` files over 100MB. **Do not commit** this folder.

The dashboard uses pre-built GeoJSON in `frontend/src/data/`:

- `pk_provinces.json`
- `pk_districts.json`
- `pk_tehsils.json`
- `pk_national.json`

## Regenerate GeoJSON (optional)

1. Place Pakistan admin shapefiles here:

   `frontend/src/Pakistan-Administrative-Boundaries/Pakistan, Tehsil and District Boundaries/`

   (District_Boundary.shp, Tehsil_Boundary.shp, Pakistan_Boundary.shp, etc.)

2. Run:

   ```bash
   cd frontend
   npm run build:boundaries
   ```

3. Commit only the updated `src/data/pk_*.json` files — not the shapefiles.
