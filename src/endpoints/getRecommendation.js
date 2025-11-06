const { getVoyageClient } = require('../helpers/voyageai');
const { getDB } = require('../helpers/db');
const config = require('../config');

async function getRecommendation(req, res) {
  const secret = req.query.secret;
  const customerId = req.query.customerId;
  if (!secret || config.secret !== secret) {
    console.error(`Forbidden: incorrect or missing secret: received '${secret}'`);
    return res.status(403).json({ message: 'Forbidden. Must include correct secret.' });
  } else {
    if (customerId) {
      try {
        const db = await getDB();
        const customerCollection = db.collection(config.customerCollection);

        // Single aggregation on customers to return both viewed movieIds and favourite movie info
        const favouritesPipeline = [
          { $match: { _id: customerId } },
          { $project: { viewedMovies: 1 } },
          {
            $facet: {
              viewedIds: [
                { $unwind: '$viewedMovies' },
                { $replaceRoot: { newRoot: '$viewedMovies' } },
                { $project: { movieId: 1 } },
                { $group: { _id: null, ids: { $addToSet: '$movieId' } } },
                { $project: { _id: 0, ids: 1 } }
              ],
              favourite: [
                { $unwind: '$viewedMovies' },
                {
                  $addFields: {
                    score: {
                      $add: [
                        '$viewedMovies.rating',
                        { $cond: ['$viewedMovies.completed', 0.5, 0] }
                      ]
                    }
                  }
                },
                { $sort: { score: -1, 'viewedMovies._id': 1 } },
                { $limit: 1 },
                { $replaceRoot: { newRoot: '$viewedMovies' } },
                {
                  $lookup: {
                    from: config.moviesCollection,
                    localField: 'movieId',
                    foreignField: '_id',
                    as: 'movie'
                  }
                },
                { $set: { movie: { $first: '$movie' } } },
                { $replaceRoot: { newRoot: '$movie' } },
                { $project: { 
                  _id: 1,
                  title: 1, 
                  fullplot: 1,
                  fullplot_embedding: 1 } }
              ]
            }
          },
          {
            $project: {
              viewedMovieIds: { $ifNull: [ { $arrayElemAt: ['$viewedIds.ids', 0] }, [] ] },
              favouriteMovie: { $arrayElemAt: ['$favourite', 0] }
            }
          }
        ];

        const [aggResult] = await customerCollection.aggregate(favouritesPipeline).toArray();

        if (!aggResult) {
          console.error(`Customer with ID ${customerId} not found or has no view history.`);
          return res.status(404).json({ message: 'Customer not found or no viewed movies' });
        }

        const { viewedMovieIds = [], favouriteMovie = null } = aggResult;
        console.log('Viewed movie IDs:', viewedMovieIds);
        console.log('Favourite movie aggregation result:', favouriteMovie);

        const moviesCollection = db.collection(config.moviesCollection);
        
        const vectorSearchPipeline = [
          {
            $vectorSearch: {
              filter: { 
                _id: { $nin: viewedMovieIds },
                type: 'movie'
              },
              index: config.moviesVectorIndex,
              limit: 5,
              numCandidates: 100,
              path: 'fullplot_embedding',
              queryVector: favouriteMovie.fullplot_embedding
            }
          },
          {
            $project: {
              score: { $meta: 'vectorSearchScore' },
              title: 1,
              fullplot: 1,
            }
          },
          {
            $match: { score: { $gt: 0.8 }}
          }
        ]

        const searchResults = await moviesCollection.aggregate(vectorSearchPipeline).toArray();
        if (searchResults.length === 0) {
          console.log('No suitable recommendation found based on favourite movie.');
          return res.status(404).json({ message: 'No recommendation found' });
        }

        console.log('Search results:', searchResults);

        const voyageClient = getVoyageClient();

        const rerankResponse = await voyageClient.rerank({
          model: 'rerank-2',
          query: favouriteMovie.fullplot,
          documents: searchResults.map(doc => doc.fullplot)
        });

        // rerankResponse ===
        // {
        //   object: 'list',
        //   data: [
        //     { relevanceScore: 0.5546875, index: 1 },
        //     { relevanceScore: 0.5078125, index: 3 },
        //     { relevanceScore: 0.453125, index: 0 },
        //     { relevanceScore: 0.453125, index: 2 },
        //     { relevanceScore: 0.3828125, index: 4 }
        //   ],
        //   model: 'rerank-2',
        //   usage: { totalTokens: 942 }
        // }

        console.log('Rerank results:', rerankResponse);
        const topRecommendation = searchResults[rerankResponse.data[0].index];
        console.log('Top recommendation after reranking:', topRecommendation);

        res.status(200).json({ 
          favourite: { ...favouriteMovie, fullplot_embedding: undefined },
          recommendation: topRecommendation 
        });

      } catch (error) {
        console.error('Error fetching recommendation:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
      }
    } else {
      res.status(400).json({ Error: 'No customerId provided' });
    }
  }
};

module.exports = getRecommendation;