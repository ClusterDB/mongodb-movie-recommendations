db.movies.aggregate([
  {
    '$merge': {
      'into': 'movies', 
      'on': '_id', 
      'whenMatched': 'replace', 
      'whenNotMatched': 'insert'
    }
  }
])  