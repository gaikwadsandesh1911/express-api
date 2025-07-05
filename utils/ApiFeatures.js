class ApiFeatures {
    
  constructor(query, queryStr) {
    this.query = query; // Mongoose Query object
    this.queryStr = queryStr; // ?...... from url
  }

  filter() {
    const queryObj = { ...this.queryStr };

    const excludedFields = ["sort", "fields", "page", "limit"];

    excludedFields.forEach((field) => delete queryObj[field]);

    let queryString = JSON.stringify(queryObj);

    queryString = queryString.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    const mongoQuery = JSON.parse(queryString);

    this.query = this.query.find(mongoQuery);

    return this; // return current object so we can chain another method
  }

  sort() {
    if (this.queryStr.sort) {
      const sortBy = this.queryStr.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt"); // default sort if needed
    }
    return this;
  }

  limitFields() {
    if (this.queryStr.fields) {
      const fields = this.queryStr.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v"); // exclude __v by default
    }
    return this;
  }

  pagination() {
    const page = parseInt(this.queryStr.page, 10) || 1;
    const limit = parseInt(this.queryStr.limit, 10) || 2;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;

    /*  this.queryStr.page   // => "2" (a string)
        parseInt("2", 10) // => 2  converted to number format because Mongoose expects a number in .skip() and .limit() like
        parseInt("010", 10) // explicitly base 10 => 10  Because parseInt() can behave unexpectedly if you don’t specify the base:
   */
  }
}
export { ApiFeatures };
