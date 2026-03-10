if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const mongoose = require("mongoose");
const data = require("./data");
const Listing = require("../models/listing");
const User = require("../models/user");

const dbUrl = process.env.ATLASDB_URL || process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/airbnb";

main()
  .then(() => {
    console.log("Connected to DB");
    return initDB();
  })
  .then(() => {
    console.log("✅ Sample listings seeded successfully! Visit http://localhost:8080/listings");
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });

async function main() {
  await mongoose.connect(dbUrl);
}

async function initDB() {
  await Listing.deleteMany({});

  let owner = await User.findOne();
  if (!owner) {
    const demoUser = new User({ email: "demo@airbnb.com", username: "demo" });
    owner = await User.register(demoUser, "demo123");
    console.log("Created demo user: demo / demo123");
  }

  const listingsWithOwner = data.data.map((obj) => ({
    ...obj,
    owner: owner._id,
  }));

  await Listing.insertMany(listingsWithOwner);
  console.log(`Inserted ${listingsWithOwner.length} listings`);
}