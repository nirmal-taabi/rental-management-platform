# Locations

These public lookup endpoints provide the state and city options used during shop registration. Responses use the standard API envelope, with the lookup rows in `data`.

## List states

`GET /api/v1/locations/states`

Returns states and union territories ordered by name.

```json
{
  "success": true,
  "message": "States retrieved successfully.",
  "data": [{ "id": 1, "name": "Andhra Pradesh" }]
}
```

## List cities for a state

`GET /api/v1/locations/states/:stateId/cities`

Returns the cities associated with the selected state, ordered by name. `stateId` is the `id` returned by the states endpoint. A non-positive or non-numeric ID returns a validation error; an unknown positive ID returns an empty list.