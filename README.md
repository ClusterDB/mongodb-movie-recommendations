# MongoDB Movie Recommendation Engine
The purpose of the code in this repo is to demonstrate how to build a recommendation
using Voyage AI and MongoDB Atlas.

## Endpoints
The application provides these 3 endpoints (no front-end code is included, but there's a Postman collection that can be used for testing):
- `GET movie`. Provide query parameters for `id` (`_id` of the document in the `movies` collection) and for `secret` (must match the value set in the backend). Returns the movie details.
- `POST viewing`. Provide query parameter for `secret` (must match the value set in the backend). Body contains details of the viewing being added:

```json
{
  "customerId": "customer1",
  "movieId": "573a13c6f29313caabd73051",
  "viewedAt": "2025-11-04T13:45:26.768Z",
  "completed": true, // Did the customer watch the movie to the end?
  "rating": -1 // -1 == dislike, 0 == neutral, 1 == like
}
```

- `GET recommendation`. Provide query parameters for `customerId` (matches `_id` in the `customers` collection) and `secret` (must match the value set in the backend). Returns the details a movie that's similar to one the customer watched recently and enjoyed.

## Prerequistes
- A MongoDB Atlas cluster [you can spin up a free MongoDB Atlas cluster following these instructions](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/)
- A [(free) Voyage API key](https://www.voyageai.com/)

## Preparing your database
The application works from the data in the [`movies` collection of the `sample_mflix` database that you automatically create in MongoDB Atlas](https://www.mongodb.com/docs/atlas/sample-data/sample-mflix/).

The `movies` collection contains the embedding data for the `plot` field for each collection, this application works instead with the `fullplot` data.

The application automates the maintenance and creation on a new field in the `movies` collection named `fullplot_embedding` using an [Atlas Trigger](https://www.mongodb.com/docs/atlas/atlas-ui/triggers/). Whenever a document is inserted/replaced, or the `fullplot` fields is updated, the trigger calls the Voyage AI API to generate a new vector/embedding from the new string, and stores in in the `fullplot_embedding` field.