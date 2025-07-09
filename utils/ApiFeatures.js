class ApiFeatures {
    
  constructor(query, queryStr) {
    this.query = query; // Mongoose Query object
    this.queryStr = queryStr; // ?...... from url
  }

  filter() {
    const queryObj = { ...this.queryStr };
    // Create a shallow copy of the query string object to safely modify it.

    const excludedFields = ["sort", "fields", "page", "limit", "search"];
    // these fields are used for pagination, sorting, etc.
    //  So we exclude them from queryObj to avoid passing them into the .find() method.
    // they will handle separetely

    excludedFields.forEach((field) => delete queryObj[field]);
    // in url we write ?ratings[gte]=8&releaseYear[lt]=2020

    let queryString = JSON.stringify(queryObj);

    queryString = queryString.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    // adds $ prefix (MongoDB syntax).

    const mongoQuery = JSON.parse(queryString);
    // Parse back to object and use it with Mongoose's .find() method.
    
    this.query = this.query.find(mongoQuery);

    return this; // return current object so we can chain another method
  }

  sort() {
    if (this.queryStr.sort) {
      // in url for sorting => /api/movies?sort=ratings,releaseYear
      const sortBy = this.queryStr.sort.split(",").join(" ");
      // "ratings,releaseYear".split(",")  => ["ratings", "releaseYear"]
      // ["ratings", "releaseYear"].join(" ") => "ratings releaseYear"  => mongodb compatible
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt"); // default sort if needed
    }
    return this;
  }

  limitFields() {
    if (this.queryStr.fields) {
      // /api/v1/movies?fields=title,ratings,releaseYear
      // only mentioned fields will be sent in url [ .select() ]
      const fields = this.queryStr.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v"); // exclude __v by default
    }
    return this;
  }

  pagination() {
    const page = parseInt(this.queryStr.page, 10) || 1;
    const limit = parseInt(this.queryStr.limit, 10) || 10;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;

    /*  this.queryStr.page   // => "2" (a string)
        parseInt("2", 10) // => 2  converted to number format because Mongoose expects a number in .skip() and .limit() like
        parseInt("010", 10) // explicitly base 10 => 10  Because parseInt() can behave unexpectedly if you don’t specify the base:
   */
  }

  search() {
    // ?search=dark knight
    if (this.queryStr.search) {
      this.query = this.query.find({
        $text: { $search: this.queryStr.search }
      });
    }
    return this;
  }

}
export { ApiFeatures };
