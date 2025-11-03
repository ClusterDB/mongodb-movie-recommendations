[
  {
    $match: {
      year: {
        $gte: 2010
      },
      languages: "English",
      runtime: {
        $gte: 60
      }
    }
  },
  {
    $sample: {
      size: 500
    }
  },
  {
    $merge: {
      into: {
        db: "movie_recommendations",
        coll: "movies"
      },
      on: "_id",
      whenMatched: "keepExisting",
      whenNotMatched: "insert"
    }
  }
]